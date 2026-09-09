<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OccasionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'name'            => $this->name,
            'type'            => $this->type,
            'date'            => $this->date->toDateString(),
            'starts_at'       => $this->starts_at?->toIso8601String(),
            'ends_at'         => $this->ends_at?->toIso8601String(),
            'location'          => $this->location,
            'description'       => $this->description,
            'invitation_message' => $this->invitation_message,
            'invitation_bg_url' => $this->invitationBgUrl(),
            'invitation_is_pdf' => $this->invitationIsPdf(),
            'rsvp_video_url'    => $this->rsvpVideoUrl(),
            // Un envoi groupé est-il en cours ? (verrou frais, non périmé) —
            // permet d'afficher le bouton « Stopper » même après rechargement.
            'invites_sending'   => $this->invites_sending_at !== null
                && $this->invites_sending_at->greaterThan(now()->subMinutes(10)),
            'is_expired'        => $this->isExpired(),
            'guests_count'    => $this->whenCounted('guests'),
            'tables_count'    => $this->whenCounted('tables'),
            'invited_count'   => $this->whenCounted('invited_count'),
            'confirmed_count' => $this->whenCounted('confirmed_count'),
            'checked_in_count' => $this->whenCounted('checked_in_count'),
            'created_at'      => $this->created_at->toDateTimeString(),
        ];
    }
}
