<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
use App\Models\Event;
use App\Models\Member;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $today = now()->toDateString();

        $todayAttendances = Attendance::with(['member', 'event'])
            ->whereDate('attended_date', $today)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'stats' => [
                'total_members'          => Member::count(),
                'total_events'           => Event::count(),
                'today_attendance_count' => $todayAttendances->count(),
                'total_attendances'      => Attendance::count(),
            ],
            'today_attendances' => AttendanceResource::collection($todayAttendances),
        ]);
    }
}
