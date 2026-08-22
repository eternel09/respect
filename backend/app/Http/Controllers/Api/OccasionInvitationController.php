<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guest;
use App\Models\Occasion;
use App\Services\QrCodeService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/** Envoi des invitations WhatsApp (QR + carte) aux invités d'une occasion. */
class OccasionInvitationController extends Controller
{
    private const TYPE_LABELS = [
        'mariage'      => 'Mariage',
        'gala'         => 'Gala',
        'ceremonie'    => 'Cérémonie',
        'anniversaire' => 'Anniversaire',
        'concert'      => 'Concert',
        'autre'        => 'Invitation',
    ];

    /** Envoie l'invitation à tous les invités joignables (avec téléphone). */
    public function sendAll(Occasion $occasion, Request $request, QrCodeService $qr): JsonResponse
    {
        abort_if($occasion->organization_id !== $request->user()->organization_id, 404);

        // Par défaut on (re)cible les invités pas encore envoyés ; ?all=1 force tout le monde.
        $guests = $occasion->guests()->with('table')
            ->whereNotNull('phone')
            ->when(! $request->boolean('all'), fn ($q) => $q->where('invite_status', '!=', 'sent'))
            ->get();

        $skipped = $occasion->guests()->whereNull('phone')->count();

        if ($guests->isEmpty()) {
            return response()->json([
                'sent' => 0, 'failed' => 0, 'skipped' => $skipped,
                'message' => $skipped > 0
                    ? "Aucun invité à contacter — {$skipped} sans numéro de téléphone."
                    : 'Toutes les invitations ont déjà été envoyées.',
            ]);
        }

        $sent = 0; $failed = 0;

        foreach ($guests as $guest) {
            $result = $this->dispatch($occasion, $guest, $qr);

            if ($result === 'not_ready') {
                // WhatsApp non connecté : on arrête tout de suite sans marquer d'échec.
                return response()->json([
                    'message' => 'WhatsApp n’est pas connecté. Liez le compte depuis les Réglages, puis réessayez.',
                ], 409);
            }
            if ($result === 'offline') {
                return response()->json(['message' => 'Service WhatsApp injoignable.'], 503);
            }

            $result === true ? $sent++ : $failed++;
        }

        return response()->json([
            'sent' => $sent, 'failed' => $failed, 'skipped' => $skipped,
            'message' => "Invitations envoyées : {$sent}."
                . ($failed ? " Échecs : {$failed}." : '')
                . ($skipped ? " Sans téléphone : {$skipped}." : ''),
        ]);
    }

    /** (Re)envoie l'invitation à un invité précis. */
    public function sendOne(Guest $guest, Request $request, QrCodeService $qr): JsonResponse
    {
        abort_if($guest->organization_id !== $request->user()->organization_id, 404);

        if (! $guest->phone) {
            return response()->json(['message' => 'Cet invité n’a pas de numéro de téléphone.'], 422);
        }

        $guest->loadMissing('table', 'occasion');
        $result = $this->dispatch($guest->occasion, $guest, $qr);

        return match ($result) {
            'not_ready' => response()->json(['message' => 'WhatsApp n’est pas connecté. Liez le compte depuis les Réglages.'], 409),
            'offline'   => response()->json(['message' => 'Service WhatsApp injoignable.'], 503),
            true        => response()->json(['sent' => true, 'message' => "Invitation envoyée à {$guest->name}."]),
            default     => response()->json(['sent' => false, 'message' => $guest->invite_error ?: "Échec de l'envoi."], 502),
        };
    }

    /**
     * Envoie une invitation et met à jour le statut de l'invité.
     * Retour : true (ok) | false (échec applicatif) | 'not_ready' | 'offline'.
     */
    private function dispatch(Occasion $occasion, Guest $guest, QrCodeService $qr): bool|string
    {
        $payload = [
            'phone'      => $guest->phone,
            'org'        => $occasion->organization->name,
            'orgLogo'    => $occasion->organization->logoDataUri(),
            'eventType'  => self::TYPE_LABELS[$occasion->type] ?? 'Invitation',
            'eventName'  => $occasion->name,
            'guestName'  => $guest->name,
            'dateText'   => $this->dateText($occasion),
            'location'   => $occasion->location,
            'tableLabel' => $this->tableLabel($guest),
            'qrDataUri'  => 'data:image/svg+xml;base64,' . $qr->guest($guest->token),
            // Carton personnalisé (option A) : si présent, le service WhatsApp
            // superpose QR + nom dessus au lieu de générer le design par défaut.
            'backgroundDataUri' => $occasion->invitationBgDataUri(),
        ];

        try {
            $res = $this->service()->timeout(120)->post('/send-invitation', $payload);
        } catch (ConnectionException) {
            return 'offline';
        }

        if ($res->status() === 409) {
            return 'not_ready';
        }

        if ($res->successful() && ($res->json('sent') === true)) {
            $guest->forceFill([
                'invite_status' => 'sent',
                'invited_at'    => now(),
                'invite_error'  => null,
            ])->save();
            return true;
        }

        $guest->forceFill([
            'invite_status' => 'failed',
            'invite_error'  => \Illuminate\Support\Str::limit($res->json('message') ?? 'Échec inconnu.', 190),
        ])->save();
        return false;
    }

    private function tableLabel(Guest $guest): ?string
    {
        $label = $guest->table?->label;
        if (! $label) {
            return null;
        }
        return is_numeric($label) ? "Table {$label}" : $label;
    }

    private function dateText(Occasion $occasion): string
    {
        $text = $occasion->date->locale('fr')->translatedFormat('l j F Y');
        if ($occasion->starts_at) {
            $text .= ' à ' . $occasion->starts_at->format('H\hi');
        }
        return $text;
    }

    private function service()
    {
        return Http::baseUrl(config('services.whatsapp.url'))
            ->withHeaders(['X-Api-Key' => config('services.whatsapp.key')])
            ->timeout(15)
            ->acceptJson();
    }
}
