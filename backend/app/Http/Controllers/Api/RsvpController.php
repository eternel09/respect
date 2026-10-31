<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guest;
use App\Services\InvitationComposer;
use App\Services\QrCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Page personnelle de l'invité — ouverte via le lien reçu dans l'invitation
 * (`/confirmer/{token}`). Aucun compte requis : le jeton UUID de l'invité fait
 * foi. Montre l'invitation en ligne (QR d'accès, carton à télécharger), la
 * vidéo du couple, et enregistre la réponse (présent / décliné).
 */
class RsvpController extends Controller
{
    /** Détail public pour la page de confirmation. */
    public function show(string $token, QrCodeService $qr): JsonResponse
    {
        $guest = $this->find($token);
        $occasion = $guest->occasion;

        return response()->json([
            'guest' => [
                'name'      => $guest->name,
                'status'    => $this->status($guest),
                'table'     => $guest->table?->label,
                // QR d'accès à présenter à l'accueil (même contenu que sur le carton).
                'qr'        => 'data:image/svg+xml;base64,' . $qr->guest($guest->token),
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

    /**
     * Le carton de l'invité (PDF, ou image si l'événement n'a qu'un fond
     * image), identique à la pièce jointe envoyée par WhatsApp.
     */
    public function invitation(string $token, InvitationComposer $composer): Response
    {
        $guest = $this->find($token);

        $file = $composer->render($guest);
        if (! $file) {
            return response()->json(['message' => 'Invitation momentanément indisponible. Réessayez dans un instant.'], 503);
        }

        $ext = $file['mime'] === 'application/pdf' ? 'pdf' : 'png';
        $name = \Illuminate\Support\Str::slug('invitation ' . $guest->occasion->name . ' ' . $guest->name) . '.' . $ext;

        return response($file['body'], 200, [
            'Content-Type'        => $file['mime'],
            'Content-Disposition' => 'attachment; filename="' . $name . '"',
            'Cache-Control'       => 'private, no-store',
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
