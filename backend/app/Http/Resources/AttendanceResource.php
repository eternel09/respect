<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'attended_date' => $this->attended_date->toDateString(),
            'created_at'    => $this->created_at->toDateTimeString(),
            'member'        => new MemberResource($this->whenLoaded('member')),
            'event'         => new EventResource($this->whenLoaded('event')),
        ];
    }
}
