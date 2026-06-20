<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ScanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token'    => ['required', 'uuid'],
            'event_id' => ['required', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'token.required'    => 'Le jeton du badge est obligatoire.',
            'token.uuid'        => 'Le format du badge est invalide.',
            'event_id.required' => "L'identifiant de l'événement est obligatoire.",
        ];
    }
}
