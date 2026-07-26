<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ScanOnboardRequest;
use App\Http\Requests\ScanRequest;
use App\Http\Requests\ScanSyncRequest;
use App\Models\Attendance;
use App\Models\Badge;
use App\Models\Event;
use App\Models\Member;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ScanController extends Controller
{
    /**
     * Événements de l'organisation du staff (pour l'app scanner).
     * Le scope global BelongsToOrganization filtre déjà par organisation.
     */
    public function events(): JsonResponse
    {
        $events = Event::orderBy('date', 'desc')->get(['id', 'name', 'type', 'date']);

        return response()->json(['data' => $events]);
    }

    /**
     * Scan en ligne d'un QR personnel → enregistre la présence.
     */
    public function store(ScanRequest $request): JsonResponse
    {
        $result = $this->record(
            $request->user()->organization_id,
            $request->token,
            $request->event_id,
            $request->user()->id,
            now(),
        );

        $http = $result['http'];
        unset($result['http']);

        return response()->json($result, $http);
    }

    /**
     * Manifeste hors-ligne : liste des jetons des membres de l'organisation,
     * téléchargée par l'app avant de perdre le réseau pour vérifier les scans
     * localement et afficher les noms.
     */
    public function manifest(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $event = null;
        if ($request->event_id) {
            $event = Event::where('id', $request->event_id)
                ->where('organization_id', $orgId)
                ->first();

            if (! $event) {
                return response()->json(['status' => 'invalid_event', 'message' => 'Événement introuvable.'], 422);
            }
        }

        $members = Member::where('organization_id', $orgId)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'phone', 'check_in_token']);

        // Jetons des badges vierges : permet à l'app, hors-ligne, de distinguer
        // « badge vierge (onboarding requis) » de « badge inconnu ».
        $blankTokens = Badge::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->whereNull('member_id')
            ->pluck('token');

        return response()->json([
            'generated_at'    => now()->toIso8601String(),
            'organization_id' => $orgId,
            'event'           => $event ? ['id' => $event->id, 'name' => $event->name] : null,
            'count'           => $members->count(),
            'members'         => $members->map(fn (Member $m) => [
                'id'        => $m->id,
                'full_name' => $m->full_name,
                'phone'     => $m->phone,
                'token'     => $m->check_in_token,
            ]),
            'blank_tokens'    => $blankTokens,
        ]);
    }

    /**
     * Onboarding terrain : premier scan d'un badge vierge → crée le membre,
     * lie le jeton du badge, et enregistre sa présence dans la foulée.
     */
    public function onboard(ScanOnboardRequest $request): JsonResponse
    {
        $orgId  = $request->user()->organization_id;
        $userId = $request->user()->id;

        // Walk-in sans badge : création directe du membre (jeton auto-généré)
        // + pointage immédiat. Un badge pourra lui être imprimé plus tard.
        if (! $request->token) {
            $member = Member::create([
                'organization_id'        => $orgId,
                'first_name'             => $request->first_name,
                'last_name'              => $request->last_name,
                'phone'                  => $request->phone,
                // Événement d'enregistrement : alimente « nouveaux membres par événement »
                'registered_at_event_id' => $request->event_id,
            ]);

            $result = $this->record($orgId, $member->check_in_token, $request->event_id, $userId, now());
            $http = $result['http'];
            unset($result['http']);

            return response()->json([
                ...$result,
                'onboarded' => true,
                'message'   => $member->first_name . ' enregistré(e) et pointé(e). Bienvenue !',
            ], $http);
        }

        $badge = Badge::withoutGlobalScopes()
            ->where('token', $request->token)
            ->where('organization_id', $orgId)
            ->first();

        if (! $badge) {
            return response()->json(['status' => 'unknown', 'message' => 'Badge non reconnu.'], 404);
        }

        // Course : le badge vient d'être lié par un autre scanner → pointage simple.
        if ($badge->member_id) {
            $result = $this->record($orgId, $request->token, $request->event_id, $userId, now());
            $http = $result['http'];
            unset($result['http']);
            return response()->json($result, $http);
        }

        $member = DB::transaction(function () use ($request, $badge, $orgId) {
            $member = Member::create([
                'organization_id'        => $orgId,
                'first_name'             => $request->first_name,
                'last_name'              => $request->last_name,
                'phone'                  => $request->phone,
                'check_in_token'         => $badge->token, // le QR imprimé devient SON badge
                'registered_at_event_id' => $request->event_id,
            ]);
            $badge->update(['member_id' => $member->id]);

            return $member;
        });

        // Présence enregistrée immédiatement (c'est un scan d'entrée)
        $result = $this->record($orgId, $badge->token, $request->event_id, $userId, now());
        $http = $result['http'];
        unset($result['http']);

        return response()->json([
            ...$result,
            'onboarded' => true,
            'message'   => $member->first_name . ' enregistré(e) et pointé(e). Bienvenue !',
        ], $http);
    }

    /**
     * Sync hors-ligne : reçoit un lot de scans collectés sans réseau et les
     * enregistre, en conservant l'horodatage réel de chaque scan. Renvoie un
     * résultat par scan pour permettre à l'app de réconcilier sa file.
     */
    public function sync(ScanSyncRequest $request): JsonResponse
    {
        $orgId  = $request->user()->organization_id;
        $userId = $request->user()->id;

        $results = [];
        $summary = ['recorded' => 0, 'already' => 0, 'unknown' => 0, 'invalid_event' => 0];

        foreach ($request->scans as $i => $scan) {
            $r = $this->record($orgId, $scan['token'], $scan['event_id'], $userId, Carbon::parse($scan['scanned_at']));

            $summary[$r['status']] = ($summary[$r['status']] ?? 0) + 1;
            $results[] = [
                'index'  => $i,
                'token'  => $scan['token'],
                'status' => $r['status'],
            ];
        }

        return response()->json([
            'summary' => $summary,
            'results' => $results,
        ]);
    }

    /**
     * Cœur partagé : résout le membre + l'événement (scopés à l'organisation)
     * et enregistre la présence. Retourne un tableau avec `status` et `http`.
     */
    private function record(int $orgId, string $token, int|string $eventId, int $userId, Carbon $scannedAt): array
    {
        $member = Member::where('check_in_token', $token)
            ->where('organization_id', $orgId)
            ->first();

        if (! $member) {
            // Badge vierge (pré-imprimé, jamais lié) → l'app ouvre l'onboarding.
            $isBlank = Badge::withoutGlobalScopes()
                ->where('token', $token)
                ->where('organization_id', $orgId)
                ->whereNull('member_id')
                ->exists();

            if ($isBlank) {
                return [
                    'status'  => 'unassigned',
                    'http'    => 200,
                    'message' => 'Badge vierge — enregistrez le membre pour le lier.',
                ];
            }

            return ['status' => 'unknown', 'http' => 404, 'message' => 'Badge non reconnu.'];
        }

        $event = Event::where('id', $eventId)
            ->where('organization_id', $orgId)
            ->first();

        if (! $event) {
            return ['status' => 'invalid_event', 'http' => 422, 'message' => "Événement introuvable."];
        }

        $payload = [
            'member' => ['id' => $member->id, 'full_name' => $member->full_name, 'phone' => $member->phone],
            'event'  => ['id' => $event->id, 'name' => $event->name],
        ];

        $date = $scannedAt->toDateString();

        $already = Attendance::where('member_id', $member->id)
            ->where('event_id', $event->id)
            ->whereDate('attended_date', $date)
            ->exists();

        if ($already) {
            return [
                'status'  => 'already',
                'http'    => 200,
                'message' => $member->first_name . ' a déjà été pointé(e).',
            ] + $payload;
        }

        try {
            $attendance = new Attendance([
                'organization_id' => $orgId,
                'member_id'       => $member->id,
                'event_id'        => $event->id,
                'attended_date'   => $date,
                'scanned_by'      => $userId,
            ]);
            $attendance->created_at = $scannedAt; // conserve l'heure réelle du scan (offline)
            $attendance->save();
        } catch (QueryException) {
            return [
                'status'  => 'already',
                'http'    => 200,
                'message' => $member->first_name . ' a déjà été pointé(e).',
            ] + $payload;
        }

        return [
            'status'     => 'recorded',
            'http'       => 201,
            'message'    => 'Présence enregistrée pour ' . $member->first_name . '.',
            'scanned_at' => $attendance->created_at->toDateTimeString(),
        ] + $payload;
    }
}
