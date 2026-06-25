<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\User;
use App\Services\BadgeService;
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

    private function userFromToken(Request $request): ?User
    {
        $token = $request->query('token');
        if (! $token) {
            return null;
        }

        return PersonalAccessToken::findToken($token)?->tokenable;
    }
}
