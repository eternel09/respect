<?php

namespace App\Jobs;

use App\Models\TicketOrder;
use App\Services\TicketPdfService;
use App\Services\WhatsappSender;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Livraison automatique des e-billets dès qu'une commande est payée : le PDF
 * (QR par billet) est envoyé à l'acheteur sur WhatsApp.
 *
 * ShouldQueue → l'exécution suit QUEUE_CONNECTION : « sync » (défaut) = inline,
 * « redis »/« database » + workers = asynchrone, SANS changer une ligne de code.
 * Idempotent : ne renvoie pas si déjà livré (garde tickets_delivered_at).
 */
class DeliverOrderTicketsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(public int $orderId)
    {
    }

    public function handle(TicketPdfService $pdf, WhatsappSender $whatsapp): void
    {
        // withoutGlobalScopes : le job tourne hors contexte utilisateur.
        $order = TicketOrder::withoutGlobalScopes()->with('tickets', 'occasion')->find($this->orderId);

        if (! $order || $order->status !== 'paid' || $order->tickets_delivered_at) {
            return; // annulée, pas payée, ou déjà livrée
        }
        if (! $order->buyer_phone) {
            return; // pas de numéro : l'acheteur télécharge depuis le suivi de commande
        }

        $caption = "🎟️ Vos billets pour {$order->occasion->name}\n"
            . "Commande {$order->reference} — présentez le QR à l'entrée.";

        $sent = $whatsapp->sendDocument(
            $order->buyer_phone,
            $pdf->render($order),
            $pdf->filename($order),
            $caption,
        );

        if ($sent) {
            $order->forceFill(['tickets_delivered_at' => now()])->saveQuietly();
        }
        // Échec : on laisse tickets_delivered_at à null → un rejeu retentera.
    }
}
