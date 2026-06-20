<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ScanRequest;
use App\Models\Attendance;
use App\Models\Event;
use App\Models\Member;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;

class ScanController extends Controller
{
    /**
     * Enregistre la présence d'un membre à partir du scan de son QR personnel.
     *
     * Réponses (toujours avec un champ `status` pour piloter le retour visuel de l'app) :
     *  - 201 recorded      : présence enregistrée
     *  - 200 already       : déjà pointé pour cet événement aujourd'hui
     *  - 404 unknown       : badge non reconnu dans cette organisation
     *  - 422 invalid_event : événement introuvable dans cette organisation
     */
    public function store(ScanRequest $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $member = Member::where('check_in_token', $request->token)
            ->where('organization_id', $orgId)
            ->first();

        if (! $member) {
            return response()->json([
                'status'  => 'unknown',
                'message' => 'Badge non reconnu.',
            ], 404);
        }

        $event = Event::where('id', $request->event_id)
            ->where('organization_id', $orgId)
            ->first();

        if (! $event) {
            return response()->json([
                'status'  => 'invalid_event',
                'message' => "Événement introuvable.",
            ], 422);
        }

        $payload = [
            'member' => ['id' => $member->id, 'full_name' => $member->full_name, 'phone' => $member->phone],
            'event'  => ['id' => $event->id, 'name' => $event->name],
        ];

        $today = now()->toDateString();

        $already = Attendance::where('member_id', $member->id)
            ->where('event_id', $event->id)
            ->whereDate('attended_date', $today)
            ->exists();

        if ($already) {
            return response()->json([
                'status'  => 'already',
                'message' => $member->first_name . ' a déjà été pointé(e) aujourd\'hui.',
                ...$payload,
            ], 200);
        }

        try {
            $attendance = Attendance::create([
                'organization_id' => $orgId,
                'member_id'       => $member->id,
                'event_id'        => $event->id,
                'attended_date'   => $today,
                'scanned_by'      => $request->user()->id,
            ]);
        } catch (QueryException) {
            // Course critique : un autre scan a enregistré la présence entre-temps.
            return response()->json([
                'status'  => 'already',
                'message' => $member->first_name . ' a déjà été pointé(e) aujourd\'hui.',
                ...$payload,
            ], 200);
        }

        return response()->json([
            'status'     => 'recorded',
            'message'    => 'Présence enregistrée pour ' . $member->first_name . '.',
            'scanned_at' => $attendance->created_at->toDateTimeString(),
            ...$payload,
        ], 201);
    }
}
