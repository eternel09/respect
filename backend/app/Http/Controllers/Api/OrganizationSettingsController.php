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
            'card_design_url' => $org->cardDesignUrl(),
        ];
    }

    /**
     * Téléverse le visuel de carte de service (image) : il coiffe la carte, le
     * QR et le nom étant apposés dessus. Sans visuel, la carte garde le design
     * standard. PDF refusé (le QR est incrusté par-dessus l'image).
     */
    public function uploadCardDesign(Request $request): JsonResponse
    {
        $org = Organization::findOrFail($request->user()->organization_id);

        $request->validate([
            'design' => ['required', 'file', 'image', 'max:30720'],
        ], [
            'design.required' => 'Sélectionnez une image de carte.',
            'design.image'    => 'Utilisez une image (le PDF n’est pas pris en charge).',
            'design.max'      => 'Fichier trop lourd (30 Mo maximum).',
        ]);

        if ($org->card_design_path) {
            Storage::disk('public')->delete($org->card_design_path);
        }
        $org->card_design_path = $request->file('design')->store('card-designs', 'public');
        $org->save();

        return response()->json([
            'message'         => 'Visuel de carte enregistré.',
            'card_design_url' => $org->cardDesignUrl(),
        ]);
    }

    /** Retire le visuel de carte (retour au design standard). */
    public function removeCardDesign(Request $request): JsonResponse
    {
        $org = Organization::findOrFail($request->user()->organization_id);

        if ($org->card_design_path) {
            Storage::disk('public')->delete($org->card_design_path);
            $org->card_design_path = null;
            $org->save();
        }

        return response()->json(['message' => 'Visuel de carte retiré.']);
    }
}
