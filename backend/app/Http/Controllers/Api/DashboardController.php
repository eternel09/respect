<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
use App\Models\Event;
use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Flux de notifications : derniers pointages et nouveaux membres de
     * l'organisation, fusionnés et triés du plus récent au plus ancien.
     */
    public function notifications(): JsonResponse
    {
        $checkins = Attendance::with(['member', 'event'])
            ->latest()->limit(10)->get()
            ->map(fn (Attendance $a) => [
                'id'     => 'a' . $a->id,
                'type'   => 'checkin',
                'title'  => $a->member?->full_name ?? 'Membre',
                'detail' => 'Présence — ' . ($a->event?->name ?? 'Événement'),
                'at'     => $a->created_at->toIso8601String(),
            ]);

        $members = Member::latest()->limit(10)->get()
            ->map(fn (Member $m) => [
                'id'     => 'm' . $m->id,
                'type'   => 'member',
                'title'  => $m->full_name,
                'detail' => 'Nouveau membre enregistré',
                'at'     => $m->created_at->toIso8601String(),
            ]);

        $items = $checkins->concat($members)->sortByDesc('at')->take(15)->values();

        return response()->json(['data' => $items]);
    }

    public function index(Request $request): JsonResponse
    {
        $today = now()->toDateString();

        // Compteurs via les modèles : ils portent le scope multi-tenant, donc
        // ils couvrent aussi les sous-organisations quand l'utilisateur relève
        // d'une organisation mère. (L'ancienne version faisait du SQL brut sur
        // un seul organization_id : une église mère n'aurait vu que ses propres
        // chiffres — souvent zéro — sans la moindre erreur visible.)
        $totalMembers     = Member::count();
        $totalEvents      = Event::count();
        $totalAttendances = Attendance::count();
        $todayCount       = Attendance::whereDate('attended_date', $today)->count();

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
        $events30 = Event::whereBetween('date', [now()->subDays(30)->toDateString(), $today])->count();
        $att30 = Attendance::where('attended_date', '>=', now()->subDays(30))->count();
        $participation = ($events30 > 0 && $totalMembers > 0)
            ? round($att30 / ($events30 * $totalMembers) * 100, 1)
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
                'total_members'          => $totalMembers,
                'total_events'           => $totalEvents,
                'today_attendance_count' => $todayCount,
                'total_attendances'      => $totalAttendances,
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
