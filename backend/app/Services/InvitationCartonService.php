<?php

namespace App\Services;

use App\Models\Guest;
use App\Models\Occasion;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Carton du client affiché dans l'invitation en ligne (il sort de
 * l'enveloppe à la place de la carte Signiq).
 *
 *  - Carton image : servi tel quel (déjà normalisé en JPEG au téléversement).
 *  - Modèle PDF   : composé au nom de l'invité par le service de rendu (nom,
 *    table, QR posés sur les repères), puis rastérisé en JPEG (Imagick, 1re
 *    page). Mis en cache par invité : la clé change avec le carton, le nom ou
 *    la table. Si le service est injoignable, on montre le modèle brut ; sans
 *    Imagick (dev), pas de carton — la page garde la carte Signiq.
 */
class InvitationCartonService
{
    private const MAX_EDGE = 1400;
    private const JPEG_QUALITY = 84;

    public function __construct(private InvitationComposer $composer) {}

    /** Chemin (disque public) de l'image du carton pour cet invité, ou null. */
    public function pathFor(Guest $guest): ?string
    {
        $guest->loadMissing('table', 'occasion.organization');
        $occasion = $guest->occasion;
        $disk = Storage::disk('public');

        if (! $occasion->invitation_bg_path || ! $disk->exists($occasion->invitation_bg_path)) {
            return null;
        }
        if (! $occasion->invitationIsPdf()) {
            return $occasion->invitation_bg_path;
        }

        $key = md5(implode('|', [$occasion->invitation_bg_path, $guest->name, $this->composer->tableLabel($guest)]));
        $cached = self::dir($occasion) . "/{$guest->id}-{$key}.jpg";
        if ($disk->exists($cached)) {
            return $cached;
        }

        if (! $this->canRasterize()) {
            return null;
        }

        $template = $disk->get($occasion->invitation_bg_path);
        $jpeg = $this->rasterize($this->composed($guest) ?? $template);
        if ($jpeg === null) {
            return null;
        }

        $disk->put($cached, $jpeg);

        return $cached;
    }

    /** Supprime les cartons rendus d'un événement (carton remplacé ou retiré). */
    public static function forget(Occasion $occasion): void
    {
        Storage::disk('public')->deleteDirectory(self::dir($occasion));
    }

    private static function dir(Occasion $occasion): string
    {
        return "invitations/cartons/{$occasion->id}";
    }

    /** PDF composé au nom de l'invité, ou null si le service ne répond pas. */
    protected function composed(Guest $guest): ?string
    {
        try {
            $res = $this->composer->service()->timeout(60)
                ->post('/preview-invitation', $this->composer->guestPayload($guest));
        } catch (ConnectionException) {
            return null;
        }

        return $res->successful() && str_starts_with($res->body(), '%PDF-') ? $res->body() : null;
    }

    protected function canRasterize(): bool
    {
        return extension_loaded('imagick');
    }

    /** 1re page du PDF en JPEG (fond blanc, redimensionnée), ou null. */
    protected function rasterize(string $pdf): ?string
    {
        // Même chemin que la normalisation des cartons au téléversement
        // (InvitationImageService) : lecture de la 1re page seulement.
        $tmp = tempnam(sys_get_temp_dir(), 'carton');
        try {
            file_put_contents($tmp, $pdf);
            $img = new \Imagick();
            $img->setResolution(150, 150);
            $img->readImage($tmp . '[0]');
            $img->setImageBackgroundColor('white');
            $img = $img->mergeImageLayers(\Imagick::LAYERMETHOD_FLATTEN);
            if (max($img->getImageWidth(), $img->getImageHeight()) > self::MAX_EDGE) {
                $img->thumbnailImage(self::MAX_EDGE, self::MAX_EDGE, true);
            }
            $img->setImageFormat('jpeg');
            $img->setImageCompressionQuality(self::JPEG_QUALITY);
            $img->stripImage();

            $blob = $img->getImageBlob();
            $img->clear();

            return $blob;
        } catch (\Throwable $e) {
            Log::warning('Carton en ligne : rastérisation impossible', ['error' => $e->getMessage()]);
            return null;
        } finally {
            @unlink($tmp);
        }
    }
}
