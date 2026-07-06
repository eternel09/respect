<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $today = now()->toDateString();
        $orgId = $request->user()->organization_id;

        // Les 4 compteurs en une seule requête (1 aller-retour DB au lieu de 4),
        // scopés à l'organisation de l'utilisateur.
        $counts = DB::selectOne(
            'select
                (select count(*) from members     where organization_id = ?) as total_members,
                (select count(*) from events      where organization_id = ?) as total_events,
                (select count(*) from attendances where organization_id = ?) as total_attendances,
                (select count(*) from attendances where organization_id = ? and attended_date = ?) as today_count',
            [$orgId, $orgId, $orgId, $orgId, $today]
        );

        // Liste du jour limitée (le front n'affiche que les 5 premières).
        $todayAttendances = Attendance::with(['member', 'event'])
            ->whereDate('attended_date', $today)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // ── Statistiques réelles (groupées en PHP : portable SQLite/Postgres) ──

        // Présences par mois, 6 derniers mois (graphe)
        $sixMonthsAgo = now()->startOfMonth()->subMonths(5);
        $dates = Attendance::where('attended_date', '>=', $sixMonthsAgo)->pluck('attended_date');
        $monthly = collect(range(5, 0))->map(function ($i) use ($dates) {
            $month = now()->startOfMonth()->subMonths($i);
            return [
                'month' => ucfirst($month->locale('fr')->isoFormat('MMM')),
                'value' => $dates->filter(fn ($d) => $d->isSameMonth($month))->count(),
            ];
        })->values();

        // Présences par jour, 7 derniers jours (mini-graphe)
        $weekAgo = now()->subDays(6)->startOfDay();
        $weekDates = Attendance::where('attended_date', '>=', $weekAgo)->pluck('attended_date');
        $last7 = collect(range(6, 0))
            ->map(fn ($i) => $weekDates->filter(fn ($d) => $d->isSameDay(now()->subDays($i)))->count())
            ->values();

        // Taux de participation (30 j) : présences ÷ (événements × membres)
        $events30 = DB::selectOne(
            'select count(*) as c from events where organization_id = ? and date between ? and ?',
            [$orgId, now()->subDays(30)->toDateString(), $today]
        )->c;
        $att30 = Attendance::where('attended_date', '>=', now()->subDays(30))->count();
        $participation = ($events30 > 0 && $counts->total_members > 0)
            ? round($att30 / ($events30 * $counts->total_members) * 100, 1)
            : null;

        // Nouveaux membres ce mois-ci + derniers inscrits
        $membersThisMonth = Member::where('created_at', '>=', now()->startOfMonth())->count();
        $recentMembers = Member::latest()->limit(5)->get()->map(fn (Member $m) => [
            'id'         => $m->id,
            'full_name'  => $m->full_name,
            'phone'      => $m->phone,
            'created_at' => $m->created_at->toDateString(),
        ]);

        return response()->json([
            'stats' => [
                'total_members'          => (int) $counts->total_members,
                'total_events'           => (int) $counts->total_events,
                'today_attendance_count' => (int) $counts->today_count,
                'total_attendances'      => (int) $counts->total_attendances,
                'members_this_month'     => $membersThisMonth,
                'participation_rate'     => $participation, // null si aucun événement sur 30 j
            ],
            'monthly'           => $monthly,
            'last7'             => $last7,
            'recent_members'    => $recentMembers,
            'today_attendances' => AttendanceResource::collection($todayAttendances),
        ]);
    }
}
