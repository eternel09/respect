<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guest;
use App\Models\Occasion;
use App\Services\QrCodeService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/** Envoi des invitations WhatsApp (QR + carte) aux invités d'une occasion. */
class OccasionInvitationController extends Controller
{
    private const TYPE_LABELS = [
        'mariage'      => 'Mariage',
        'gala'         => 'Gala',
        'ceremonie'    => 'Cérémonie',
        'anniversaire' => 'Anniversaire',
        'concert'      => 'Concert',
        'autre'        => 'Invitation',
    ];

    /** Un envoi dont le heartbeat s'est tu depuis ce délai est réputé mort (process tué) et repris. */
    private const SEND_LOCK_STALE_MINUTES = 10;

    /** Envoie l'invitation à tous les invités joignables (avec téléphone). */
    public function sendAll(Occasion $occasion, Request $request, QrCodeService $qr): JsonResponse
    {
        abort_if($occasion->organization_id !== $request->user()->organization_id, 404);

        // Verrou anti-doublon : un seul envoi groupé à la fois par événement.
        // Sans lui, deux exécutions parallèles (re-clic, rechargement, second
        // onglet, relance après un timeout du proxy) voient les mêmes invités
        // encore « en attente » — pas encore atteints — et les contactent tous
        // les deux (invitations envoyées deux fois). Le risque explose avec
        // l'espacement, qui fait durer un envoi plusieurs minutes.
        // Réservation atomique : on ne pose l'horodatage que s'il est absent ou
        // périmé (un envoi antérieur tué sans libérer son verrou est ainsi
        // repris automatiquement). update() renvoie le nombre de lignes
        // touchées : 0 = un autre envoi tourne déjà.
        $stale = now()->subMinutes(self::SEND_LOCK_STALE_MINUTES);
        $acquired = Occasion::whereKey($occasion->id)
            ->where(fn ($q) => $q->whereNull('invites_sending_at')->orWhere('invites_sending_at', '<=', $stale))
            ->update(['invites_sending_at' => now()]);

        if ($acquired === 0) {
            return response()->json([
                'message' => 'Un envoi est déjà en cours pour cet événement. Patientez qu’il se termine avant de relancer.',
            ], 409);
        }

        try {
            // Par défaut on (re)cible les invités pas encore envoyés ; ?all=1 force tout le monde.
            $guests = $occasion->guests()->with('table')
                ->whereNotNull('phone')
                ->when(! $request->boolean('all'), fn ($q) => $q->where('invite_status', '!=', 'sent'))
                ->get();

            $skipped = $occasion->guests()->whereNull('phone')->count();

            if ($guests->isEmpty()) {
                return response()->json([
                    'sent' => 0, 'failed' => 0, 'skipped' => $skipped,
                    'message' => $skipped > 0
                        ? "Aucun invité à contacter — {$skipped} sans numéro de téléphone."
                        : 'Toutes les invitations ont déjà été envoyées.',
                ]);
            }

            // Espacement anti-blocage : l'envoi se fait de façon synchrone en
            // patientant entre chaque invité. On lève la limite de temps PHP et on
            // poursuit même si le client se déconnecte (proxy/onglet fermé) — les
            // statuts sont persistés au fil de l'eau, l'écran se rafraîchit après.
            @set_time_limit(0);
            @ignore_user_abort(true);

            $delay      = (int) config('services.whatsapp.invite_delay');
            $jitter     = (int) config('services.whatsapp.invite_jitter');
            $batchSize  = (int) config('services.whatsapp.invite_batch_size');
            $batchPause = (int) config('services.whatsapp.invite_batch_pause');

            $sent = 0; $failed = 0;

            foreach ($guests->values() as $index => $guest) {
                // On patiente AVANT chaque envoi sauf le premier : délai de base +
                // aléa, plus une pause longue tous les $batchSize envois.
                if ($index > 0 && $delay > 0) {
                    $wait = $delay + ($jitter > 0 ? random_int(0, $jitter) : 0);
                    if ($batchSize > 0 && $batchPause > 0 && $index % $batchSize === 0) {
                        $wait += $batchPause;
                    }
                    sleep($wait);
                }

                // Heartbeat : tant que l'envoi progresse, le verrou reste frais
                // (rythme < STALE), donc jamais repris à tort ; s'il meurt, il se
                // périme et devient reprenable.
                Occasion::whereKey($occasion->id)->update(['invites_sending_at' => now()]);

                $result = $this->dispatch($occasion, $guest, $qr);

                if ($result === 'not_ready') {
                    // WhatsApp non connecté : on arrête tout de suite sans marquer d'échec.
                    return response()->json([
                        'message' => 'WhatsApp n’est pas connecté. Liez le compte depuis les Réglages, puis réessayez.',
                    ], 409);
                }
                if ($result === 'offline') {
                    return response()->json(['message' => 'Service WhatsApp injoignable.'], 503);
                }

                $result === true ? $sent++ : $failed++;
            }

            return response()->json([
                'sent' => $sent, 'failed' => $failed, 'skipped' => $skipped,
                'message' => "Invitations envoyées : {$sent}."
                    . ($failed ? " Échecs : {$failed}." : '')
                    . ($skipped ? " Sans téléphone : {$skipped}." : ''),
            ]);
        } finally {
            // Libération du verrou, quelle que soit l'issue (succès, retour
            // anticipé, exception). ignore_user_abort garantit que ce bloc
            // s'exécute même si le client s'est déconnecté.
            Occasion::whereKey($occasion->id)->update(['invites_sending_at' => null]);
        }
    }

    /**
     * Aperçu composé du carton (fond téléversé + QR + nom) sans envoyer ni
     * modifier de statut. Utilise un vrai invité si l'occasion en a un (rendu
     * représentatif), sinon un invité factice. Fonctionne même si WhatsApp
     * n'est pas connecté (le service ne rend que l'image).
     */
    public function preview(Occasion $occasion, Request $request, QrCodeService $qr): \Symfony\Component\HttpFoundation\Response
    {
        abort_if($occasion->organization_id !== $request->user()->organization_id, 404);

        $sample     = $occasion->guests()->with('table')->orderBy('name')->first();
        $guestName  = $sample?->name ?: 'Marie Exemple';
        $tableLabel = $sample ? $this->tableLabel($sample) : 'Table 1';
        $token      = $sample?->token ?: (string) \Illuminate\Support\Str::uuid();

        $payload = [
            'org'        => $occasion->organization->name,
            'orgLogo'    => $occasion->organization->logoDataUri(),
            'eventType'  => self::TYPE_LABELS[$occasion->type] ?? 'Invitation',
            'eventName'  => $occasion->name,
            'guestName'  => $guestName,
            'dateText'   => $this->dateText($occasion),
            'location'   => $occasion->location,
            'tableLabel' => $tableLabel,
            'qrDataUri'  => 'data:image/svg+xml;base64,' . $qr->guest($token),
            'backgroundDataUri' => $occasion->invitationBgDataUri(),
        ];

        // Aperçu d'un modèle PDF : composé et renvoyé en PDF (repères + valeurs).
        if ($occasion->invitationIsPdf()) {
            $payload['templatePdfBase64'] = $occasion->invitationTemplateBase64();
            $payload['qrText'] = $token;
            unset($payload['backgroundDataUri']);
        }

        try {
            $res = $this->service()->timeout(60)->post('/preview-invitation', $payload);
        } catch (ConnectionException) {
            return response()->json(['message' => 'Service WhatsApp injoignable.'], 503);
        }

        if (! $res->successful()) {
            return response()->json(['message' => "Échec de la génération de l'aperçu."], 502);
        }

        $contentType = $occasion->invitationIsPdf() ? 'application/pdf' : 'image/png';
        return response($res->body(), 200)->header('Content-Type', $contentType);
    }

    /** (Re)envoie l'invitation à un invité précis. */
    public function sendOne(Guest $guest, Request $request, QrCodeService $qr): JsonResponse
    {
        abort_if($guest->organization_id !== $request->user()->organization_id, 404);

        if (! $guest->phone) {
            return response()->json(['message' => 'Cet invité n’a pas de numéro de téléphone.'], 422);
        }

        $guest->loadMissing('table', 'occasion');
        $result = $this->dispatch($guest->occasion, $guest, $qr);

        return match ($result) {
            'not_ready' => response()->json(['message' => 'WhatsApp n’est pas connecté. Liez le compte depuis les Réglages.'], 409),
            'offline'   => response()->json(['message' => 'Service WhatsApp injoignable.'], 503),
            true        => response()->json(['sent' => true, 'message' => "Invitation envoyée à {$guest->name}."]),
            default     => response()->json(['sent' => false, 'message' => $guest->invite_error ?: "Échec de l'envoi."], 502),
        };
    }

    /**
     * Envoie une invitation et met à jour le statut de l'invité.
     * Retour : true (ok) | false (échec applicatif) | 'not_ready' | 'offline'.
     */
    private function dispatch(Occasion $occasion, Guest $guest, QrCodeService $qr): bool|string
    {
        $payload = [
            'phone'      => $guest->phone,
            'org'        => $occasion->organization->name,
            'orgLogo'    => $occasion->organization->logoDataUri(),
            'eventType'  => self::TYPE_LABELS[$occasion->type] ?? 'Invitation',
            'eventName'  => $occasion->name,
            'guestName'  => $guest->name,
            'dateText'   => $this->dateText($occasion),
            'location'   => $occasion->location,
            'tableLabel' => $this->tableLabel($guest),
            'qrDataUri'  => 'data:image/svg+xml;base64,' . $qr->guest($guest->token),
            // Carton personnalisé (option A) : si présent, le service WhatsApp
            // superpose QR + nom dessus au lieu de générer le design par défaut.
            'backgroundDataUri' => $occasion->invitationBgDataUri(),
            // Lien public de confirmation de présence (RSVP + vidéo du couple).
            // Omis tant que le site n'a pas d'URL publique (évite un lien localhost).
            'rsvpUrl' => $this->rsvpUrl($guest),
            // Mot personnalisé de l'organisateur, ajouté à la légende automatique.
            'customMessage' => $occasion->invitation_message,
        ];

        // Modèle PDF : le service détecte les repères et tamponne nom/table/QR.
        // Le QR encode le jeton de l'invité (identique à ce que scanne l'accueil).
        if ($occasion->invitationIsPdf()) {
            $payload['templatePdfBase64'] = $occasion->invitationTemplateBase64();
            $payload['qrText'] = $guest->token;
            unset($payload['backgroundDataUri']);
        }

        try {
            $res = $this->service()->timeout(120)->post('/send-invitation', $payload);
        } catch (ConnectionException) {
            return 'offline';
        }

        if ($res->status() === 409) {
            return 'not_ready';
        }

        if ($res->successful() && ($res->json('sent') === true)) {
            $guest->forceFill([
                'invite_status' => 'sent',
                'invited_at'    => now(),
                'invite_error'  => null,
            ])->save();
            return true;
        }

        $guest->forceFill([
            'invite_status' => 'failed',
            'invite_error'  => \Illuminate\Support\Str::limit($res->json('message') ?? 'Échec inconnu.', 190),
        ])->save();
        return false;
    }

    /**
     * Lien public de confirmation (RSVP), ou null si le site n'a pas d'URL
     * publique configurée. On n'envoie jamais un lien localhost / injoignable
     * aux invités : la ligne « Confirmez votre présence » disparaît alors du
     * message. Il suffit de définir FRONTEND_URL sur le vrai domaine pour la
     * réactiver automatiquement.
     */
    private function rsvpUrl(Guest $guest): ?string
    {
        $base = rtrim((string) config('app.frontend_url'), '/');

        if ($base === '' || ! preg_match('#^https?://#i', $base)) {
            return null;
        }

        $host = strtolower((string) parse_url($base, PHP_URL_HOST));
        if ($host === '' || in_array($host, ['localhost', '127.0.0.1', '0.0.0.0', '::1'], true)
            || str_ends_with($host, '.local')) {
            return null;
        }

        return $base . '/confirmer/' . $guest->token;
    }

    private function tableLabel(Guest $guest): ?string
    {
        $label = $guest->table?->label;
        if (! $label) {
            return null;
        }
        return is_numeric($label) ? "Table {$label}" : $label;
    }

    private function dateText(Occasion $occasion): string
    {
        $text = $occasion->date->locale('fr')->translatedFormat('l j F Y');
        if ($occasion->starts_at) {
            $text .= ' à ' . $occasion->starts_at->format('H\hi');
        }
        return $text;
    }

    private function service()
    {
        return Http::baseUrl(config('services.whatsapp.url'))
            ->withHeaders(['X-Api-Key' => config('services.whatsapp.key')])
            ->timeout(15)
            ->acceptJson();
    }
}
