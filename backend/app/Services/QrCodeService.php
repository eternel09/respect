<?php

namespace App\Services;

use SimpleSoftwareIO\QrCode\Facades\QrCode;

class QrCodeService
{
    public function onboarding(): string
    {
        $url = config('app.frontend_url') . '/onboarding';
        return base64_encode(QrCode::format('png')->size(300)->generate($url));
    }

    public function presence(int $eventId): string
    {
        $url = config('app.frontend_url') . '/presence?event_id=' . $eventId;
        return base64_encode(QrCode::format('png')->size(300)->generate($url));
    }

    /**
     * QR personnel d'un membre (SVG base64). Encode le jeton opaque.
     *
     * SVG simple, couleur de marque, modules carrés standard : c'est le format
     * que dompdf rend de façon fiable dans le badge PDF (les images raster en
     * data-URI — PNG/JPEG — peuvent s'afficher en blanc selon le lecteur, à
     * cause de l'encodage SMask / du dossier temporaire). Le navigateur le rend
     * tout aussi bien pour l'aperçu, donc écran et impression sont cohérents.
     */
    public function member(string $token): string
    {
        return base64_encode(
            QrCode::format('svg')
                ->size(300)
                ->margin(1)
                ->color(30, 58, 95)
                ->generate($token)
        );
    }
}
