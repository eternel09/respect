<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Distribution de l'application mobile (APK) au staff.
 *
 * Le dépôt GitHub étant privé, ce endpoint résout l'asset de la release
 * `mobile-latest` avec un jeton lecture seule, puis REDIRIGE le client vers
 * l'URL signée temporaire de GitHub : aucun octet ne transite par le serveur.
 */
class AppDistributionController extends Controller
{
    private const REPO = 'eternel09/respect';
    private const TAG = 'mobile-latest';
    private const ASSET = 'signiq-scanner.apk';

    public function latest()
    {
        $token = config('services.github.releases_token');
        abort_unless($token, 404, "La distribution de l'application n'est pas configurée.");

        try {
            $release = Http::withToken($token)->acceptJson()->timeout(20)
                ->get('https://api.github.com/repos/' . self::REPO . '/releases/tags/' . self::TAG);

            abort_unless($release->successful(), 502, 'Release introuvable.');

            $asset = collect($release->json('assets'))->firstWhere('name', self::ASSET);
            abort_unless($asset, 404, 'APK introuvable dans la release.');

            // GitHub répond 302 vers une URL signée quand on demande le binaire.
            $binary = Http::withToken($token)->timeout(20)
                ->withHeaders(['Accept' => 'application/octet-stream'])
                ->withOptions(['allow_redirects' => false])
                ->get($asset['url']);

            $signedUrl = $binary->header('Location');
            abort_unless($signedUrl, 502, 'Lien de téléchargement indisponible.');

            return redirect()->away($signedUrl);
        } catch (ConnectionException) {
            abort(503, 'GitHub injoignable, réessayez dans un instant.');
        }
    }
}
