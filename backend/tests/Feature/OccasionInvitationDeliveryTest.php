<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Envoi de l'invitation par lien, en option du PDF : mode choisi par événement
 * (pdf | link | both), page personnelle de l'invité (QR d'accès + ajout à
 * l'agenda).
 */
class OccasionInvitationDeliveryTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Occasion $occasion;
    private Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.frontend_url' => 'https://signiq.saas.cd']);
        $org = Organization::factory()->create();
        $this->admin = User::factory()->create(['organization_id' => $org->id, 'role' => 'admin']);
        $this->occasion = Occasion::create([
            'organization_id' => $org->id, 'name' => 'Mariage Ana & Paul', 'type' => 'mariage',
            'date' => now()->addWeek()->toDateString(),
        ]);
        $this->guest = Guest::create([
            'organization_id' => $org->id, 'occasion_id' => $this->occasion->id,
            'name' => 'M. Kalala', 'phone' => '+243810000000',
        ]);
    }

    private function asAdmin(): static
    {
        return $this->withToken($this->admin->createToken('t')->plainTextToken);
    }

    private function setDelivery(string $mode)
    {
        return $this->asAdmin()->putJson("/api/occasions/{$this->occasion->id}/invitation-delivery", ['delivery' => $mode]);
    }

    // ── Réglage du mode ──────────────────────────────────────────

    public function test_pdf_is_the_default_and_the_mode_can_be_changed(): void
    {
        $this->asAdmin()->getJson("/api/occasions/{$this->occasion->id}")->assertOk()
            ->assertJsonPath('occasion.invitation_delivery', 'pdf')
            ->assertJsonPath('occasion.invitation_links_available', true);

        $this->setDelivery('link')->assertOk()->assertJsonPath('invitation_delivery', 'link');
        $this->assertSame('link', $this->occasion->fresh()->invitation_delivery);

        $this->setDelivery('fax')->assertUnprocessable()->assertJsonValidationErrors('delivery');
    }

    public function test_another_organization_cannot_change_the_mode(): void
    {
        $other = User::factory()->create(['organization_id' => Organization::factory()->create()->id, 'role' => 'admin']);

        $this->withToken($other->createToken('t')->plainTextToken)
            ->putJson("/api/occasions/{$this->occasion->id}/invitation-delivery", ['delivery' => 'link'])
            ->assertNotFound();
        $this->assertSame('pdf', $this->occasion->fresh()->invitation_delivery);
    }

    // ── Envoi ────────────────────────────────────────────────────

    public function test_link_mode_sends_the_personal_link_without_composing_the_card(): void
    {
        $this->occasion->update(['invitation_delivery' => 'link']);
        Http::fake(['*' => Http::response(['sent' => true], 200)]);

        $this->asAdmin()->postJson("/api/guests/{$this->guest->id}/invite")->assertOk();

        Http::assertSent(fn ($r) => str_contains($r->url(), '/send-invitation')
            && $r['delivery'] === 'link'
            && $r['invitationUrl'] === "https://signiq.saas.cd/confirmer/{$this->guest->token}"
            && ! isset($r['qrDataUri']) && ! isset($r['templatePdfBase64']));
        $this->assertSame('sent', $this->guest->fresh()->invite_status);
    }

    public function test_both_mode_sends_the_card_and_the_link(): void
    {
        $this->occasion->update(['invitation_delivery' => 'both']);
        Http::fake(['*' => Http::response(['sent' => true], 200)]);

        $this->asAdmin()->postJson("/api/guests/{$this->guest->id}/invite")->assertOk();

        Http::assertSent(fn ($r) => $r['delivery'] === 'both'
            && str_starts_with($r['qrDataUri'], 'data:image/svg+xml;base64,')
            && $r['invitationUrl'] !== null);
    }

    public function test_pdf_mode_is_unchanged(): void
    {
        Http::fake(['*' => Http::response(['sent' => true], 200)]);

        $this->asAdmin()->postJson("/api/guests/{$this->guest->id}/invite")->assertOk();

        Http::assertSent(fn ($r) => $r['delivery'] === 'pdf' && isset($r['qrDataUri'])
            && $r['rsvpUrl'] === "https://signiq.saas.cd/confirmer/{$this->guest->token}");
    }

    public function test_link_modes_are_blocked_without_a_public_address(): void
    {
        config(['app.frontend_url' => 'http://localhost:5173']);
        $this->occasion->update(['invitation_delivery' => 'link']);
        Http::fake();

        $this->asAdmin()->getJson("/api/occasions/{$this->occasion->id}")
            ->assertJsonPath('occasion.invitation_links_available', false);

        $this->asAdmin()->postJson("/api/guests/{$this->guest->id}/invite")
            ->assertUnprocessable()->assertJsonPath('message', fn ($m) => str_contains($m, 'FRONTEND_URL'));
        $this->asAdmin()->postJson("/api/occasions/{$this->occasion->id}/send-invitations")->assertUnprocessable();

        Http::assertNothingSent();
        $this->assertNull($this->occasion->fresh()->invites_sending_at); // aucun verrou laissé
    }

    // ── Page personnelle de l'invité ─────────────────────────────

    public function test_guest_page_shows_the_access_qr_and_the_hosts_message(): void
    {
        $this->occasion->update(['invitation_message' => 'Votre présence nous honore.']);

        $this->getJson("/api/rsvp/{$this->guest->token}")->assertOk()
            ->assertJsonPath('guest.qr', fn ($qr) => str_starts_with($qr, 'data:image/svg+xml;base64,'))
            ->assertJsonPath('occasion.message', 'Votre présence nous honore.');
    }

    public function test_calendar_event_keeps_the_local_time_and_links_the_invitation(): void
    {
        $table = \App\Models\OccasionTable::create(['organization_id' => $this->occasion->organization_id, 'occasion_id' => $this->occasion->id, 'label' => '3', 'seats' => 8]);
        $this->guest->update(['occasion_table_id' => $table->id]);
        $this->occasion->update(['date' => '2026-12-10', 'starts_at' => '2026-12-10 18:00:00', 'location' => 'Salle Bella, Kinshasa']);

        $res = $this->get("/api/rsvp/{$this->guest->token}/calendar.ics")->assertOk();
        $this->assertStringStartsWith('text/calendar', $res->headers->get('Content-Type'));
        $this->assertStringStartsWith('inline;', $res->headers->get('Content-Disposition')); // ouvert par l'agenda, pas téléchargé

        $ics = str_replace("\r\n ", '', $res->getContent()); // lignes repliées
        $this->assertStringContainsString("DTSTART:20261210T180000\r\n", $ics);  // 18h00 telle que saisie
        $this->assertStringContainsString("DTEND:20261210T230000\r\n", $ics);
        $this->assertStringContainsString('SUMMARY:Mariage Ana & Paul', $ics);
        $this->assertStringContainsString('LOCATION:Salle Bella\, Kinshasa', $ics);
        $this->assertStringContainsString("Votre place : Table 3\\nVotre invitation : https://signiq.saas.cd/confirmer/{$this->guest->token}", $ics);
        $this->assertStringContainsString('TRIGGER:-P1D', $ics);
        foreach (explode("\r\n", $res->getContent()) as $line) {
            $this->assertLessThanOrEqual(75, strlen($line));
        }
    }

    public function test_calendar_event_without_a_time_is_all_day(): void
    {
        $this->occasion->update(['date' => '2026-12-10', 'starts_at' => null]);

        $ics = $this->get("/api/rsvp/{$this->guest->token}/calendar.ics")->assertOk()->getContent();
        $this->assertStringContainsString("DTSTART;VALUE=DATE:20261210\r\n", $ics);
        $this->assertStringContainsString("DTEND;VALUE=DATE:20261211\r\n", $ics);

        $this->get('/api/rsvp/00000000-0000-0000-0000-000000000000/calendar.ics')->assertNotFound();
    }
}
