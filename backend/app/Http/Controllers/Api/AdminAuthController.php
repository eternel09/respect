<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            return response()->json(['message' => 'Email ou mot de passe incorrect.'], 401);
        }

        $user  = Auth::user();
        $token = $user->createToken('admin-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $this->payload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->payload($request->user()));
    }

    private function payload(User $user): array
    {
        return [
            'id'           => $user->id,
            'name'         => $user->name,
            'email'        => $user->email,
            'role'         => $user->role,
            'organization' => $user->organization
                ? [
                    'id'      => $user->organization->id,
                    'name'    => $user->organization->name,
                    'modules' => $user->organization->enabledModules(),
                    // Chapeaute déjà des sous-organisations → la vue réseau a des données
                    'is_network_parent' => $user->organization->isNetworkParent(),
                    // Peut provisionner des sous-organisations : organisation de premier
                    // niveau (pas elle-même une sous-org) disposant du module présence.
                    'can_manage_network' => $user->organization->parent_id === null
                        && $user->organization->hasModule('presence'),
                ]
                : null,
        ];
    }
}
