<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
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
}
