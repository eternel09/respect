<?php

namespace App\Services\Payments;

use App\Models\TicketOrder;

/**
 * Contrat d'une passerelle de paiement. Un vrai agrégateur (Mobile Money,
 * carte…) implémente cette interface ; le reste de l'application ne dépend que
 * d'elle. Ajouter un fournisseur = une nouvelle classe + une entrée dans
 * config/payments.php, sans rien changer aux contrôleurs.
 */
interface PaymentGateway
{
    /** Clé courte du fournisseur (ex. « manual », « cinetpay »). */
    public function key(): string;

    /** Démarre le paiement d'une commande et renvoie de quoi guider l'acheteur. */
    public function initiate(TicketOrder $order): PaymentResult;
}
