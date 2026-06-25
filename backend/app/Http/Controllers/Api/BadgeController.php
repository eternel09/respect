<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Services\BadgeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class BadgeController extends Controller
{
    /**
     * URL signée temporaire pour télécharger le badge d'un membre.
     * Le téléchargement se fait ensuite en navigation native (sans en-tête
     * d'auth ni blob), ce qui évite les soucis de proxy/XHR.
     */
    public function singleLink(Member $member, Request $request): JsonResponse
    {
        abort_if($member->organization_id !== $request->user()->organization_id, 404);

        return response()->json([
            'url' => URL::temporarySignedRoute('badge.single', now()->addMinutes(10), ['member' => $member->id]),
        ]);
    }

    /**
     * URL signée temporaire pour la planche de tous les badges de l'organisation.
     */
    public function batchLink(Request $request): JsonResponse
    {
        return response()->json([
            'url' => URL::temporarySignedRoute('badge.batch', now()->addMinutes(10), ['org' => $request->user()->organization_id]),
        ]);
    }

    /**
     * Sert le badge d'un membre (route signée publique). La signature prouve
     * que l'accès a déjà été autorisé lors de la génération du lien.
     */
    public function single(Member $member, BadgeService $badges): Response
    {
        $slug = Str::slug($member->full_name) ?: ('membre-' . $member->id);

        return $badges->forMember($member)->download("badge-{$slug}.pdf");
    }

    /**
     * Sert la planche des badges d'une organisation (route signée publique).
     */
    public function batch(Request $request, BadgeService $badges): Response
    {
        return $badges->forOrganization((int) $request->query('org'))->download('badges.pdf');
    }
}
