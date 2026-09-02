<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Occasion;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * Gestion de l'équipe d'un événement : l'admin crée des comptes confinés à
 * l'occasion (rôle `scanner` pour l'accueil, `secretaire` pour la gestion des
 * invités). Ces comptes ne voient que leur événement (cf. ConfineEventAgent).
 */
class OccasionTeamController extends Controller
{
    /** Rôles délégables à un agent d'événement. */
    private const AGENT_ROLES = ['scanner', 'secretaire'];

    /** Liste des agents rattachés à l'occasion. */
    public function index(Occasion $occasion): JsonResponse
    {
        $agents = User::where('occasion_id', $occasion->id)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'created_at'])
            ->map(fn (User $u) => [
                'id'    => $u->id,
                'name'  => $u->name,
                'email' => $u->email,
                'role'  => $u->role,
            ]);

        return response()->json(['data' => $agents]);
    }

    /** Crée un agent confiné à l'occasion. */
    public function store(Request $request, Occasion $occasion): JsonResponse
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:6'],
            'role'     => ['required', Rule::in(self::AGENT_ROLES)],
        ]);

        $agent = User::create([
            'organization_id' => $occasion->organization_id,
            'occasion_id'     => $occasion->id,
            'name'            => $data['name'],
            'email'           => $data['email'],
            'password'        => Hash::make($data['password']),
            'role'            => $data['role'],
        ]);

        return response()->json([
            'id'    => $agent->id,
            'name'  => $agent->name,
            'email' => $agent->email,
            'role'  => $agent->role,
        ], 201);
    }

    /** Supprime un agent d'événement (uniquement un compte confiné). */
    public function destroy(User $user): JsonResponse
    {
        // Garde-fou : on ne supprime que des agents d'événement (jamais un
        // admin/secrétaire d'organisation via cet endpoint). Le scope global
        // BelongsToOrganization n'existe pas sur User, on borne donc à l'org
        // de l'admin courant.
        abort_unless($user->occasion_id !== null, 404, 'Agent introuvable.');
        abort_unless(
            $user->organization_id === request()->user()->organization_id,
            403,
            'Agent hors de votre organisation.'
        );

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Agent supprimé.']);
    }
}
