<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'reference'    => $this->reference,
            'token'        => $this->token,
            'buyer_name'   => $this->buyer_name,
            'buyer_email'  => $this->buyer_email,
            'buyer_phone'  => $this->buyer_phone,
            'status'       => $this->status,
            'currency'     => $this->currency,
            'total_cents'  => $this->total_cents,
            'payment_provider' => $this->payment_provider,
            'paid_at'      => $this->paid_at?->toIso8601String(),
            'created_at'   => $this->created_at?->toIso8601String(),
            'tickets_count' => $this->whenCounted('tickets'),
            'tickets'      => TicketResource::collection($this->whenLoaded('tickets')),
        ];
    }
}
