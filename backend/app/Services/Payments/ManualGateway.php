<?php

namespace App\Services\Payments;

use App\Models\TicketOrder;

/**
 * Driver « manuel » : aucun paiement en ligne. La commande reste en attente
 * jusqu'à ce que l'organisateur la marque comme payée (paiement au guichet,
 * virement, Mobile Money reçu à la main…). C'est le driver par défaut tant
 * qu'aucun agrégateur n'est branché.
 */
class ManualGateway implements PaymentGateway
{
    public function key(): string
    {
        return 'manual';
    }

    public function initiate(TicketOrder $order): PaymentResult
    {
        return new PaymentResult(
            provider: $this->key(),
            status: 'pending',
            instructions: 'Votre commande est réservée. Le paiement sera confirmé '
                . "par l'organisateur ; vos billets seront alors disponibles.",
        );
    }
}
