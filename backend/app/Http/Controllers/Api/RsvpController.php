<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Confirmation de présence (RSVP) — page publique ouverte par l'invité via le
 * lien reçu dans l'invitation (`/confirmer/{token}`). Aucun compte requis :
 * le jeton UUID de l'invité fait foi. Montre la vidéo du couple et enregistre
 * la réponse (présent / décliné).
 */
class RsvpController extends Controller
{
    /** Détail public pour la page de confirmation. */
    public function show(string $token): JsonResponse
    {
        $guest = $this->find($token);
        $occasion = $guest->occasion;

        return response()->json([
            'guest' => [
                'name'      => $guest->name,
                'status'    => $this->status($guest),
                'table'     => $guest->table?->label,
            ],
            'occasion' => [
                'name'          => $occasion->name,
                'type'          => $occasion->type,
                'date'          => $occasion->date->toDateString(),
                'starts_at'     => $occasion->starts_at?->toIso8601String(),
                'location'      => $occasion->location,
                'is_expired'    => $occasion->isExpired(),
                'video_url'     => $occasion->rsvpVideoUrl(),
                'organization'  => $occasion->organization->name,
            ],
        ]);
    }

    /** Enregistre la réponse de l'invité. */
    public function store(string $token, Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:confirm,decline'],
        ]);

        $guest = $this->find($token);

        if ($data['status'] === 'confirm') {
            $guest->forceFill(['confirmed_at' => now(), 'declined' => false])->save();
        } else {
            $guest->forceFill(['declined' => true, 'confirmed_at' => null])->save();
        }

        return response()->json([
            'status'  => $this->status($guest),
            'table'   => $guest->table?->label,
            'message' => $data['status'] === 'confirm'
                ? 'Merci, votre présence est confirmée !'
                : 'Merci pour votre réponse.',
        ]);
    }

    /** Invité par jeton (contexte public : pas de scope multi-tenant). */
    private function find(string $token): Guest
    {
        return Guest::where('token', $token)->with('occasion.organization', 'table')->firstOrFail();
    }

    private function status(Guest $guest): string
    {
        if ($guest->confirmed_at) {
            return 'confirmed';
        }
        return $guest->declined ? 'declined' : 'pending';
    }
}
