<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Badge;
use App\Models\Member;
use App\Models\User;
use App\Services\BadgeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class BadgeController extends Controller
{
    /**
     * Badge d'un membre (téléchargement natif). Authentifié par le token passé
     * en query (?token=) : permet une navigation directe du navigateur sans
     * en-tête d'auth, blob ou URL signée — robuste derrière le proxy de dev.
     */
    public function single(Member $member, Request $request, BadgeService $badges): Response
    {
        $user = $this->userFromToken($request);
        abort_if(! $user || $member->organization_id !== $user->organization_id, 403, 'Accès non autorisé.');

        $slug = Str::slug($member->full_name) ?: ('membre-' . $member->id);

        return $badges->forMember($member)->download("badge-{$slug}.pdf");
    }

    /**
     * Planche de tous les badges de l'organisation du staff.
     */
    public function batch(Request $request, BadgeService $badges): Response
    {
        $user = $this->userFromToken($request);
        abort_if(! $user || ! $user->organization_id, 403, 'Accès non autorisé.');

        return $badges->forOrganization($user->organization_id)->download('badges.pdf');
    }

    /**
     * Génère un lot de badges VIERGES (QR non liés à un membre) pour
     * impression. Le membre sera créé et lié au premier scan sur le terrain.
     */
    public function createBlankBatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'count' => ['required', 'integer', 'min:1', 'max:200'],
        ], [
            'count.max' => '200 badges maximum par lot.',
        ]);

        $batch = now()->format('Ymd-His') . '-' . Str::lower(Str::random(4));
        $orgId = $request->user()->organization_id;

        for ($i = 0; $i < $data['count']; $i++) {
            Badge::create(['organization_id' => $orgId, 'batch' => $batch]);
        }

        return response()->json([
            'message'       => "{$data['count']} badge(s) vierge(s) générés (lot {$batch}).",
            'batch'         => $batch,
            'count'         => $data['count'],
            'download_path' => "/download/badges-blank?batch={$batch}",
        ], 201);
    }

    /**
     * PDF d'un lot de badges vierges (téléchargement natif, token en query).
     */
    public function blankBatch(Request $request, BadgeService $badges): Response
    {
        $user = $this->userFromToken($request);
        abort_if(! $user || ! $user->organization_id, 403, 'Accès non autorisé.');

        $batch = (string) $request->query('batch');
        abort_unless(
            Badge::withoutGlobalScopes()
                ->where('organization_id', $user->organization_id)
                ->where('batch', $batch)
                ->exists(),
            404, 'Lot introuvable.',
        );

        return $badges->forBlankBatch($user->organization_id, $batch)
            ->download("badges-vierges-{$batch}.pdf");
    }

    private function userFromToken(Request $request): ?User
    {
        $token = $request->query('token');
        if (! $token) {
            return null;
        }

        return PersonalAccessToken::findToken($token)?->tokenable;
    }
}
