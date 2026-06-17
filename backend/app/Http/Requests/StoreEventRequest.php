<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreEventRequest extends FormRequest
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
            'name'        => ['required', 'string', 'max:200'],
            'type'        => ['required', 'in:reunion,priere,autre'],
            'date'        => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => "Le nom de l'événement est obligatoire.",
            'type.required' => "Le type d'événement est obligatoire.",
            'type.in'       => "Le type doit être : reunion, priere ou autre.",
            'date.required' => "La date de l'événement est obligatoire.",
            'date.date'     => "Le format de la date est invalide.",
        ];
    }
}
