<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOccasionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:200'],
            'type'        => ['required', 'in:mariage,gala,ceremonie,anniversaire,concert,autre'],
            'date'        => ['required', 'date'],
            'starts_at'   => ['nullable', 'date'],
            'ends_at'     => ['nullable', 'date', 'after_or_equal:starts_at'],
            'location'    => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => "Le nom de l'événement est obligatoire.",
            'type.in'       => 'Type invalide.',
            'date.required' => 'La date est obligatoire.',
            'ends_at.after_or_equal' => 'La fin doit être après le début.',
        ];
    }
}
