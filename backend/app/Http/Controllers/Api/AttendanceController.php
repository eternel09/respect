<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AttendanceRequest;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
use App\Models\Member;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AttendanceController extends Controller
{
    public function store(AttendanceRequest $request): JsonResponse
    {
        $member = Member::where('phone', $request->phone)->first();

        if (! $member) {
            return response()->json([
                'message' => "Numéro non reconnu. Veuillez d'abord vous inscrire via le QR d'onboarding.",
            ], 404);
        }

        $today = now()->toDateString();

        $exists = Attendance::where('member_id', $member->id)
            ->where('event_id', $request->event_id)
            ->whereDate('attended_date', $today)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Vous avez déjà pointé pour cet événement aujourd\'hui.',
                'already_checked_in' => true,
            ], 409);
        }

        try {
            $attendance = Attendance::create([
                'member_id'     => $member->id,
                'event_id'      => $request->event_id,
                'attended_date' => $today,
            ]);
        } catch (QueryException) {
            return response()->json([
                'message'            => "Vous avez déjà pointé pour cet événement aujourd'hui.",
                'already_checked_in' => true,
            ], 409);
        }

        return response()->json([
            'message'    => 'Présence enregistrée. Bienvenue, ' . $member->first_name . ' !',
            'attendance' => [
                'id'            => $attendance->id,
                'attended_date' => $attendance->attended_date,
                'member'        => ['first_name' => $member->first_name, 'last_name' => $member->last_name],
            ],
        ], 201);
    }

    public function today(Request $request): AnonymousResourceCollection
    {
        $attendances = Attendance::with(['member', 'event'])
            ->where('attended_date', now()->toDateString())
            ->when($request->event_id, fn($q) => $q->where('event_id', $request->event_id))
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return AttendanceResource::collection($attendances);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $attendances = Attendance::with(['member', 'event'])
            ->when($request->date, fn($q) => $q->whereDate('attended_date', $request->date))
            ->when($request->event_id, fn($q) => $q->where('event_id', $request->event_id))
            ->when($request->from && $request->to, fn($q) => $q->whereBetween('attended_date', [$request->from, $request->to]))
            ->orderBy('attended_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return AttendanceResource::collection($attendances);
    }
}
