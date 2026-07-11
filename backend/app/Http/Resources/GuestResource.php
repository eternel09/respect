<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'name'         => $this->name,
            'phone'        => $this->phone,
            'table'        => $this->whenLoaded('table', fn () => $this->table
                ? ['id' => $this->table->id, 'label' => $this->table->label] : null),
            'occasion_table_id' => $this->occasion_table_id,
            'invite_status' => $this->invite_status,
            'invited_at'   => $this->invited_at?->toIso8601String(),
            'confirmed'    => $this->confirmed_at !== null,
            'declined'     => $this->declined,
            'checked_in'   => $this->checked_in_at !== null,
            'checked_in_at' => $this->checked_in_at?->toIso8601String(),
        ];
    }
}
