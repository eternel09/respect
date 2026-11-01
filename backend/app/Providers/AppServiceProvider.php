<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Notifications\Messages\MailMessage;
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

            // Compte désactivé : ses sessions encore ouvertes sont refusées aussitôt.
            return $token->tokenable?->is_active !== false;
        });

        $this->configurePasswordResetMail();
    }

    /** Lien « mot de passe oublié » : vers le front, e-mail en français. */
    private function configurePasswordResetMail(): void
    {
        ResetPassword::createUrlUsing(fn ($user, string $token) => rtrim((string) config('app.frontend_url'), '/')
            . '/reinitialiser-mot-de-passe?token=' . $token . '&email=' . urlencode($user->email));

        ResetPassword::toMailUsing(function ($user, string $token) {
            $minutes = config('auth.passwords.' . config('auth.defaults.passwords') . '.expire');

            return (new MailMessage)
                ->subject('Réinitialisation de votre mot de passe Signiq')
                ->greeting('Bonjour ' . $user->name . ',')
                ->line('Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Signiq.')
                ->action('Choisir un nouveau mot de passe', ResetPassword::$createUrlCallback
                    ? call_user_func(ResetPassword::$createUrlCallback, $user, $token)
                    : url('/'))
                ->line("Ce lien est valable {$minutes} minutes.")
                ->line('Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.')
                ->salutation('L\'équipe Signiq');
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

        // Mot de passe oublié / réinitialisation : freine l'envoi d'e-mails en rafale.
        RateLimiter::for('password-reset', function (Request $request) {
            return [
                Limit::perMinute(3)->by(Str::lower((string) $request->input('email')) . '|' . $request->ip()),
                Limit::perMinute(10)->by($request->ip()),
            ];
        });
    }
}
