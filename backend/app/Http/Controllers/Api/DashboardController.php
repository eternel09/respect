<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
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

        return response()->json([
            'stats' => [
                'total_members'          => (int) $counts->total_members,
                'total_events'           => (int) $counts->total_events,
                'today_attendance_count' => (int) $counts->today_count,
                'total_attendances'      => (int) $counts->total_attendances,
            ],
            'today_attendances' => AttendanceResource::collection($todayAttendances),
        ]);
    }
}
