<?php

namespace App\Console\Commands;

use App\Models\Guest;
use App\Models\Occasion;
use App\Services\InvitationComposer;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Str;

/**
 * Rappel WhatsApp du jour J : le matin de l'événement (9 h par défaut, heure
 * de Kinshasa), chaque invité qui a reçu son invitation et ne l'a pas
 * déclinée reçoit un message avec le lien de son invitation en ligne (QR
 * d'accès, itinéraire). Seulement pour les événements où l'organisateur a
 * activé l'option.
 *
 * Planifiée toutes les 10 minutes sur la plage d'envoi (routes/console.php) :
 * un passage manqué (WhatsApp déconnecté, redémarrage) est rattrapé au
 * suivant. Chaque invité n'est rappelé qu'une fois (statut par invité), et
 * on ne rappelle plus personne une fois l'événement commencé.
 */
class SendDayReminders extends Command
{
    protected $signature = 'occasions:send-day-reminders {--force : Envoyer même avant l\'heure prévue}';

    protected $description = 'Envoie le rappel WhatsApp du jour J aux invités (événements où il est activé)';

    public function handle(InvitationComposer $composer): int
    {
        $cfg = config('occasions.day_reminder');
        $now = now($cfg['timezone']);

        if (! $this->option('force') && $now->format('H:i') < $cfg['at']) {
            $this->info("Trop tôt : les rappels partent à partir de {$cfg['at']}.");
            return self::SUCCESS;
        }

        // Le rappel porte toujours le lien de l'invitation : sans adresse
        // publique du site, on n'envoie rien plutôt qu'un lien injoignable.
        if (InvitationComposer::publicBaseUrl() === null) {
            $this->warn('Adresse publique du site (FRONTEND_URL) absente : aucun rappel envoyé.');
            return self::SUCCESS;
        }

        // Contexte console : pas d'utilisateur connecté → pas de restriction multi-tenant.
        $occasions = Occasion::with('organization')
            ->where('day_reminder', true)
            ->whereDate('date', $now->toDateString())
            ->get()
            ->filter(fn (Occasion $o) => $o->hasFeature('guests') && ! $this->started($o, $now));

        $sent = 0; $failed = 0; $first = true;

        foreach ($occasions as $occasion) {
            $guests = $occasion->guests()->with('table')
                ->whereNotNull('phone')
                ->where('invite_status', 'sent')
                ->where('declined', false)
                ->whereNull('checked_in_at')
                ->whereNull('reminder_status')
                ->orderBy('id')
                ->get();

            foreach ($guests as $guest) {
                // Même espacement anti-blocage que l'envoi des invitations.
                if (! $first) {
                    $this->pause($sent + $failed);
                }
                $first = false;

                // L'événement a pu commencer pendant un long envoi.
                if ($this->started($occasion, now($cfg['timezone']))) {
                    break;
                }

                $result = $this->remind($composer, $occasion, $guest);

                if ($result === 'not_ready' || $result === 'offline') {
                    $this->warn($result === 'offline'
                        ? 'Service WhatsApp injoignable : nouvel essai au prochain passage.'
                        : 'WhatsApp non connecté : nouvel essai au prochain passage.');
                    $this->info("Rappels envoyés : {$sent}. Échecs : {$failed}.");
                    return self::SUCCESS;
                }

                $result ? $sent++ : $failed++;
            }
        }

        $this->info("Rappels envoyés : {$sent}. Échecs : {$failed}.");
        return self::SUCCESS;
    }

    /** L'événement a-t-il commencé ? Heures « murales » : stockées sans fuseau. */
    private function started(Occasion $occasion, \Carbon\CarbonInterface $now): bool
    {
        return $occasion->starts_at !== null
            && $occasion->starts_at->format('Y-m-d H:i') <= $now->format('Y-m-d H:i');
    }

    private function pause(int $done): void
    {
        $delay = (int) config('services.whatsapp.invite_delay');
        if ($delay <= 0) {
            return;
        }
        $jitter     = (int) config('services.whatsapp.invite_jitter');
        $batchSize  = (int) config('services.whatsapp.invite_batch_size');
        $batchPause = (int) config('services.whatsapp.invite_batch_pause');

        $wait = $delay + ($jitter > 0 ? random_int(0, $jitter) : 0);
        if ($batchSize > 0 && $batchPause > 0 && $done > 0 && $done % $batchSize === 0) {
            $wait += $batchPause;
        }
        sleep($wait);
    }

    /** true (envoyé) | false (échec, non retenté) | 'not_ready' | 'offline'. */
    private function remind(InvitationComposer $composer, Occasion $occasion, Guest $guest): bool|string
    {
        try {
            $res = $composer->service()->timeout(60)->post('/send-reminder', [
                'phone'         => $guest->phone,
                'org'           => $occasion->organization->name,
                'eventName'     => $occasion->name,
                'guestName'     => $guest->name,
                'timeText'      => $occasion->starts_at?->format('H\hi'),
                'location'      => $occasion->location,
                'tableLabel'    => $composer->tableLabel($guest),
                'invitationUrl' => $composer->guestUrl($guest),
            ]);
        } catch (ConnectionException) {
            return 'offline';
        }

        if ($res->status() === 409) {
            return 'not_ready';
        }

        $ok = $res->successful() && $res->json('sent') === true;

        $guest->forceFill([
            'reminder_status' => $ok ? 'sent' : 'failed',
            'reminded_at'     => $ok ? now() : null,
        ])->save();

        if (! $ok) {
            $this->warn("Échec du rappel pour {$guest->name} : " . Str::limit((string) ($res->json('message') ?? $res->status()), 120));
        }

        return $ok;
    }
}
