<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Modèle « heure dorée » : nombre de personnes dans la réponse, plafonné
 * par les places de l'invitation ; date limite de réponse.
 */
class RsvpPartySizeTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Occasion $occasion;
    private Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();
        $org = Organization::factory()->create();
        $this->admin = User::factory()->create(['organization_id' => $org->id, 'role' => 'admin']);
        $this->occasion = Occasion::create([
            'organization_id' => $org->id, 'name' => 'Mariage Ben & Sarah', 'type' => 'mariage', 'date' => now()->addMonth()->toDateString(),
        ]);
        $this->occasion->invitation_content = ['party_max' => 2, 'rsvp_deadline' => '2026-12-05'];
        $this->occasion->save();
        $this->guest = $this->occasion->guests()->create(['organization_id' => $org->id, 'name' => 'M. & Mme Jean Mukendi']);
    }

    public function test_guest_confirms_for_two_people(): void
    {
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'confirm', 'party_size' => 2, 'message' => 'Avec joie !'])
            ->assertOk()->assertJsonPath('status', 'confirmed');
        $this->assertSame(2, $this->guest->fresh()->party_size);

        $this->getJson("/api/rsvp/{$this->guest->token}")
            ->assertJsonPath('guest.party_size', 2)
            ->assertJsonPath('occasion.content.party_max', 2)
            ->assertJsonPath('occasion.content.rsvp_deadline', '2026-12-05');
        $this->actingAs($this->admin)->getJson("/api/occasions/{$this->occasion->id}")->assertJsonPath("guests.0.party_size", 2);
    }

    public function test_party_size_cannot_exceed_the_invitation(): void
    {
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'confirm', 'party_size' => 3])
            ->assertStatus(422)->assertJsonValidationErrors('party_size');
    }

    public function test_declining_clears_the_party_and_simple_answers_still_work(): void
    {
        $this->guest->forceFill(['party_size' => 2])->save();
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'decline', 'party_size' => 2])->assertOk();
        $this->assertNull($this->guest->fresh()->party_size);
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'confirm'])->assertOk();
        $this->assertNull($this->guest->fresh()->party_size, 'les autres modèles ne touchent pas au nombre de personnes');
    }

    public function test_admin_sets_deadline_and_seats(): void
    {
        $url = "/api/occasions/{$this->occasion->id}/invitation-content";
        $this->actingAs($this->admin)->putJson($url, ['rsvp_deadline' => '2026-12-01', 'party_max' => 4])
            ->assertOk()->assertJsonPath('invitation_content.party_max', 4)->assertJsonPath('invitation_content.rsvp_deadline', '2026-12-01');
        $this->actingAs($this->admin)->putJson($url, ['rsvp_deadline' => '01/12/2026', 'party_max' => 50])
            ->assertStatus(422)->assertJsonValidationErrors(['rsvp_deadline', 'party_max']);
    }
}
