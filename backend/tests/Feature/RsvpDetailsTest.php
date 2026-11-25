<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Réponse détaillée (modèle « heure dorée ») : nombre de personnes, contact,
 * date limite et places par invitation ; aperçu Open Graph du lien personnel.
 */
class RsvpDetailsTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $admin;
    private Occasion $occasion;
    private Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.frontend_url' => 'https://invitations.example.test']);
        $this->org = Organization::factory()->create();
        $this->admin = User::factory()->create(['organization_id' => $this->org->id, 'role' => 'admin']);
        $this->occasion = Occasion::create([
            'organization_id' => $this->org->id,
            'name'            => 'Ana & Paul',
            'type'            => 'mariage',
            'date'            => now()->addMonth()->toDateString(),
            'location'        => 'Salle Bella, Kinshasa',
        ]);
        $this->occasion->invitation_content = ['party_max' => 2, 'rsvp_deadline' => '2026-12-01'];
        $this->occasion->save();
        $this->guest = $this->occasion->guests()->create(['organization_id' => $this->org->id, 'name' => 'Marie Kalala']);
    }

    public function test_detailed_answer_stores_party_size_and_email(): void
    {
        $this->postJson("/api/rsvp/{$this->guest->token}", [
            'status' => 'confirm', 'party_size' => 2, 'email' => 'marie@example.test', 'phone' => '+243810000000', 'message' => 'Avec joie !',
        ])->assertOk()->assertJsonPath('status', 'confirmed');

        $g = $this->guest->fresh();
        $this->assertSame(2, $g->party_size);
        $this->assertSame('marie@example.test', $g->email);
        $this->assertSame('+243810000000', $g->phone);
        $this->assertSame('Avec joie !', $g->rsvp_message);

        $this->getJson("/api/rsvp/{$this->guest->token}")
            ->assertJsonPath('guest.party_size', 2)
            ->assertJsonPath('guest.email', 'marie@example.test')
            ->assertJsonPath('occasion.content.party_max', 2)
            ->assertJsonPath('occasion.content.rsvp_deadline', '2026-12-01');
    }

    public function test_party_size_is_capped_by_the_invitation(): void
    {
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'confirm', 'party_size' => 3, 'email' => 'm@example.test'])
            ->assertStatus(422)->assertJsonValidationErrors('party_size');
    }

    public function test_detailed_form_requires_a_contact(): void
    {
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'confirm', 'party_size' => 1, 'email' => '', 'phone' => ''])
            ->assertStatus(422)->assertJsonValidationErrors('email');

        // Le numéro déjà connu de l'organisateur suffit.
        $this->guest->update(['phone' => '+243820000000']);
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'confirm', 'party_size' => 1, 'email' => '', 'phone' => '+243899999999'])
            ->assertOk();
        $this->assertSame('+243820000000', $this->guest->fresh()->phone, "le numéro de l'organisateur n'est pas remplacé");
    }

    public function test_declining_clears_party_size_and_simple_answers_still_work(): void
    {
        $this->guest->forceFill(['party_size' => 2])->save();
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'decline', 'party_size' => 2, 'email' => 'm@example.test'])->assertOk();
        $this->assertNull($this->guest->fresh()->party_size);

        // Les autres modèles n'envoient que le statut : aucune exigence de contact.
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'confirm'])->assertOk();
    }

    public function test_admin_sets_deadline_and_party_max(): void
    {
        $this->actingAs($this->admin)->putJson("/api/occasions/{$this->occasion->id}/invitation-content", ['rsvp_deadline' => '2026-12-05', 'party_max' => 4])
            ->assertOk()
            ->assertJsonPath('invitation_content.rsvp_deadline', '2026-12-05')
            ->assertJsonPath('invitation_content.party_max', 4);

        $this->actingAs($this->admin)->putJson("/api/occasions/{$this->occasion->id}/invitation-content", ['rsvp_deadline' => '05/12/2026', 'party_max' => 50])
            ->assertStatus(422)->assertJsonValidationErrors(['rsvp_deadline', 'party_max']);
    }

    public function test_link_preview_has_open_graph_tags(): void
    {
        $res = $this->get("/api/rsvp/{$this->guest->token}/og")->assertOk();
        $html = $res->getContent();
        $this->assertStringContainsString('<meta property="og:title" content="Ana &amp; Paul · Invitation au mariage">', $html);
        $this->assertStringContainsString('og:image" content="https://invitations.example.test/invitations/heure-doree/og-cover.jpg"', $html);
        $this->assertStringContainsString("/confirmer/{$this->guest->token}", $html);
        $this->assertStringNotContainsString('Marie Kalala', $html, "le nom de l'invité ne fuit pas dans l'aperçu");

        $this->occasion->update(['name' => 'Mariage de Ana & Paul']);
        $this->assertStringContainsString('content="Ana &amp; Paul · Invitation au mariage"', $this->get("/api/rsvp/{$this->guest->token}/og")->getContent());
    }
}
