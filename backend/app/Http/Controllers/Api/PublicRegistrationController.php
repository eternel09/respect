<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Auto-inscription publique : un organisateur crée son propre espace et choisit
 * les modules (applications) qu'il active. Le compte créé est l'admin de l'org.
 */
class PublicRegistrationController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $moduleKeys = array_keys(config('modules.catalog'));

        $data = $request->validate([
            'organization_name' => ['required', 'string', 'max:120'],
            'name'              => ['required', 'string', 'max:120'],
            'email'             => ['required', 'email', 'max:180', Rule::unique('users', 'email')],
            'password'          => ['required', 'string', 'min:8', 'confirmed'],
            'modules'           => ['required', 'array', 'min:1'],
            'modules.*'         => ['string', Rule::in($moduleKeys)],
        ], [
            'email.unique'   => 'Un compte existe déjà avec cet email.',
            'modules.min'    => 'Choisissez au moins une application.',
        ]);

        // Respecte l'ordre du catalogue pour une navigation stable.
        $modules = array_values(array_filter($moduleKeys, fn ($k) => in_array($k, $data['modules'], true)));

        [$org, $admin] = DB::transaction(function () use ($data, $modules) {
            $org = Organization::create([
                'name'    => $data['organization_name'],
                'slug'    => $this->uniqueSlug($data['organization_name']),
                'plan'    => 'free',
                'modules' => $modules,
            ]);

            $admin = User::create([
                'organization_id' => $org->id,
                'name'            => $data['name'],
                'email'           => $data['email'],
                'password'        => Hash::make($data['password']),
                'role'            => 'admin',
            ]);

            return [$org, $admin];
        });

        $token = $admin->createToken('admin-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'           => $admin->id,
                'name'         => $admin->name,
                'email'        => $admin->email,
                'role'         => $admin->role,
                'organization' => [
                    'id'      => $org->id,
                    'name'    => $org->name,
                    'modules' => $org->enabledModules(),
                ],
            ],
        ], 201);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'org';
        $slug = $base;
        $i = 2;
        while (Organization::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }
        return $slug;
    }
}
