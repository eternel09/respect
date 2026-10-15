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
            'reference'        => $this->reference,
            'source'           => $this->source,
            'organization'     => $this->whenLoaded('organization', fn () => $this->organization ? [
                'id' => $this->organization->id, 'name' => $this->organization->name,
            ] : null),
            'requested_by'     => $this->whenLoaded('requester', fn () => $this->requester?->name),
            // Contact porté par la demande (prospect public sans compte).
            'contact'          => array_filter([
                'name'    => $this->contact_name,
                'company' => $this->contact_company,
                'email'   => $this->contact_email,
                'phone'   => $this->contact_phone,
            ], fn ($v) => $v !== null) ?: null,
            'quantity'         => $this->quantity,
            // Liste du personnel jointe (le détail : endpoint dédié) et vocabulaire choisi.
            'staff_count'      => count($this->staff ?? []),
            'member_term'      => $this->member_term,
            'note'             => $this->note,
            'delivery_address' => $this->delivery_address,
            'status'           => $this->status,
            'assigned_to'      => $this->whenLoaded('assignee', fn () => $this->assignee?->name),
            'handled_at'       => $this->handled_at?->toIso8601String(),
            'created_at'       => $this->created_at?->toIso8601String(),
        ];
    }
}
