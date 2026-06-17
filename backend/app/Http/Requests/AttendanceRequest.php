<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class AttendanceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'phone'    => ['required', 'string', 'regex:/^\+?[0-9]{9,15}$/'],
            'event_id' => ['required', 'integer', 'exists:events,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.required'      => 'Le numéro de téléphone est obligatoire.',
            'phone.regex'         => 'Le format du numéro de téléphone est invalide.',
            'event_id.required'   => "L'identifiant de l'événement est obligatoire.",
            'event_id.exists'     => "L'événement sélectionné n'existe pas.",
        ];
    }
}
