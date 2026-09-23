<?php

namespace App\Services\Payments;

/**
 * Résultat d'une tentative de paiement, indépendant du fournisseur.
 *  - status : 'pending' (à confirmer / en attente) ou 'paid' (déjà réglé).
 *  - instructions : message à afficher à l'acheteur (ex. « payez au guichet »,
 *    ou une consigne USSD Mobile Money).
 *  - redirectUrl : page de paiement hébergée par le fournisseur, s'il y en a une.
 *  - reference : identifiant de transaction côté fournisseur, s'il y en a un.
 */
class PaymentResult
{
    public function __construct(
        public readonly string $provider,
        public readonly string $status = 'pending',
        public readonly ?string $instructions = null,
        public readonly ?string $redirectUrl = null,
        public readonly ?string $reference = null,
    ) {
    }
}
