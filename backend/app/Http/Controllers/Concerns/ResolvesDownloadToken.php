<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Résolution d'un token passé en query (?token=) pour les téléchargements en
 * navigation native (où aucun en-tête Authorization n'est possible).
 *
 * Applique les mêmes garanties que le guard Sanctum : token existant, non
 * expiré par inactivité (`sanctum.idle_timeout`), et comptabilise le
 * téléchargement comme activité (fenêtre glissante). Évite ainsi qu'un token
 * périmé reste indéfiniment exploitable via une URL de téléchargement.
 */
trait ResolvesDownloadToken
{
    protected function userFromToken(Request $request): ?User
    {
        $plain = $request->query('token');
        if (! $plain) {
            return null;
        }

        $token = PersonalAccessToken::findToken($plain);
        if (! $token) {
            return null;
        }

        $idle = (int) config('sanctum.idle_timeout', 0);
        if ($idle > 0 && $token->last_used_at && $token->last_used_at->lt(now()->subMinutes($idle))) {
            return null;
        }

        // Le téléchargement compte comme activité : prolonge la fenêtre glissante.
        $token->forceFill(['last_used_at' => now()])->save();

        return $token->tokenable instanceof User ? $token->tokenable : null;
    }
}
