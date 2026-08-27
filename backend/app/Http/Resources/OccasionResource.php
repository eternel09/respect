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
            'invitation_bg_url' => $this->invitationBgUrl(),
            'rsvp_video_url'    => $this->rsvpVideoUrl(),
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
