<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $sold = $this->soldCount();

        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'description' => $this->description,
            'price_cents' => $this->price_cents,
            'currency'    => $this->currency,
            'quota'       => $this->quota,
            'is_active'   => $this->is_active,
            'position'    => $this->position,
            'sold'        => $sold,
            'remaining'   => $this->quota === null ? null : max(0, $this->quota - $sold),
        ];
    }
}
