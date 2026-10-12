<?php

namespace App\Console\Commands;

use App\Mail\CardPrintRequestDigest;
use App\Models\CardPrintRequest;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Relance : envoie à l'équipe (super-admins + opérateurs) le récapitulatif des
 * demandes de cartes ouvertes sans avancement depuis `services.cards.stale_hours`.
 * Planifiée chaque jour ouvré (routes/console.php) ; sans demande en souffrance,
 * aucun e-mail n'est envoyé.
 */
class RemindStaleCardRequests extends Command
{
    protected $signature = 'cards:remind-stale';

    protected $description = "Relance l'équipe sur les demandes de cartes qui stagnent";

    public function handle(): int
    {
        $hours = (int) config('services.cards.stale_hours', 48);

        // Contexte console : pas d'utilisateur connecté → pas de restriction multi-tenant.
        $stale = CardPrintRequest::with('organization')
            ->whereIn('status', ['pending', 'in_progress'])
            ->where('updated_at', '<', now()->subHours($hours))
            ->orderBy('updated_at')
            ->get();

        if ($stale->isEmpty()) {
            $this->info('Aucune demande en souffrance.');
            return self::SUCCESS;
        }

        $emails = User::whereNull('organization_id')
            ->whereIn('role', ['super_admin', 'operator'])
            ->pluck('email')->filter()->all();

        if (! $emails) {
            $this->warn("{$stale->count()} demande(s) en souffrance, mais aucun membre d'équipe à relancer.");
            return self::SUCCESS;
        }

        Mail::to($emails)->send(new CardPrintRequestDigest($stale, $hours));
        $this->info("Relance envoyée : {$stale->count()} demande(s) à " . count($emails) . ' destinataire(s).');

        return self::SUCCESS;
    }
}
