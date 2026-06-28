<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrganizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:150'],
            'admin_name'  => ['required', 'string', 'max:150'],
            'admin_email' => ['required', 'email', 'max:150', 'unique:users,email'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'        => "Le nom de l'organisation est obligatoire.",
            'admin_name.required'  => "Le nom de l'administrateur est obligatoire.",
            'admin_email.required' => "L'email de l'administrateur est obligatoire.",
            'admin_email.email'    => "L'email de l'administrateur est invalide.",
            'admin_email.unique'   => "Cet email est déjà utilisé par un compte.",
        ];
    }
}
