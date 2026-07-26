<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NetworkStatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Vue consolidée d'un réseau : une organisation mère lit les chiffres de ses
 * sous-organisations. Réservé aux organisations qui en ont réellement.
 */
class NetworkController extends Controller
{
    /** L'organisation de l'utilisateur chapeaute-t-elle un réseau ? */
    public function summary(Request $request): JsonResponse
    {
        $org = $request->user()->organization;

        abort_if($org === null, 404, 'Aucune organisation associée à ce compte.');
        abort_unless($org->isNetworkParent(), 403, "Cette organisation n'a pas de sous-organisations.");

        $stats = new NetworkStatsService($org);
        $unit  = $request->query('unit', 'month');

        return response()->json([
            'organization'  => ['id' => $org->id, 'name' => $org->name],
            'headline'      => $stats->headline(),
            'growth'        => $stats->growth($unit),
            'growth_unit'   => in_array($unit, ['week', 'month'], true) ? $unit : 'month',
            'by_org'        => $stats->byOrganization(),
            'by_event'      => $stats->byEvent(),
            'generated_at'  => now()->toIso8601String(),
        ]);
    }
}
