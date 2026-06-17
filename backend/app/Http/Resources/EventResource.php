<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'type'             => $this->type,
            'date'             => $this->date->toDateString(),
            'description'      => $this->description,
            'attendance_count' => $this->whenCounted('attendances'),
            'created_at'       => $this->created_at->toDateTimeString(),
        ];
    }
}
