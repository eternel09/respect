<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Occasion;
use App\Models\OccasionTable;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Export PDF de la liste des invités contactés (groupés par table). */
class OccasionInvitedExportTest extends TestCase
{
    use RefreshDatabase;

    private function makeData(): array
    {
        $org = Organization::factory()->create();
        $admin = User::factory()->create(['organization_id' => $org->id, 'role' => 'admin']);
        $occasion = Occasion::create([
            'organization_id' => $org->id, 'name' => 'Mariage', 'type' => 'mariage',
            'date' => now()->addWeek()->toDateString(),
        ]);
        $table = OccasionTable::create(['organization_id' => $org->id, 'occasion_id' => $occasion->id, 'label' => '1', 'seats' => 8]);

        // 2 contactés (dont 1 avec table) + 1 non contacté (exclu).
        Guest::create(['organization_id' => $org->id, 'occasion_id' => $occasion->id, 'name' => 'Alice', 'phone' => '+243810000001', 'occasion_table_id' => $table->id, 'invite_status' => 'sent']);
        Guest::create(['organization_id' => $org->id, 'occasion_id' => $occasion->id, 'name' => 'Bob', 'phone' => '+243810000002', 'invite_status' => 'sent']);
        Guest::create(['organization_id' => $org->id, 'occasion_id' => $occasion->id, 'name' => 'Charlie', 'phone' => '+243810000003', 'invite_status' => 'pending']);

        return [$org, $admin, $occasion];
    }

    public function test_owner_downloads_a_pdf(): void
    {
        [, $admin, $occasion] = $this->makeData();
        $token = $admin->createToken('t')->plainTextToken;

        $res = $this->get("/api/download/occasions/{$occasion->id}/invited-guests?token={$token}");

        $res->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('content-type'));
        $this->assertStringContainsString('.pdf', (string) $res->headers->get('content-disposition'));
    }

    public function test_requires_a_token(): void
    {
        [, , $occasion] = $this->makeData();
        $this->get("/api/download/occasions/{$occasion->id}/invited-guests")->assertForbidden();
    }

    public function test_other_organization_is_forbidden(): void
    {
        [, , $occasion] = $this->makeData();
        $otherOrg = Organization::factory()->create();
        $outsider = User::factory()->create(['organization_id' => $otherOrg->id, 'role' => 'admin']);
        $token = $outsider->createToken('t')->plainTextToken;

        $this->get("/api/download/occasions/{$occasion->id}/invited-guests?token={$token}")->assertForbidden();
    }
}
