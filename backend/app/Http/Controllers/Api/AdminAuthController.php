<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

class AdminAuthController extends Controller
{
    // Mot de passe choisi par l'utilisateur : 8 caractères, lettres et chiffres.
    private const PASSWORD_RULES = ['required', 'string', 'confirmed', 'min:8', 'max:100', 'regex:/[A-Za-z]/', 'regex:/[0-9]/'];

    // Messages en français (l'application n'a pas de traductions de validation).
    private const PASSWORD_MESSAGES = [
        'current_password.required' => 'Saisissez votre mot de passe actuel.',
        'password.required'  => 'Choisissez un nouveau mot de passe.',
        'password.confirmed' => 'Les deux mots de passe ne correspondent pas.',
        'password.min'       => 'Le mot de passe doit contenir au moins 8 caractères.',
        'password.max'       => 'Le mot de passe est trop long (100 caractères maximum).',
        'password.regex'     => 'Le mot de passe doit contenir au moins une lettre et un chiffre.',
        'email.required'     => 'Saisissez votre adresse e-mail.',
        'email.email'        => 'Adresse e-mail invalide.',
        'token.required'     => 'Lien incomplet : ouvrez le lien reçu par e-mail.',
    ];

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Vérification seule (pas d'ouverture de session) : l'API vit de jetons.
        if (! Auth::guard('web')->validate($credentials)) {
            return response()->json(['message' => 'Email ou mot de passe incorrect.'], 401);
        }

        $user = User::where('email', $credentials['email'])->firstOrFail();

        // Compte désactivé : le mot de passe est juste, mais l'accès est suspendu.
        if (! $user->is_active) {
            return response()->json(['message' => 'Ce compte est désactivé. Contactez votre administrateur.'], 403);
        }

        $user->forceFill(['last_login_at' => now()])->save();
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

    /**
     * Changement de son propre mot de passe (tout utilisateur connecté). Exigé à la
     * première connexion après un mot de passe temporaire. Les autres sessions
     * ouvertes sont fermées ; la session courante reste active.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => self::PASSWORD_RULES,
        ], self::PASSWORD_MESSAGES);

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Mot de passe actuel incorrect.',
                'errors'  => ['current_password' => ['Mot de passe actuel incorrect.']],
            ], 422);
        }
        if (Hash::check($data['password'], $user->password)) {
            return response()->json([
                'message' => 'Choisissez un mot de passe différent de l\'actuel.',
                'errors'  => ['password' => ['Choisissez un mot de passe différent de l\'actuel.']],
            ], 422);
        }

        $user->forceFill(['password' => $data['password'], 'must_change_password' => false])->save();
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return response()->json(['message' => 'Mot de passe modifié.', 'user' => $this->payload($user)]);
    }

    /**
     * Mot de passe oublié : envoie un lien de réinitialisation (valable 60 min).
     * Réponse identique que le compte existe ou non (pas d'énumération d'e-mails).
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']], self::PASSWORD_MESSAGES);

        $user = User::where('email', $data['email'])->first();
        if ($user && $user->is_active) {
            Password::broker()->sendResetLink(['email' => $user->email]);
        }

        return response()->json([
            'message' => 'Si un compte correspond à cette adresse, un lien de réinitialisation vient d\'y être envoyé.',
        ]);
    }

    /** Réinitialisation par le lien reçu : nouveau mot de passe, toutes les sessions fermées. */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token'    => ['required', 'string'],
            'email'    => ['required', 'email'],
            'password' => self::PASSWORD_RULES,
        ], self::PASSWORD_MESSAGES);

        $status = Password::broker()->reset($data, function (User $user, string $password) {
            $user->forceFill(['password' => $password, 'must_change_password' => false])->save();
            $user->tokens()->delete();
        });

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Lien invalide ou expiré. Refaites une demande de réinitialisation.',
            ], 422);
        }

        return response()->json(['message' => 'Mot de passe réinitialisé. Vous pouvez vous connecter.']);
    }

    private function payload(User $user): array
    {
        return [
            'id'           => $user->id,
            'name'         => $user->name,
            'email'        => $user->email,
            'role'         => $user->role,
            // Mot de passe temporaire : le front impose d'en choisir un avant tout.
            'must_change_password' => (bool) $user->must_change_password,
            // Agent confiné à un événement : le front/mobile s'y limite.
            'occasion_id'  => $user->occasion_id,
            'occasion'     => $user->occasion_id && $user->occasion
                ? ['id' => $user->occasion->id, 'name' => $user->occasion->name]
                : null,
            'organization' => $user->organization
                ? [
                    'id'      => $user->organization->id,
                    'name'    => $user->organization->name,
                    'member_term' => $user->organization->member_term,
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
