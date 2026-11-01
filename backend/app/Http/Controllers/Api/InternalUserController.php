<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\InternalUserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Gestion de l'équipe plateforme (utilisateurs internes, sans organisation).
 * Réservé au super-admin. Deux rôles internes :
 *  - super_admin : pleins pouvoirs (organisations, équipe, demandes…)
 *  - operator    : traite les demandes d'impression, sans gérer organisations/équipe.
 */
class InternalUserController extends Controller
{
    private const ROLES = ['super_admin', 'operator'];

    public function index(): JsonResponse
    {
        $users = User::whereNull('organization_id')
            ->whereIn('role', self::ROLES)
            ->orderBy('name')->get();

        return response()->json(['data' => InternalUserResource::collection($users)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:150'],
            'email'    => ['required', 'email', 'max:150', 'unique:users,email'],
            'role'     => ['required', Rule::in(self::ROLES)],
            'password' => ['nullable', 'string', 'min:8', 'max:100'],
        ]);

        // Mot de passe fourni, ou temporaire généré (affiché une seule fois).
        $plain = $data['password'] ?? Str::password(14);

        $user = User::create([
            'organization_id' => null,
            'name'            => $data['name'],
            'email'           => $data['email'],
            'role'            => $data['role'],
            'password'        => Hash::make($plain),
            // Mot de passe communiqué par un tiers : l'intéressé en choisit un à la 1re connexion.
            'must_change_password' => true,
        ]);

        return response()->json([
            'message'   => 'Utilisateur interne créé.',
            'user'      => new InternalUserResource($user),
            // Transmis une fois au super-admin pour communication à l'intéressé.
            'temp_password' => $data['password'] ?? $plain,
        ], 201);
    }

    public function update(User $user, Request $request): JsonResponse
    {
        $this->ensureInternal($user);

        $data = $request->validate([
            'name'  => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'role'  => ['required', Rule::in(self::ROLES)],
        ]);

        // On ne modifie pas son propre rôle (risque de se verrouiller soi-même).
        if ($user->id === $request->user()->id && $data['role'] !== $user->role) {
            abort(422, 'Vous ne pouvez pas modifier votre propre rôle.');
        }

        // On garde toujours au moins un super-admin actif.
        if ($user->role === 'super_admin' && $data['role'] !== 'super_admin' && $this->lastSuperAdmin($user)) {
            abort(422, 'Impossible : il doit rester au moins un super-admin.');
        }

        $user->update($data);

        return response()->json([
            'message' => 'Utilisateur mis à jour.',
            'user'    => new InternalUserResource($user),
        ]);
    }

    public function resetPassword(User $user, Request $request): JsonResponse
    {
        $this->ensureInternal($user);

        $data = $request->validate([
            'password' => ['nullable', 'string', 'min:8', 'max:100'],
        ]);

        $plain = $data['password'] ?? Str::password(14);
        $user->forceFill(['password' => Hash::make($plain), 'must_change_password' => true])->save();
        $user->tokens()->delete(); // les sessions ouvertes avec l'ancien mot de passe sont fermées

        return response()->json([
            'message'       => 'Mot de passe réinitialisé.',
            'temp_password' => $plain,
        ]);
    }

    /**
     * Désactiver / réactiver un compte sans le supprimer (historique conservé).
     * Un compte désactivé ne peut plus se connecter et ses sessions sont fermées.
     */
    public function setActive(User $user, Request $request): JsonResponse
    {
        $this->ensureInternal($user);

        $data = $request->validate(['active' => ['required', 'boolean']]);

        if (! $data['active']) {
            if ($user->id === $request->user()->id) {
                abort(422, 'Vous ne pouvez pas désactiver votre propre compte.');
            }
            if ($user->role === 'super_admin' && $this->lastSuperAdmin($user)) {
                abort(422, 'Impossible : il doit rester au moins un super-admin actif.');
            }
            $user->tokens()->delete();
        }

        $user->forceFill(['is_active' => $data['active']])->save();

        return response()->json([
            'message' => $data['active'] ? 'Compte réactivé.' : 'Compte désactivé.',
            'user'    => new InternalUserResource($user),
        ]);
    }

    public function destroy(User $user, Request $request): JsonResponse
    {
        $this->ensureInternal($user);

        if ($user->id === $request->user()->id) {
            abort(422, 'Vous ne pouvez pas supprimer votre propre compte.');
        }

        if ($user->role === 'super_admin' && $this->lastSuperAdmin($user)) {
            abort(422, 'Impossible : il doit rester au moins un super-admin.');
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }

    /** La page ne gère que les utilisateurs internes (sans organisation). */
    private function ensureInternal(User $user): void
    {
        abort_unless($user->isInternal() && in_array($user->role, self::ROLES, true), 404, 'Utilisateur interne introuvable.');
    }

    /** Vrai si $user est le dernier super-admin actif restant. */
    private function lastSuperAdmin(User $user): bool
    {
        return User::whereNull('organization_id')->where('role', 'super_admin')->where('is_active', true)
            ->where('id', '!=', $user->id)->doesntExist();
    }
}
