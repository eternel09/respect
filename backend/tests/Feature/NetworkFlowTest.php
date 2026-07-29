<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Test end-to-end du flow hiérarchie / réseau (fonctionnalité récente, non
 * couverte jusqu'ici) : auto-inscription d'une organisation mère, provisionnement
 * d'une sous-organisation, consolidation des statistiques réseau, isolation
 * multi-tenant, garde-fous, et lien d'invitation public.
 */
class NetworkFlowTest extends TestCase
{
    use RefreshDatabase;

    /** Inscrit une organisation mère + admin, renvoie [token, orgId]. */
    private function registerParent(string $email = 'pasteur@eglise.cd'): array
    {
        $res = $this->postJson('/api/register', [
            'organization_name'     => 'Église Centrale',
            'name'                  => 'Pasteur Paul',
            'email'                 => $email,
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'modules'               => ['presence'],
        ])->assertStatus(201);

        return [$res->json('token'), $res->json('user.organization.id')];
    }

    public function test_full_flow_registration_to_consolidated_stats(): void
    {
        // 1) Auto-inscription de l'organisation mère + son admin.
        [$parentToken, $parentOrgId] = $this->registerParent();
        $this->assertSame(['presence'], $this->getJson('/api/admin/me', $this->bearer($parentToken))->json('organization.modules'));

        // 2) L'admin mère provisionne une sous-organisation + son admin.
        $sub = $this->api($parentToken)->postJson('/api/admin/sub-organizations', [
            'name'        => 'Paroisse Limete',
            'admin_name'  => 'Diacre Jean',
            'admin_email' => 'jean@limete.cd',
        ])->assertStatus(201);

        $childOrgId   = $sub->json('organization.id');
        $tempPassword = $sub->json('temp_password');
        $this->assertNotEmpty($tempPassword);

        // 3) L'admin de la sous-organisation est bien provisionné avec le mot de passe
        //    temporaire (vérifié via le hash stocké) et obtient un jeton d'accès.
        //    (La connexion elle-même est couverte par AdminAuthTest.)
        $childAdmin = User::where('email', 'jean@limete.cd')->firstOrFail();
        $this->assertSame($childOrgId, $childAdmin->organization_id);
        $this->assertTrue(Hash::check($tempPassword, $childAdmin->password));
        $childToken = $childAdmin->createToken('test')->plainTextToken;

        // 4) Membres : 5 dans la mère, 3 dans la sous-organisation.
        Member::factory(5)->create(['organization_id' => $parentOrgId]);
        Member::factory(3)->create(['organization_id' => $childOrgId]);

        // 5) L'admin mère lit la vue réseau consolidée : 8 membres, 1 sous-organisation.
        $net = $this->api($parentToken)->getJson('/api/admin/network')->assertStatus(200);
        $net->assertJsonPath('headline.total_members', 8);
        $net->assertJsonPath('headline.organizations', 1);
        $net->assertJsonFragment(['name' => 'Paroisse Limete', 'members' => 3]);
        $net->assertJsonFragment(['name' => 'Église Centrale', 'is_parent' => true, 'members' => 5]);

        // 6) Isolation : la sous-organisation ne voit que ses 3 membres…
        $this->api($childToken)->getJson('/api/admin/members')
            ->assertStatus(200)->assertJsonCount(3, 'data');
        // …la mère voit tout le sous-arbre (8).
        $this->api($parentToken)->getJson('/api/admin/members')
            ->assertStatus(200)->assertJsonCount(8, 'data');

        // 7) La sous-organisation n'a pas de réseau → 403 sur /admin/network.
        $this->api($childToken)->getJson('/api/admin/network')->assertStatus(403);

        // 8) Garde-fou 2 niveaux : une sous-organisation ne provisionne pas d'enfants → 422.
        $this->api($childToken)->postJson('/api/admin/sub-organizations', [
            'name'        => 'Sous-sous-org',
            'admin_name'  => 'X',
            'admin_email' => 'x@x.cd',
        ])->assertStatus(422);
    }

    public function test_network_invite_link_creates_attached_sub_organization(): void
    {
        [$parentToken] = $this->registerParent();

        // La mère génère un lien d'invitation.
        $token = $this->api($parentToken)
            ->postJson('/api/admin/sub-organizations/invite')
            ->assertStatus(200)->json('invite_token');
        $this->assertNotEmpty($token);

        // La page publique résout le nom de la mère.
        $this->getJson("/api/register/network/{$token}")
            ->assertStatus(200)
            ->assertJsonPath('organization.name', 'Église Centrale');

        // Auto-inscription publique d'une sous-organisation via le jeton.
        $join = $this->postJson("/api/register/network/{$token}", [
            'organization_name'     => 'Paroisse Masina',
            'name'                  => 'Responsable Grâce',
            'email'                 => 'grace@masina.cd',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(201);

        // La sous-organisation est rattachée et hérite des modules de la mère.
        $join->assertJsonPath('user.organization.modules', ['presence']);
        $join->assertJsonPath('user.organization.can_manage_network', false);

        // Côté mère, le réseau compte désormais une sous-organisation.
        $this->api($parentToken)->getJson('/api/admin/network')
            ->assertStatus(200)->assertJsonPath('headline.organizations', 1);

        // Jeton invalide → 404.
        $this->getJson('/api/register/network/mauvais-jeton')->assertStatus(404);
    }

    public function test_registration_rejects_modules_absent_from_catalog(): void
    {
        // Le module « occasions » a été retiré du catalogue : l'inscription le refuse.
        $this->postJson('/api/register', [
            'organization_name'     => 'Test Occasions',
            'name'                  => 'Org',
            'email'                 => 'occ@test.cd',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'modules'               => ['occasions'],
        ])->assertStatus(422)->assertJsonValidationErrors('modules.0');

        // « presence » reste accepté.
        $this->postJson('/api/register', [
            'organization_name'     => 'Test Presence',
            'name'                  => 'Org',
            'email'                 => 'pre@test.cd',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'modules'               => ['presence'],
        ])->assertStatus(201);
    }

    /** En-têtes d'auth Bearer pour les appels utilitaires (getJson avec headers). */
    private function bearer(string $token): array
    {
        return ['Authorization' => "Bearer {$token}"];
    }

    /**
     * Requête authentifiée par jeton. On oublie les guards résolus au préalable :
     * en test, plusieurs requêtes tournent dans le même process et le guard
     * mettrait en cache l'utilisateur d'une requête précédente (en HTTP réel,
     * chaque requête est isolée). Indispensable quand le test enchaîne des appels
     * sous des utilisateurs différents (mère / sous-organisation).
     */
    private function api(string $token)
    {
        $this->app['auth']->forgetGuards();
        return $this->withToken($token);
    }
}
