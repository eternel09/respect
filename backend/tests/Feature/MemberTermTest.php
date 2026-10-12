<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Vocabulaire du membre par organisation (membre / agent / employé). */
class MemberTermTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create([
            'organization_id' => Organization::factory()->create()->id, 'role' => 'admin',
        ]);
    }

    public function test_default_term_is_membre(): void
    {
        $admin = $this->admin();

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->getJson('/api/admin/organization')
            ->assertOk()
            ->assertJsonPath('member_term', 'membre');
    }

    public function test_admin_can_switch_term_to_agent(): void
    {
        $admin = $this->admin();
        $token = $admin->createToken('t')->plainTextToken;

        $this->withToken($token)->postJson('/api/admin/organization', [
            'name' => $admin->organization->name, 'member_term' => 'agent',
        ])->assertOk()->assertJsonPath('organization.member_term', 'agent');

        $this->assertSame('agent', $admin->organization->fresh()->member_term);

        // Exposé aussi dans le payload d'authentification.
        $this->withToken($token)->getJson('/api/admin/me')
            ->assertOk()->assertJsonPath('organization.member_term', 'agent');
    }

    public function test_unknown_term_is_rejected(): void
    {
        $admin = $this->admin();

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/admin/organization', [
                'name' => $admin->organization->name, 'member_term' => 'robot',
            ])->assertStatus(422);
    }
}
