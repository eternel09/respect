<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ScanOnboardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token'      => ['required', 'uuid'],
            'event_id'   => ['required', 'integer'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name'  => ['required', 'string', 'max:100'],
            // Optionnel sur le terrain — complétable plus tard au back-office.
            'phone'      => ['nullable', 'string', 'regex:/^\+?[0-9]{9,15}$/', 'unique:members,phone'],
        ];
    }

    public function messages(): array
    {
        return [
            'token.uuid'          => 'Badge invalide.',
            'first_name.required' => 'Le prénom est obligatoire.',
            'last_name.required'  => 'Le nom est obligatoire.',
            'phone.regex'         => 'Format de téléphone invalide.',
            'phone.unique'        => 'Ce numéro est déjà enregistré.',
        ];
    }
}
