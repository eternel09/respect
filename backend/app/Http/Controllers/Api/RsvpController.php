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
 * foi. Montre l'invitation en ligne (QR d'accès, ajout à l'agenda), la
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
                // Mot des hôtes (le même que dans le message WhatsApp).
                'message'       => $occasion->invitation_message,
                'organization'  => $occasion->organization->name,
                // Design propre à l'événement : palette, polices, cachet, carte.
                'theme'         => $occasion->invitationTheme(),
                'cover_url'     => $occasion->invitationCoverUrl(),
                // Modèle « faire-part » : textes et photos du couple.
                'content'       => $occasion->invitationContent(),
                'photos'        => $occasion->invitationPhotoUrls(),
                // Le carton du client sort de l'enveloppe (servi par /rsvp/{token}/carton).
                'carton'        => $occasion->showsCartonOnline(),
            ],
        ]);
    }

    /**
     * Carton du client tel qu'il sort de l'enveloppe : l'image téléversée, ou
     * le modèle PDF composé au nom de l'invité. 404 si l'événement n'en a pas
     * (ou s'il ne peut être rendu) : la page garde alors la carte Signiq.
     */
    public function carton(string $token, \App\Services\InvitationCartonService $cartons): Response
    {
        $guest = $this->find($token);
        abort_unless($guest->occasion->showsCartonOnline(), 404);

        $path = $cartons->pathFor($guest);
        abort_if($path === null, 404);

        return \Illuminate\Support\Facades\Storage::disk('public')->response($path, null, [
            'Cache-Control' => 'private, max-age=600',
        ]);
    }

    /**
     * L'événement au format agenda (.ics), servi « inline » : sur iPhone, son
     * ouverture affiche directement « Ajouter au calendrier » ; sur ordinateur,
     * l'application d'agenda par défaut l'importe.
     * Heures « flottantes » (sans fuseau) : l'organisateur saisit l'heure
     * locale de l'événement, l'agenda de l'invité la garde telle quelle.
     */
    public function calendar(string $token, InvitationComposer $composer): Response
    {
        $guest = $this->find($token);
        $occasion = $guest->occasion;

        $lines = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Signiq//Invitation//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            'UID:' . $guest->token . '@signiq',
            'DTSTAMP:' . now()->utc()->format('Ymd\THis\Z'),
        ];

        if ($occasion->starts_at) {
            $start = $occasion->date->copy()->setTimeFrom($occasion->starts_at);
            $lines[] = 'DTSTART:' . $start->format('Ymd\THis');
            $lines[] = 'DTEND:' . $start->copy()->addHours(5)->format('Ymd\THis');
        } else {
            $lines[] = 'DTSTART;VALUE=DATE:' . $occasion->date->format('Ymd');
            $lines[] = 'DTEND;VALUE=DATE:' . $occasion->date->copy()->addDay()->format('Ymd');
        }

        $details = array_filter([
            $composer->tableLabel($guest) ? 'Votre place : ' . $composer->tableLabel($guest) : null,
            ($url = $composer->guestUrl($guest)) ? 'Votre invitation : ' . $url : null,
        ]);

        $lines[] = 'SUMMARY:' . $this->icsText($occasion->name);
        if ($occasion->location) {
            $lines[] = 'LOCATION:' . $this->icsText($occasion->location);
        }
        if ($details) {
            $lines[] = 'DESCRIPTION:' . $this->icsText(implode("\n", $details));
        }
        if (! empty($url)) {
            $lines[] = 'URL:' . $url;
        }
        // Rappel la veille.
        array_push($lines, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' . $this->icsText($occasion->name), 'TRIGGER:-P1D', 'END:VALARM');
        array_push($lines, 'END:VEVENT', 'END:VCALENDAR');

        $name = \Illuminate\Support\Str::slug($occasion->name) ?: 'invitation';

        return response(implode("\r\n", array_map([$this, 'icsFold'], $lines)) . "\r\n", 200, [
            'Content-Type'        => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'inline; filename="' . $name . '.ics"',
            'Cache-Control'       => 'private, no-store',
        ]);
    }

    private function icsText(string $text): string
    {
        return str_replace(['\\', ';', ',', "\r\n", "\n"], ['\\\\', '\\;', '\\,', '\\n', '\\n'], $text);
    }

    /** Lignes de 75 octets maximum (RFC 5545), sans couper un caractère UTF-8. */
    private function icsFold(string $line): string
    {
        $out = '';
        while (strlen($line) > 75) {
            $cut = 75;
            while ($cut > 0 && (ord($line[$cut]) & 0xC0) === 0x80) {
                $cut--;
            }
            $out .= substr($line, 0, $cut) . "\r\n ";
            $line = substr($line, $cut);
        }

        return $out . $line;
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
