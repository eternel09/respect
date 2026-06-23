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
     * QR personnel d'un membre : encode son jeton opaque (aucune donnée perso).
     * L'app scanner lit ce jeton et l'envoie à POST /api/scan.
     */
    public function member(string $token): string
    {
        // SVG (pur-PHP, sans imagick) avec un rendu minimal/futuriste :
        // modules arrondis, yeux circulaires, dégradé marque → accent (restant scannable).
        return base64_encode(
            QrCode::format('svg')
                ->size(300)
                ->margin(1)
                ->style('round')
                ->eye('circle')
                ->gradient(30, 58, 95, 201, 116, 43, 'diagonal')
                ->generate($token)
        );
    }
}
