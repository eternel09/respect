<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ScanSyncRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'scans'              => ['required', 'array', 'min:1'],
            'scans.*.token'      => ['required', 'uuid'],
            'scans.*.event_id'   => ['required', 'integer'],
            'scans.*.scanned_at' => ['required', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'scans.required'          => 'Aucun scan à synchroniser.',
            'scans.*.token.uuid'      => 'Jeton de badge invalide.',
            'scans.*.scanned_at.date' => "Horodatage de scan invalide.",
        ];
    }
}
