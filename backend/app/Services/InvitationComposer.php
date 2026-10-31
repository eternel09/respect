<?php

namespace App\Services;

use App\Models\Guest;
use App\Models\Occasion;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Composition d'une invitation (carton + QR + nom) pour un invité : données
 * envoyées au service de rendu (WhatsApp), lien personnel, et fichier
 * téléchargeable depuis la page publique de l'invité.
 */
class InvitationComposer
{
    public const TYPE_LABELS = [
        'mariage'      => 'Mariage',
        'gala'         => 'Gala',
        'ceremonie'    => 'Cérémonie',
        'anniversaire' => 'Anniversaire',
        'concert'      => 'Concert',
        'autre'        => 'Invitation',
    ];

    // Durée de conservation d'une invitation rendue (évite de relancer le rendu
    // à chaque téléchargement) ; la clé change dès que l'événement, le nom ou
    // la table de l'invité changent (pas sa réponse RSVP).
    private const CACHE_MINUTES = 60;

    public function __construct(private QrCodeService $qr) {}

    /**
     * Données du carton pour un invité (ou un invité d'exemple pour l'aperçu).
     * Modèle PDF : le service détecte les repères et tamponne nom/table/QR ;
     * sinon image de fond (ou design par défaut) avec QR + nom superposés.
     */
    public function payload(Occasion $occasion, string $guestName, ?string $tableLabel, string $token): array
    {
        $payload = [
            'org'        => $occasion->organization->name,
            'orgLogo'    => $occasion->organization->logoDataUri(),
            'eventType'  => self::TYPE_LABELS[$occasion->type] ?? 'Invitation',
            'eventName'  => $occasion->name,
            'guestName'  => $guestName,
            'dateText'   => $this->dateText($occasion),
            'location'   => $occasion->location,
            'tableLabel' => $tableLabel,
            'qrDataUri'  => 'data:image/svg+xml;base64,' . $this->qr->guest($token),
            'backgroundDataUri' => $occasion->invitationBgDataUri(),
        ];

        if ($occasion->invitationIsPdf()) {
            $payload['templatePdfBase64'] = $occasion->invitationTemplateBase64();
            $payload['qrText'] = $token; // le QR encode le jeton (ce que scanne l'accueil)
            unset($payload['backgroundDataUri']);
        }

        return $payload;
    }

    public function guestPayload(Guest $guest): array
    {
        $guest->loadMissing('table', 'occasion.organization');

        return $this->payload($guest->occasion, $guest->name, $this->tableLabel($guest), $guest->token);
    }

    /**
     * Fichier de l'invitation de l'invité, tel qu'envoyé en pièce jointe
     * (PDF ; image en repli). Null si le service de rendu est injoignable.
     *
     * @return array{body: string, mime: string}|null
     */
    public function render(Guest $guest): ?array
    {
        $guest->loadMissing('table', 'occasion');
        $key = 'invitation:' . $guest->id . ':' . md5(implode('|', [
            $guest->occasion->updated_at?->timestamp, $guest->name, $this->tableLabel($guest),
        ]));

        $cached = Cache::get($key);
        if ($cached) {
            return ['body' => base64_decode($cached['body']), 'mime' => $cached['mime']];
        }

        try {
            $res = $this->service()->timeout(90)->post('/render-invitation', $this->guestPayload($guest));
        } catch (ConnectionException) {
            return null;
        }
        if (! $res->successful()) {
            return null;
        }

        $mime = str_contains((string) $res->header('Content-Type'), 'pdf') ? 'application/pdf' : 'image/png';
        $file = ['body' => $res->body(), 'mime' => $mime];
        Cache::put($key, ['body' => base64_encode($file['body']), 'mime' => $mime], now()->addMinutes(self::CACHE_MINUTES));

        return $file;
    }

    /**
     * Adresse publique du site, ou null s'il n'en a pas (localhost, IP locale…) :
     * on n'envoie jamais un lien injoignable aux invités.
     */
    public static function publicBaseUrl(): ?string
    {
        $base = rtrim((string) config('app.frontend_url'), '/');
        if ($base === '' || ! preg_match('#^https?://#i', $base)) {
            return null;
        }

        $host = strtolower((string) parse_url($base, PHP_URL_HOST));
        if ($host === '' || in_array($host, ['localhost', '127.0.0.1', '0.0.0.0', '::1'], true)
            || str_ends_with($host, '.local')) {
            return null;
        }

        return $base;
    }

    /** Page personnelle de l'invité (invitation en ligne + confirmation), ou null. */
    public function guestUrl(Guest $guest): ?string
    {
        $base = self::publicBaseUrl();

        return $base ? $base . '/confirmer/' . $guest->token : null;
    }

    public function tableLabel(Guest $guest): ?string
    {
        $label = $guest->table?->label;
        if (! $label) {
            return null;
        }

        return is_numeric($label) ? "Table {$label}" : $label;
    }

    public function dateText(Occasion $occasion): string
    {
        $text = $occasion->date->locale('fr')->translatedFormat('l j F Y');
        if ($occasion->starts_at) {
            $text .= ' à ' . $occasion->starts_at->format('H\hi');
        }

        return $text;
    }

    public function service()
    {
        return Http::baseUrl(config('services.whatsapp.url'))
            ->withHeaders(['X-Api-Key' => config('services.whatsapp.key')])
            ->timeout(15)
            ->acceptJson();
    }
}
