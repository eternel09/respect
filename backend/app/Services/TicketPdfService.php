<?php

namespace App\Services;

use App\Models\TicketOrder;
use Barryvdh\DomPDF\Facade\Pdf;

/**
 * Génère le PDF des e-billets d'une commande (QR par billet). Partagé par le
 * téléchargement public et l'envoi automatique au paiement, pour un rendu
 * identique et une seule source de vérité.
 */
class TicketPdfService
{
    public function __construct(private readonly QrCodeService $qr)
    {
    }

    /** Contenu binaire du PDF des billets valables d'une commande. */
    public function render(TicketOrder $order): string
    {
        $order->loadMissing('tickets', 'occasion.organization');

        $tickets = $order->tickets->where('status', '!=', 'void')->values()
            ->map(fn ($t) => [
                'type'      => $t->type_name,
                'holder'    => $t->holder_name,
                'reference' => $order->reference,
                'qr'        => 'data:image/svg+xml;base64,' . $this->qr->ticket($t->token),
            ]);

        return Pdf::loadView('pdf.tickets', [
            'order'    => $order,
            'occasion' => $order->occasion,
            'tickets'  => $tickets,
            'design'   => $order->occasion->ticketDesignDataUri(), // null = design standard
        ])->output();
    }

    public function filename(TicketOrder $order): string
    {
        return "billets-{$order->reference}.pdf";
    }
}
