<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrganizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:150'],
            'theme_color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'logo'        => ['nullable', 'image', 'max:2048'], // 2 Mo
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'     => "Le nom de l'organisation est obligatoire.",
            'theme_color.regex' => 'La couleur doit être au format hexadécimal (#RRGGBB).',
            'logo.image'        => "Le logo doit être une image.",
            'logo.max'          => 'Le logo ne doit pas dépasser 2 Mo.',
        ];
    }
}
