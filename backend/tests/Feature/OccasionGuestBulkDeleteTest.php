<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Suppression en masse des invités (sélection multiple → confirmation). */
class OccasionGuestBulkDeleteTest extends TestCase
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
        $this->admin = User::factory()->create(['organization_id' => $this->org->id, 'role' => 'admin']);
        $this->occasion = Occasion::create([
            'organization_id' => $this->org->id, 'name' => 'Mariage', 'type' => 'mariage',
            'date' => now()->addWeek()->toDateString(),
        ]);
        $this->other = Occasion::create([
            'organization_id' => $this->org->id, 'name' => 'Gala', 'type' => 'gala',
            'date' => now()->addWeeks(2)->toDateString(),
        ]);
    }

    private function asUser(User $user)
    {
        return $this->withToken($user->createToken('test')->plainTextToken);
    }

    private function guest(Occasion $occ, string $name): Guest
    {
        return Guest::create(['organization_id' => $this->org->id, 'occasion_id' => $occ->id, 'name' => $name]);
    }

    public function test_admin_bulk_deletes_selected_guests(): void
    {
        $a = $this->guest($this->occasion, 'A');
        $b = $this->guest($this->occasion, 'B');
        $c = $this->guest($this->occasion, 'C');

        $this->asUser($this->admin)
            ->postJson("/api/occasions/{$this->occasion->id}/guests/bulk-delete", ['ids' => [$a->id, $b->id]])
            ->assertOk()
            ->assertJsonPath('count', 2);

        $this->assertDatabaseMissing('guests', ['id' => $a->id]);
        $this->assertDatabaseMissing('guests', ['id' => $b->id]);
        $this->assertDatabaseHas('guests', ['id' => $c->id]);
    }

    public function test_bulk_delete_is_bounded_to_the_occasion(): void
    {
        $mine = $this->guest($this->occasion, 'Mine');
        $foreign = $this->guest($this->other, 'Foreign');

        // Un id d'une autre occasion est ignoré (pas supprimé).
        $this->asUser($this->admin)
            ->postJson("/api/occasions/{$this->occasion->id}/guests/bulk-delete", ['ids' => [$mine->id, $foreign->id]])
            ->assertOk()
            ->assertJsonPath('count', 1);

        $this->assertDatabaseMissing('guests', ['id' => $mine->id]);
        $this->assertDatabaseHas('guests', ['id' => $foreign->id]);
    }

    public function test_ids_are_required(): void
    {
        $this->asUser($this->admin)
            ->postJson("/api/occasions/{$this->occasion->id}/guests/bulk-delete", ['ids' => []])
            ->assertStatus(422);
    }

    public function test_event_secretaire_can_bulk_delete_only_its_event(): void
    {
        $agent = User::factory()->create([
            'organization_id' => $this->org->id, 'occasion_id' => $this->occasion->id, 'role' => 'secretaire',
        ]);
        $g = $this->guest($this->occasion, 'A');

        $this->asUser($agent)
            ->postJson("/api/occasions/{$this->occasion->id}/guests/bulk-delete", ['ids' => [$g->id]])
            ->assertOk();

        // Une autre occasion → refusé par ConfineEventAgent.
        $this->asUser($agent)
            ->postJson("/api/occasions/{$this->other->id}/guests/bulk-delete", ['ids' => [1]])
            ->assertStatus(403);
    }
}
