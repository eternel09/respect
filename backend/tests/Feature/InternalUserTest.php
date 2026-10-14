<?php

namespace Tests\Feature;

use App\Models\CardPrintRequest;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/** Gestion de l'équipe plateforme (utilisateurs internes : super-admin + opérateur). */
class InternalUserTest extends TestCase
{
    use RefreshDatabase;

    private function internal(string $role = 'super_admin'): User
    {
        return User::factory()->create(['organization_id' => null, 'role' => $role]);
    }

    private function token(User $u): string
    {
        $this->app['auth']->forgetGuards(); // chaque appel teste bien SON rôle

        return $u->createToken('t')->plainTextToken;
    }

    // ── Accès ───────────────────────────────────────────────────

    public function test_super_admin_lists_internal_users(): void
    {
        $su = $this->internal('super_admin');
        $this->internal('operator');
        // Un admin d'organisation ne doit PAS apparaître dans l'équipe interne.
        User::factory()->create(['organization_id' => Organization::factory()->create()->id, 'role' => 'admin']);

        $this->withToken($this->token($su))->getJson('/api/admin/internal-users')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_operator_and_org_admin_cannot_manage_team(): void
    {
        $op = $this->internal('operator');
        $admin = User::factory()->create(['organization_id' => Organization::factory()->create()->id, 'role' => 'admin']);

        $this->withToken($this->token($op))->getJson('/api/admin/internal-users')->assertForbidden();
        $this->withToken($this->token($admin))->getJson('/api/admin/internal-users')->assertForbidden();
    }

    // ── Création ────────────────────────────────────────────────

    public function test_super_admin_creates_an_operator_with_generated_password(): void
    {
        $su = $this->internal('super_admin');

        $res = $this->withToken($this->token($su))
            ->postJson('/api/admin/internal-users', [
                'name' => 'Jean Ops', 'email' => 'jean@equipe.cd', 'role' => 'operator',
            ])
            ->assertCreated()
            ->assertJsonPath('user.role', 'operator')
            ->assertJson(fn ($j) => $j->where('temp_password', fn ($v) => is_string($v) && strlen($v) >= 8)->etc());

        $this->assertDatabaseHas('users', ['email' => 'jean@equipe.cd', 'role' => 'operator', 'organization_id' => null]);
        // Le mot de passe généré est bien celui enregistré (donc utilisable pour se connecter).
        $created = User::where('email', 'jean@equipe.cd')->firstOrFail();
        $this->assertTrue(Hash::check($res->json('temp_password'), $created->password));
    }

    public function test_create_validates_role_and_unique_email(): void
    {
        $su = $this->internal('super_admin');
        $token = $this->token($su);

        $this->withToken($token)->postJson('/api/admin/internal-users', [
            'name' => 'X', 'email' => 'x@equipe.cd', 'role' => 'admin', // rôle non interne
        ])->assertStatus(422);

        $this->withToken($token)->postJson('/api/admin/internal-users', [
            'name' => 'Dup', 'email' => $su->email, 'role' => 'operator', // email déjà pris
        ])->assertStatus(422);
    }

    // ── Modification / garde-fous ───────────────────────────────

    public function test_super_admin_updates_role_but_not_own(): void
    {
        $su = $this->internal('super_admin');
        $op = $this->internal('operator');
        $token = $this->token($su);

        $this->withToken($token)->patchJson("/api/admin/internal-users/{$op->id}", [
            'name' => $op->name, 'email' => $op->email, 'role' => 'super_admin',
        ])->assertOk()->assertJsonPath('user.role', 'super_admin');

        // On ne modifie pas son propre rôle.
        $this->withToken($token)->patchJson("/api/admin/internal-users/{$su->id}", [
            'name' => $su->name, 'email' => $su->email, 'role' => 'operator',
        ])->assertStatus(422);
    }

    public function test_super_admin_can_delete_another_internal_user(): void
    {
        $su = $this->internal('super_admin');
        $op = $this->internal('operator');

        $this->withToken($this->token($su))->deleteJson("/api/admin/internal-users/{$op->id}")
            ->assertOk();
        $this->assertDatabaseMissing('users', ['id' => $op->id]);
    }

    public function test_cannot_delete_self(): void
    {
        $su = $this->internal('super_admin');
        $this->internal('super_admin'); // garantit qu'il n'est pas le dernier

        $this->withToken($this->token($su))->deleteJson("/api/admin/internal-users/{$su->id}")
            ->assertStatus(422);
    }

    public function test_reset_password_returns_temp_and_updates_hash(): void
    {
        $su = $this->internal('super_admin');
        $op = $this->internal('operator');

        $res = $this->withToken($this->token($su))
            ->postJson("/api/admin/internal-users/{$op->id}/password", [])
            ->assertOk()
            ->assertJson(fn ($j) => $j->where('temp_password', fn ($v) => is_string($v))->etc());

        $this->assertTrue(Hash::check($res->json('temp_password'), $op->fresh()->password));
    }

    public function test_cannot_manage_an_org_user_through_this_endpoint(): void
    {
        $su = $this->internal('super_admin');
        $orgUser = User::factory()->create(['organization_id' => Organization::factory()->create()->id, 'role' => 'admin']);

        $this->withToken($this->token($su))->patchJson("/api/admin/internal-users/{$orgUser->id}", [
            'name' => 'X', 'email' => 'x@y.cd', 'role' => 'operator',
        ])->assertNotFound();
    }

    // ── L'opérateur accède bien à la file des demandes ──────────

    public function test_operator_can_access_print_request_queue(): void
    {
        CardPrintRequest::create(['source' => 'public', 'contact_name' => 'A', 'contact_email' => 'a@a.cd', 'quantity' => 5, 'status' => 'pending']);
        $op = $this->internal('operator');

        $this->withToken($this->token($op))->getJson('/api/admin/print-requests')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }
}
