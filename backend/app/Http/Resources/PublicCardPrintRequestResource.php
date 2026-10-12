<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Vue publique d'une demande (page de suivi par jeton). N'expose que ce que le
 * demandeur peut voir : jamais les notes internes, l'assigné ou les e-mails
 * d'autrui. Le fil n'inclut que les étapes publiques (création, statut).
 */
class PublicCardPrintRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'reference'        => $this->reference,
            'status'           => $this->status,
            'quantity'         => $this->quantity,
            'delivery_address' => $this->delivery_address,
            'contact_name'     => $this->contact_name,
            'contact_company'  => $this->contact_company,
            'created_at'       => $this->created_at?->toIso8601String(),
            'timeline'         => $this->whenLoaded('events', fn () => $this->events
                ->whereIn('type', ['created', 'status'])
                ->map(fn ($e) => [
                    'message'    => $e->message,
                    'created_at' => $e->created_at?->toIso8601String(),
                ])->values()),
        ];
    }
}
