<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TicketOrder;
use App\Services\TicketPdfService;
use Illuminate\Http\Response;

/**
 * E-billets PDF d'une commande payée. Accès public par le jeton de la commande
 * (?token dans l'URL) : l'acheteur télécharge sans compte, comme les badges.
 */
class TicketExportController extends Controller
{
    public function orderTickets(string $token, TicketPdfService $pdf): Response
    {
        $order = TicketOrder::where('token', $token)->first();
        abort_unless($order, 404, 'Commande introuvable.');
        abort_unless($order->status === 'paid', 403, 'Les billets seront disponibles une fois le paiement confirmé.');

        return response($pdf->render($order), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $pdf->filename($order) . '"',
        ]);
    }
}
