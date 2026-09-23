<?php

namespace App\Services;

use App\Jobs\DeliverOrderTicketsJob;
use App\Models\Occasion;
use App\Models\Ticket;
use App\Models\TicketOrder;
use App\Models\TicketType;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Cycle de vie d'une commande de billets : création avec réservation des places
 * (contrôle de quota anti-survente), confirmation de paiement, annulation.
 */
class TicketOrderService
{
    /**
     * Crée une commande « en attente » et réserve immédiatement les billets
     * (chacun avec son QR). La réservation compte dans le quota : deux achats
     * simultanés ne peuvent pas dépasser le nombre de places (verrou par
     * catégorie). $items : [['ticket_type_id'=>int,'quantity'=>int,'holder_names'=>[]], …].
     */
    public function create(Occasion $occasion, array $buyer, array $items, ?int $createdBy = null): TicketOrder
    {
        return DB::transaction(function () use ($occasion, $buyer, $items, $createdBy) {
            $order = TicketOrder::create([
                'organization_id' => $occasion->organization_id,
                'occasion_id'     => $occasion->id,
                'buyer_name'      => $buyer['buyer_name'],
                'buyer_email'     => $buyer['buyer_email'] ?? null,
                'buyer_phone'     => $buyer['buyer_phone'] ?? null,
                'status'          => 'pending',
                'currency'        => 'CDF',
                'total_cents'     => 0,
                'created_by'      => $createdBy,
            ]);

            $total = 0;
            $currency = null;

            foreach ($items as $item) {
                $qty = (int) ($item['quantity'] ?? 0);
                if ($qty < 1) {
                    continue;
                }

                // Verrou de la catégorie : sérialise les réservations concurrentes
                // sur la même catégorie → le contrôle de quota est fiable.
                $type = TicketType::whereKey($item['ticket_type_id'])
                    ->where('occasion_id', $occasion->id)
                    ->lockForUpdate()
                    ->first();

                if (! $type || ! $type->is_active) {
                    throw ValidationException::withMessages(['items' => 'Catégorie de billet indisponible.']);
                }
                if (! $type->canSell($qty)) {
                    $left = $type->remaining();
                    throw ValidationException::withMessages([
                        'items' => "Plus assez de places pour « {$type->name} » (reste {$left}).",
                    ]);
                }

                $currency ??= $type->currency;
                $holders = $item['holder_names'] ?? [];

                for ($i = 0; $i < $qty; $i++) {
                    Ticket::create([
                        'organization_id' => $occasion->organization_id,
                        'occasion_id'     => $occasion->id,
                        'ticket_order_id' => $order->id,
                        'ticket_type_id'  => $type->id,
                        'type_name'       => $type->name,
                        'unit_price_cents' => $type->price_cents,
                        'holder_name'     => $holders[$i] ?? null,
                        'status'          => 'valid',
                    ]);
                    $total += $type->price_cents;
                }
            }

            if ($order->tickets()->count() === 0) {
                throw ValidationException::withMessages(['items' => 'Sélectionnez au moins un billet.']);
            }

            $order->update(['currency' => $currency ?? 'CDF', 'total_cents' => $total]);

            return $order->fresh('tickets');
        });
    }

    /** Confirme le paiement : la commande passe « payée », les billets deviennent valables. */
    public function markPaid(TicketOrder $order, ?string $provider = null, ?string $reference = null): TicketOrder
    {
        if ($order->status === 'paid') {
            return $order;
        }
        if ($order->status === 'cancelled') {
            throw ValidationException::withMessages(['status' => 'Commande annulée : impossible de la marquer payée.']);
        }

        $order->update([
            'status'            => 'paid',
            'paid_at'           => now(),
            'payment_provider'  => $provider ?? $order->payment_provider,
            'payment_reference' => $reference ?? $order->payment_reference,
        ]);

        // Livraison automatique des e-billets (async selon QUEUE_CONNECTION).
        DeliverOrderTicketsJob::dispatch($order->id);

        return $order;
    }

    /** Annule la commande et libère les places (les billets deviennent « void »). */
    public function cancel(TicketOrder $order): TicketOrder
    {
        if ($order->status === 'cancelled') {
            return $order;
        }

        DB::transaction(function () use ($order) {
            $order->tickets()->update(['status' => 'void']);
            $order->update(['status' => 'cancelled']);
        });

        return $order;
    }
}
