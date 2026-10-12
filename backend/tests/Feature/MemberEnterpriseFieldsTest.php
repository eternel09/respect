<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Champs entreprise du membre (fonction, service, matricule) : CRUD + export. */
class MemberEnterpriseFieldsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create([
            'organization_id' => Organization::factory()->create()->id, 'role' => 'admin',
        ]);
    }

    private function token(User $u): string
    {
        return $u->createToken('t')->plainTextToken;
    }

    public function test_member_can_be_created_with_enterprise_fields(): void
    {
        $token = $this->token($this->admin());

        $this->withToken($token)->postJson('/api/admin/members', [
            'first_name' => 'Awa', 'last_name' => 'Mbayo', 'phone' => '+243900000001',
            'job_title' => 'Infirmière', 'department' => 'Pédiatrie', 'staff_id' => 'MAT-0423',
        ])->assertCreated()
          ->assertJsonPath('member.job_title', 'Infirmière')
          ->assertJsonPath('member.department', 'Pédiatrie')
          ->assertJsonPath('member.staff_id', 'MAT-0423');

        $this->assertDatabaseHas('members', ['phone' => '+243900000001', 'staff_id' => 'MAT-0423']);
    }

    public function test_enterprise_fields_are_optional(): void
    {
        $token = $this->token($this->admin());

        $this->withToken($token)->postJson('/api/admin/members', [
            'first_name' => 'Jean', 'last_name' => 'Kuba', 'phone' => '+243900000002',
        ])->assertCreated()->assertJsonPath('member.job_title', null);
    }

    public function test_member_can_be_updated(): void
    {
        $admin = $this->admin();
        $member = Member::factory()->create(['organization_id' => $admin->organization_id]);

        $this->withToken($this->token($admin))->patchJson("/api/admin/members/{$member->id}", [
            'first_name' => $member->first_name, 'last_name' => $member->last_name, 'phone' => $member->phone,
            'job_title' => 'Chef de service', 'department' => 'Logistique', 'staff_id' => 'MAT-0999',
        ])->assertOk()->assertJsonPath('member.job_title', 'Chef de service');

        $this->assertSame('MAT-0999', $member->fresh()->staff_id);
    }

    public function test_cannot_update_a_member_of_another_organization(): void
    {
        $admin = $this->admin();
        $other = Member::factory()->create(['organization_id' => Organization::factory()->create()->id]);

        // Global scope multi-tenant → le membre d'une autre org est invisible (404).
        $this->withToken($this->token($admin))->patchJson("/api/admin/members/{$other->id}", [
            'first_name' => 'X', 'last_name' => 'Y', 'phone' => '+243900000003',
        ])->assertNotFound();
    }

    public function test_members_export_is_csv_with_enterprise_columns(): void
    {
        $admin = $this->admin();
        Member::factory()->create([
            'organization_id' => $admin->organization_id,
            'first_name' => 'Awa', 'last_name' => 'Mbayo',
            'job_title' => 'Infirmière', 'department' => 'Pédiatrie', 'staff_id' => 'MAT-0423',
        ]);

        $res = $this->withToken($this->token($admin))->get('/api/admin/members/export');

        $res->assertOk();
        $this->assertStringContainsString('text/csv', $res->headers->get('content-type'));
        $body = $res->streamedContent();
        $this->assertStringContainsString('Fonction', $body);   // en-tête
        $this->assertStringContainsString('MAT-0423', $body);   // matricule
        $this->assertStringContainsString('Pédiatrie', $body);
    }
}
