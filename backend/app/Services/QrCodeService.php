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
}
