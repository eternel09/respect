<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Services\BadgeService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class BadgeController extends Controller
{
    /**
     * Badge PDF d'un membre (téléchargement).
     */
    public function single(Member $member, Request $request, BadgeService $badges): Response
    {
        abort_if($member->organization_id !== $request->user()->organization_id, 404);

        $slug = Str::slug($member->full_name) ?: ('membre-' . $member->id);

        return $badges->forMember($member)->download("badge-{$slug}.pdf");
    }

    /**
     * Planche de tous les badges de l'organisation (téléchargement).
     */
    public function batch(Request $request, BadgeService $badges): Response
    {
        return $badges->forOrganization($request->user()->organization_id)
            ->download('badges-famille-respect.pdf');
    }
}
