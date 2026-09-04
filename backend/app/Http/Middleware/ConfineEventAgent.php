<?php

namespace App\Http\Middleware;

use App\Models\Guest;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Confine un « agent d'événement » (utilisateur dont `occasion_id` est défini) à
 * son unique événement. Les utilisateurs d'organisation classiques
 * (`occasion_id` null) ne sont pas affectés.
 *
 * Un agent ne peut atteindre qu'une liste blanche de routes (accueil / gestion
 * des invités de SON occasion) ; tout le reste du back-office est refusé (403),
 * même si son rôle (scanner / secrétaire) l'y autoriserait normalement.
 */
class ConfineEventAgent
{
    /** URIs autorisées pour un agent d'événement (hors préfixe de domaine). */
    private const ALLOWED = [
        'api/admin/me',
        'api/admin/logout',
        // Accueil (scanner) — scan des QR d'invités
        'api/occasion-scan/occasions',
        'api/occasion-scan/manifest',
        'api/occasion-scan',
        // Gestion des invités (secrétaire) de l'occasion
        'api/occasions/{occasion}',
        'api/occasions/{occasion}/guests',
        'api/occasions/{occasion}/guests/bulk',
        'api/occasions/{occasion}/guests/bulk-delete',
        'api/guests/{guest}',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Utilisateur d'organisation classique : aucune restriction ajoutée.
        if (! $user || ! $user->occasion_id) {
            return $next($request);
        }

        $occId = (int) $user->occasion_id;
        $route = $request->route();
        $uri   = $route?->uri();

        // 1) Route hors liste blanche → refus net.
        if (! in_array($uri, self::ALLOWED, true)) {
            abort(403, 'Accès limité à votre événement.');
        }

        // 2) Paramètre {occasion} : doit correspondre à l'événement de l'agent.
        if ($route->hasParameter('occasion')) {
            $param = $route->parameter('occasion');
            $target = is_object($param) ? (int) $param->id : (int) $param;
            if ($target !== $occId) {
                abort(403, 'Accès limité à votre événement.');
            }
        }

        // 3) Paramètre {guest} : l'invité doit appartenir à l'événement de l'agent.
        if ($route->hasParameter('guest')) {
            $param = $route->parameter('guest');
            $guestOcc = is_object($param)
                ? (int) $param->occasion_id
                : (int) (Guest::whereKey($param)->value('occasion_id') ?? 0);
            if ($guestOcc !== $occId) {
                abort(403, 'Accès limité à votre événement.');
            }
        }

        // 4) Endpoints d'accueil (occasion_id passé en corps/query) : force le match.
        if (is_string($uri) && str_starts_with($uri, 'api/occasion-scan')) {
            $qOcc = (int) ($request->input('occasion_id') ?? $request->query('occasion_id') ?? 0);
            if ($qOcc !== 0 && $qOcc !== $occId) {
                abort(403, 'Accès limité à votre événement.');
            }
        }

        return $next($request);
    }
}
