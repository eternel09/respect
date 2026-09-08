<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Normalise le carton d'invitation déposé par un client : quel que soit le
 * format d'entrée (JPG, PNG, WEBP, HEIC/HEIF d'iPhone, ou PDF d'un designer),
 * on produit un JPEG propre, aplati sur fond blanc, redimensionné à une taille
 * raisonnable. Garantit que le rendu WhatsApp fonctionne et que le poids reste
 * maîtrisé, sans dépendre de ce que le client apporte.
 *
 * - Imagick présent (prod) : gère HEIC et PDF (1re page) en plus des images web.
 * - Imagick absent (repli GD, dev) : gère JPG/PNG/WEBP ; HEIC/PDF sont refusés
 *   avec un message clair.
 */
class InvitationImageService
{
    private const MAX_EDGE = 1600;      // plus grand côté (px) après redimension
    private const JPEG_QUALITY = 85;

    /**
     * Traite l'upload et retourne le chemin (disque public).
     *  - PDF  : conservé TEL QUEL (vectoriel) — l'app y détecte les repères et
     *           tamponne nom/table/QR à l'envoi. Ne pas rasteriser.
     *  - Image: normalisée en JPEG (aplati, redimensionné).
     */
    public function process(UploadedFile $file): string
    {
        if ($this->isPdf($file)) {
            return $this->storePdf($file);
        }

        $blob = extension_loaded('imagick')
            ? $this->viaImagick($file)
            : $this->viaGd($file);

        $path = 'invitations/' . Str::uuid() . '.jpg';
        Storage::disk('public')->put($path, $blob);

        return $path;
    }

    private function isPdf(UploadedFile $file): bool
    {
        return strtolower((string) $file->getClientOriginalExtension()) === 'pdf'
            || $file->getMimeType() === 'application/pdf';
    }

    /** Stocke le PDF d'origine (après contrôle sommaire d'en-tête). */
    private function storePdf(UploadedFile $file): string
    {
        $bytes = (string) file_get_contents($file->getRealPath());
        if (! str_starts_with($bytes, '%PDF-')) {
            throw $this->reject('Ce PDF semble invalide ou endommagé.');
        }

        $path = 'invitations/' . Str::uuid() . '.pdf';
        Storage::disk('public')->put($path, $bytes);

        return $path;
    }

    /** Chemin complet : Imagick lit HEIC et PDF si les délégués sont présents. */
    private function viaImagick(UploadedFile $file): string
    {
        $isPdf = strtolower($file->getClientOriginalExtension()) === 'pdf';

        try {
            $img = new \Imagick();

            if ($isPdf) {
                $img->setResolution(150, 150);           // rastérisation nette
                $img->readImage($file->getRealPath() . '[0]'); // 1re page uniquement
                $img->setImageBackgroundColor('white');
                $img = $img->mergeImageLayers(\Imagick::LAYERMETHOD_FLATTEN);
            } else {
                $img->readImage($file->getRealPath());
                $img->setIteratorIndex(0);
            }

            if (method_exists($img, 'autoOrient')) {
                $img->autoOrient();                       // respecte l'EXIF (photos)
            }

            if (max($img->getImageWidth(), $img->getImageHeight()) > self::MAX_EDGE) {
                $img->thumbnailImage(self::MAX_EDGE, self::MAX_EDGE, true);
            }

            $img->setImageFormat('jpeg');
            $img->setImageCompressionQuality(self::JPEG_QUALITY);
            $img->setImageBackgroundColor('white');
            $img = $img->flattenImages();                 // aplatit toute transparence
            $img->stripImage();                           // retire métadonnées/profils

            $blob = $img->getImageBlob();
            $img->clear();

            return $blob;
        } catch (\Throwable $e) {
            throw $this->reject();
        }
    }

    /** Repli GD : images web seulement (pas de HEIC/PDF sans Imagick). */
    private function viaGd(UploadedFile $file): string
    {
        $ext = strtolower($file->getClientOriginalExtension());
        if (in_array($ext, ['heic', 'heif', 'pdf'], true)) {
            throw $this->reject(
                "Ce format ($ext) n’est pas pris en charge sur ce serveur. Déposez un JPG, PNG ou WEBP."
            );
        }

        $src = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        if ($src === false) {
            throw $this->reject();
        }

        $w = imagesx($src);
        $h = imagesy($src);
        $scale = min(1, self::MAX_EDGE / max($w, $h));    // jamais d'agrandissement
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));

        $dst = imagecreatetruecolor($nw, $nh);
        $white = imagecolorallocate($dst, 255, 255, 255); // aplatit la transparence
        imagefilledrectangle($dst, 0, 0, $nw, $nh, $white);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);

        ob_start();
        imagejpeg($dst, null, self::JPEG_QUALITY);
        $blob = (string) ob_get_clean();

        imagedestroy($src);
        imagedestroy($dst);

        return $blob;
    }

    private function reject(?string $message = null): ValidationException
    {
        return ValidationException::withMessages([
            'invitation' => [$message ?: 'Fichier illisible — déposez une image (JPG, PNG, WEBP, HEIC) ou un PDF.'],
        ]);
    }
}
