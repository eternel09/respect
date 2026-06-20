<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    /**
     * Autorise la requête uniquement si l'utilisateur possède l'un des rôles donnés.
     * Usage : ->middleware('role:admin,scanner')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasRole(...$roles)) {
            abort(403, 'Accès non autorisé pour ce rôle.');
        }

        return $next($request);
    }
}
