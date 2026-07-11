<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Gestion de la suite d'applications (modules) d'une organisation. */
class OrganizationModuleController extends Controller
{
    /** Catalogue complet + modules actuellement activés par l'organisation. */
    public function index(Request $request): JsonResponse
    {
        $org = $request->user()->organization;

        return response()->json([
            'catalog' => collect(config('modules.catalog'))
                ->map(fn ($m, $key) => [
                    'key'         => $key,
                    'label'       => $m['label'],
                    'description' => $m['description'],
                ])
                ->values(),
            'enabled' => $org?->enabledModules() ?? [],
        ]);
    }

    /** Remplace la liste des modules activés (activation / désactivation). */
    public function update(Request $request): JsonResponse
    {
        $keys = array_keys(config('modules.catalog'));

        $data = $request->validate([
            'modules'   => ['present', 'array'],
            'modules.*' => ['string', Rule::in($keys)],
        ]);

        $org = $request->user()->organization;
        abort_if($org === null, 422, "Aucune organisation associée à ce compte.");

        // Dédoublonne et respecte l'ordre du catalogue pour une nav stable.
        $modules = array_values(array_filter($keys, fn ($k) => in_array($k, $data['modules'], true)));

        $org->update(['modules' => $modules]);

        return response()->json(['modules' => $org->enabledModules()]);
    }
}
