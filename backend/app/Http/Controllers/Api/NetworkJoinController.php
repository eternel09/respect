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
 * Auto-inscription d'une sous-organisation via le lien d'invitation d'une
 * organisation mère. Public : le responsable crée lui-même sa sous-organisation
 * (rattachée à la mère) et son compte admin.
 */
class NetworkJoinController extends Controller
{
    /** Résout le jeton → nom de l'organisation mère (pour l'écran d'accueil). */
    public function show(string $token): JsonResponse
    {
        $parent = $this->parentFromToken($token);

        return response()->json([
            'organization' => ['name' => $parent->name],
        ]);
    }

    /** Crée la sous-organisation + son admin sous la mère du jeton. */
    public function store(Request $request, string $token): JsonResponse
    {
        $parent = $this->parentFromToken($token);

        $data = $request->validate([
            'organization_name' => ['required', 'string', 'max:150'],
            'name'              => ['required', 'string', 'max:150'],
            'email'             => ['required', 'email', 'max:180', Rule::unique('users', 'email')],
            'password'          => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'email.unique' => 'Un compte existe déjà avec cet email.',
        ]);

        [$child, $admin] = DB::transaction(function () use ($data, $parent) {
            $child = Organization::create([
                'parent_id' => $parent->id,
                'name'      => $data['organization_name'],
                'slug'      => $this->uniqueSlug($data['organization_name']),
                'plan'      => $parent->plan,
                'modules'   => $parent->enabledModules(),
            ]);

            $admin = User::create([
                'organization_id' => $child->id,
                'name'            => $data['name'],
                'email'           => $data['email'],
                'password'        => Hash::make($data['password']),
                'role'            => 'admin',
            ]);

            return [$child, $admin];
        });

        // Auto-inscription : l'admin a choisi son mot de passe et est connecté
        // directement — aucun email d'identifiants à envoyer.
        $authToken = $admin->createToken('admin-token')->plainTextToken;

        return response()->json([
            'token' => $authToken,
            'user'  => [
                'id'           => $admin->id,
                'name'         => $admin->name,
                'email'        => $admin->email,
                'role'         => $admin->role,
                'organization' => [
                    'id'      => $child->id,
                    'name'    => $child->name,
                    'modules' => $child->enabledModules(),
                    'is_network_parent'  => false,
                    'can_manage_network' => false,
                ],
            ],
        ], 201);
    }

    /** Organisation mère valide pour ce jeton, ou 404. */
    private function parentFromToken(string $token): Organization
    {
        $parent = Organization::where('network_invite_token', $token)
            ->whereNull('parent_id')
            ->first();

        abort_if($parent === null, 404, 'Lien d’invitation invalide ou expiré.');

        return $parent;
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
