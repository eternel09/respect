<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CardPrintRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'organization'     => $this->whenLoaded('organization', fn () => [
                'id' => $this->organization->id, 'name' => $this->organization->name,
            ]),
            'requested_by'     => $this->whenLoaded('requester', fn () => $this->requester?->name),
            'quantity'         => $this->quantity,
            'note'             => $this->note,
            'delivery_address' => $this->delivery_address,
            'status'           => $this->status,
            'handled_at'       => $this->handled_at?->toIso8601String(),
            'created_at'       => $this->created_at?->toIso8601String(),
        ];
    }
}
