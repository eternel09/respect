<?php

namespace App\Services\Payments;

use InvalidArgumentException;

/**
 * Fabrique de passerelles : résout le driver configuré (config/payments.php).
 * Le code métier demande une PaymentGateway au manager sans connaître le
 * fournisseur concret.
 */
class PaymentManager
{
    /** Passerelle par défaut (config payments.default). */
    public function gateway(?string $name = null): PaymentGateway
    {
        $name ??= (string) config('payments.default', 'manual');
        $class = config("payments.drivers.{$name}");

        if (! $class || ! class_exists($class)) {
            throw new InvalidArgumentException("Passerelle de paiement inconnue : {$name}.");
        }

        return app($class);
    }
}
