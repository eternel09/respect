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
     * QR personnel d'un membre en PNG base64 — pour l'aperçu web (navigateur).
     * Encode le jeton opaque. Style minimal/futuriste : modules arrondis +
     * dégradé marque → accent (on dessine la matrice nous-mêmes via GD).
     */
    public function member(string $token): string
    {
        $img = $this->buildImage($token);
        ob_start();
        imagepng($img);
        $data = ob_get_clean();
        imagedestroy($img);

        return base64_encode($data);
    }

    /**
     * Même QR en JPEG base64 — pour le badge PDF. dompdf encode les PNG d'une
     * façon que certains lecteurs PDF affichent en blanc (alpha/SMask) ; le
     * JPEG (fond blanc, opaque) se rend correctement dans tous les lecteurs.
     */
    public function memberJpeg(string $token): string
    {
        $img = $this->buildImage($token);
        ob_start();
        imagejpeg($img, null, 92);
        $data = ob_get_clean();
        imagedestroy($img);

        return base64_encode($data);
    }

    /**
     * Dessine le QR du jeton avec GD (sans imagick) : modules arrondis reliés
     * et dégradé diagonal marque → accent, suréchantillonné puis réduit pour
     * lisser les bords. Retourne la ressource GD (à détruire par l'appelant).
     */
    private function buildImage(string $token): \GdImage
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
        imagedestroy($img);

        return $out;
    }
}
