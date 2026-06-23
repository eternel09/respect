<?php

namespace App\Services;

use BaconQrCode\Common\ErrorCorrectionLevel;
use BaconQrCode\Encoder\Encoder;
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
    /**
     * QR personnel d'un membre, rendu en PNG (GD, sans imagick) avec un style
     * minimal/futuriste : modules arrondis et dégradé marque → accent.
     *
     * On dessine la matrice nous-mêmes car le moteur SVG de dompdf n'imprime
     * ni les dégradés ni les arrondis — ainsi l'aperçu écran et le badge
     * imprimé sont rigoureusement identiques. Encode le jeton opaque.
     */
    public function member(string $token): string
    {
        $matrix = Encoder::encode($token, ErrorCorrectionLevel::M(), Encoder::DEFAULT_BYTE_MODE_ECODING)->getMatrix();
        $n = $matrix->getWidth();

        $quiet  = 4;                 // zone de silence (modules)
        $module = 12;                // taille finale d'un module (px)
        $scale  = 3;                 // suréchantillonnage → bords arrondis lissés
        $m      = $module * $scale;
        $dim    = ($n + 2 * $quiet) * $m;

        $img   = imagecreatetruecolor($dim, $dim);
        $white = imagecolorallocate($img, 255, 255, 255);
        imagefilledrectangle($img, 0, 0, $dim, $dim, $white);

        $c1   = [30, 58, 95];        // marque (navy)
        $c2   = [176, 98, 38];       // accent (terracotta, assez foncé pour rester scannable)
        $maxT = max(1, 2 * ($n - 1));
        $d    = (int) round($m * 1.08); // léger chevauchement → modules reliés (arrondi)

        for ($y = 0; $y < $n; $y++) {
            for ($x = 0; $x < $n; $x++) {
                if ((int) $matrix->get($x, $y) !== 1) {
                    continue;
                }
                $t = ($x + $y) / $maxT;
                $color = imagecolorallocate(
                    $img,
                    (int) round($c1[0] + ($c2[0] - $c1[0]) * $t),
                    (int) round($c1[1] + ($c2[1] - $c1[1]) * $t),
                    (int) round($c1[2] + ($c2[2] - $c1[2]) * $t),
                );
                $cx = (int) round(($quiet + $x + 0.5) * $m);
                $cy = (int) round(($quiet + $y + 0.5) * $m);
                imagefilledellipse($img, $cx, $cy, $d, $d, $color);
            }
        }

        // Réduction finale (lisse les bords des modules arrondis)
        $final = ($n + 2 * $quiet) * $module;
        $out   = imagecreatetruecolor($final, $final);
        imagecopyresampled($out, $img, 0, 0, 0, 0, $final, $final, $dim, $dim);

        ob_start();
        imagepng($out);
        $png = ob_get_clean();
        imagedestroy($img);
        imagedestroy($out);

        return base64_encode($png);
    }
}
