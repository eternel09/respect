<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Agents d'événement : l'admin crée des comptes (accueil/scanner,
 * gestion/secrétaire) confinés à une occasion. Ces comptes ne peuvent
 * atteindre que leur événement (ConfineEventAgent).
 */
class OccasionTeamTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $admin;
    private Occasion $occasion;
    private Occasion $other;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create();
        $this->admin = User::factory()->create([
            'organization_id' => $this->org->id,
            'role'            => 'admin',
        ]);
        $this->occasion = Occasion::create([
            'organization_id' => $this->org->id,
            'name'            => 'Mariage Sarah & David',
            'type'            => 'mariage',
            'date'            => now()->addWeek()->toDateString(),
        ]);
        $this->other = Occasion::create([
            'organization_id' => $this->org->id,
            'name'            => 'Gala Annuel',
            'type'            => 'gala',
            'date'            => now()->addWeeks(2)->toDateString(),
        ]);
    }

    private function asUser(User $user)
    {
        return $this->withToken($user->createToken('test')->plainTextToken);
    }

    public function test_admin_creates_scanner_and_secretaire_agents(): void
    {
        $this->asUser($this->admin)
            ->postJson("/api/occasions/{$this->occasion->id}/team", [
                'name' => 'Agent Accueil', 'email' => 'accueil@ev.cd',
                'password' => 'secret123', 'role' => 'scanner',
            ])
            ->assertCreated()
            ->assertJsonPath('role', 'scanner');

        $this->asUser($this->admin)
            ->postJson("/api/occasions/{$this->occasion->id}/team", [
                'name' => 'Gestion Invités', 'email' => 'invites@ev.cd',
                'password' => 'secret123', 'role' => 'secretaire',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'accueil@ev.cd', 'occasion_id' => $this->occasion->id, 'role' => 'scanner',
        ]);

        $this->asUser($this->admin)
            ->getJson("/api/occasions/{$this->occasion->id}/team")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_agent_role_must_be_scanner_or_secretaire(): void
    {
        $this->asUser($this->admin)
            ->postJson("/api/occasions/{$this->occasion->id}/team", [
                'name' => 'X', 'email' => 'x@ev.cd', 'password' => 'secret123', 'role' => 'admin',
            ])
            ->assertStatus(422);
    }

    public function test_org_secretaire_cannot_create_agents(): void
    {
        $sec = User::factory()->create([
            'organization_id' => $this->org->id, 'role' => 'secretaire',
        ]);

        $this->asUser($sec)
            ->postJson("/api/occasions/{$this->occasion->id}/team", [
                'name' => 'X', 'email' => 'x@ev.cd', 'password' => 'secret123', 'role' => 'scanner',
            ])
            ->assertStatus(403);
    }

    public function test_scanner_agent_sees_only_its_occasion(): void
    {
        $agent = $this->makeAgent('scanner');

        $res = $this->asUser($agent)->getJson('/api/occasion-scan/occasions')->assertOk();
        $ids = collect($res->json('data'))->pluck('id')->all();

        $this->assertSame([$this->occasion->id], $ids);
    }

    public function test_event_agent_is_blocked_from_back_office(): void
    {
        $agent = $this->makeAgent('secretaire');

        // Back-office général → refusé même si le rôle secrétaire l'autoriserait.
        $this->asUser($agent)->getJson('/api/admin/dashboard')->assertStatus(403);
        $this->asUser($agent)->getJson('/api/admin/members')->assertStatus(403);
        $this->asUser($agent)->getJson('/api/occasions')->assertStatus(403);
    }

    public function test_secretaire_agent_manages_only_its_guests(): void
    {
        $agent = $this->makeAgent('secretaire');

        // Ajout d'invité à SON occasion → OK.
        $this->asUser($agent)
            ->postJson("/api/occasions/{$this->occasion->id}/guests", ['name' => 'Invité A'])
            ->assertCreated();

        // Ajout à une AUTRE occasion → refusé.
        $this->asUser($agent)
            ->postJson("/api/occasions/{$this->other->id}/guests", ['name' => 'Invité B'])
            ->assertStatus(403);

        // Modifier un invité d'une autre occasion → refusé.
        $foreign = Guest::create([
            'organization_id' => $this->org->id,
            'occasion_id'     => $this->other->id,
            'name'            => 'Étranger',
        ]);
        $this->asUser($agent)
            ->putJson("/api/guests/{$foreign->id}", ['name' => 'Hack'])
            ->assertStatus(403);
    }

    public function test_admin_deletes_event_agent(): void
    {
        $agent = $this->makeAgent('scanner');

        $this->asUser($this->admin)
            ->deleteJson("/api/occasion-team/{$agent->id}")
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $agent->id]);
    }

    private function makeAgent(string $role): User
    {
        return User::factory()->create([
            'organization_id' => $this->org->id,
            'occasion_id'     => $this->occasion->id,
            'role'            => $role,
        ]);
    }
}
