<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateOrganizationRequest;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrganizationSettingsController extends Controller
{
    /**
     * Infos de l'organisation de l'utilisateur connecté.
     */
    public function show(Request $request): JsonResponse
    {
        $org = Organization::findOrFail($request->user()->organization_id);

        return response()->json($this->payload($org));
    }

    /**
     * Mise à jour des infos de base (nom, couleur de thème, logo).
     */
    public function update(UpdateOrganizationRequest $request): JsonResponse
    {
        $org = Organization::findOrFail($request->user()->organization_id);

        $org->name = $request->name;

        if ($request->filled('theme_color')) {
            $org->theme_color = $request->theme_color;
        }

        if ($request->hasFile('logo')) {
            if ($org->logo_path) {
                Storage::disk('public')->delete($org->logo_path);
            }
            $org->logo_path = $request->file('logo')->store('logos', 'public');
        }

        $org->save();

        return response()->json([
            'message'      => 'Organisation mise à jour.',
            'organization' => $this->payload($org),
        ]);
    }

    private function payload(Organization $org): array
    {
        return [
            'id'          => $org->id,
            'name'        => $org->name,
            'slug'        => $org->slug,
            'plan'        => $org->plan,
            'theme_color' => $org->theme_color,
            'logo_url'    => $org->logo_path ? Storage::disk('public')->url($org->logo_path) : null,
        ];
    }
}
