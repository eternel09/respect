<?php

namespace Tests\Feature;

use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Adresse de l'événement, saisie à l'édition à part du nom de la salle :
 * renvoyée à l'invitation et ajoutée au lieu de l'agenda (.ics).
 */
class OccasionAddressTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Occasion $occasion;

    protected function setUp(): void
    {
        parent::setUp();
        $org = Organization::factory()->create();
        $this->admin = User::factory()->create(['organization_id' => $org->id, 'role' => 'admin']);
        $this->occasion = Occasion::create([
            'organization_id' => $org->id, 'name' => 'Mariage Ben & Sarah', 'type' => 'mariage',
            'date' => now()->addMonth()->toDateString(), 'location' => 'Salle Dôme',
        ]);
    }

    private function edit(array $changes)
    {
        return $this->actingAs($this->admin)->putJson("/api/occasions/{$this->occasion->id}", [
            'name' => $this->occasion->name, 'type' => 'mariage', 'date' => $this->occasion->date->toDateString(),
            'location' => 'Salle Dôme', ...$changes,
        ]);
    }

    public function test_admin_sets_and_clears_the_address(): void
    {
        $this->edit(['address' => 'Avenue Libération, Gombe, Kinshasa'])->assertOk()
            ->assertJsonPath('location', 'Salle Dôme')
            ->assertJsonPath('address', 'Avenue Libération, Gombe, Kinshasa');

        $this->edit(['address' => null])->assertOk()->assertJsonPath('address', null);
        $this->assertNull($this->occasion->fresh()->address);
    }

    public function test_address_is_limited(): void
    {
        $this->edit(['address' => str_repeat('a', 256)])->assertStatus(422)->assertJsonValidationErrors('address');
    }

    public function test_guest_sees_the_address_and_calendar_includes_it(): void
    {
        $this->occasion->update(['address' => 'Avenue Libération, Gombe']);
        $guest = $this->occasion->guests()->create(['organization_id' => $this->occasion->organization_id, 'name' => 'Jean']);

        $this->getJson("/api/rsvp/{$guest->token}")->assertOk()
            ->assertJsonPath('occasion.location', 'Salle Dôme')
            ->assertJsonPath('occasion.address', 'Avenue Libération, Gombe');

        $ics = $this->get("/api/rsvp/{$guest->token}/calendar.ics")->assertOk()->getContent();
        $this->assertStringContainsString('LOCATION:Salle Dôme\, Avenue Libération\, Gombe', $ics);
    }
}
