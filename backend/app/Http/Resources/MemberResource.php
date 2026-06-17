<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MemberResource extends JsonResource
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
            'first_name'       => $this->first_name,
            'last_name'        => $this->last_name,
            'full_name'        => $this->full_name,
            'phone'            => $this->phone,
            'sms_sent_at'      => $this->sms_sent_at?->toDateTimeString(),
            'attendance_count' => $this->whenCounted('attendances'),
            'created_at'       => $this->created_at->toDateTimeString(),
        ];
    }
}
