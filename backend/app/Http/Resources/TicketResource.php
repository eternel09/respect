<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'type_name'       => $this->type_name,
            'unit_price_cents' => $this->unit_price_cents,
            'token'           => $this->token,
            'holder_name'     => $this->holder_name,
            'status'          => $this->status,
            'checked_in_at'   => $this->checked_in_at?->toIso8601String(),
        ];
    }
}
