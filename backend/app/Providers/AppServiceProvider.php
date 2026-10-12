<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();

        // Expiration par inactivité : un token dont la dernière utilisation
        // remonte à plus de `sanctum.idle_timeout` minutes est refusé, ce qui
        // force la reconnexion. `last_used_at` porte l'horodatage de la requête
        // PRÉCÉDENTE (mis à jour après validation), d'où un vrai délai glissant.
        Sanctum::authenticateAccessTokensUsing(function (PersonalAccessToken $token, bool $isValid) {
            if (! $isValid) {
                return false;
            }

            $idle = (int) config('sanctum.idle_timeout', 0);

            if ($idle > 0 && $token->last_used_at && $token->last_used_at->lt(now()->subMinutes($idle))) {
                return false;
            }

            return true;
        });
    }

    /**
     * Limiteurs nommés : chacun a SON compteur. Le middleware `throttle:N,M`
     * sans nom partage un compteur unique par IP entre toutes les routes qui
     * l'utilisent — le trafic public (portail, suivi…) pouvait alors bloquer
     * une connexion légitime depuis la même IP (bureau derrière un NAT).
     */
    private function configureRateLimiting(): void
    {
        // Connexion : 6 essais/min par couple e-mail + IP, et 30/min par IP
        // (freine la pulvérisation de mots de passe sur plusieurs comptes).
        RateLimiter::for('login', function (Request $request) {
            $email = Str::lower((string) $request->input('email'));

            return [
                Limit::perMinute(6)->by($email . '|' . $request->ip()),
                Limit::perMinute(30)->by($request->ip()),
            ];
        });

        // Portail public des cartes : dépôt de demande et page de suivi.
        RateLimiter::for('card-portal', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('card-tracking', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));
    }
}
