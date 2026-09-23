<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TicketOrder;
use App\Services\QrCodeService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

/**
 * E-billets PDF d'une commande payée. Accès public par le jeton de la commande
 * (?token dans l'URL) : l'acheteur télécharge sans compte, comme les badges.
 */
class TicketExportController extends Controller
{
    public function orderTickets(string $token, QrCodeService $qr): Response
    {
        $order = TicketOrder::where('token', $token)->with('tickets', 'occasion.organization')->first();
        abort_unless($order, 404, 'Commande introuvable.');
        abort_unless($order->status === 'paid', 403, 'Les billets seront disponibles une fois le paiement confirmé.');

        $tickets = $order->tickets->where('status', '!=', 'void')->values()
            ->map(fn ($t) => [
                'type'      => $t->type_name,
                'holder'    => $t->holder_name,
                'reference' => $order->reference,
                'qr'        => 'data:image/svg+xml;base64,' . $qr->ticket($t->token),
            ]);

        $document = Pdf::loadView('pdf.tickets', [
            'order'    => $order,
            'occasion' => $order->occasion,
            'tickets'  => $tickets,
        ]);

        return $document->download("billets-{$order->reference}.pdf");
    }
}
