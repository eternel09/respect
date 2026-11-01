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
 * (pdf | link | both), page personnelle de l'invité (QR d'accès + carton à
 * télécharger).
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

    public function test_guest_downloads_the_card(): void
    {
        Http::fake(['*/render-invitation' => Http::response('%PDF-1.7 carton', 200, ['Content-Type' => 'application/pdf'])]);

        $res = $this->get("/api/rsvp/{$this->guest->token}/invitation")->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment; filename="invitation-mariage-ana-paul-m-kalala.pdf"', $res->headers->get('Content-Disposition'));
        $this->assertSame('%PDF-1.7 carton', $res->getContent());

        // Rendu mis en cache : un second téléchargement ne relance pas le service.
        $this->get("/api/rsvp/{$this->guest->token}/invitation")->assertOk();
        Http::assertSentCount(1);
        Http::assertSent(fn ($r) => $r['guestName'] === 'M. Kalala' && isset($r['qrDataUri']));
    }

    public function test_download_reports_an_unavailable_renderer_and_unknown_tokens(): void
    {
        Http::fake(['*' => Http::response(['message' => 'boom'], 500)]);

        $this->getJson("/api/rsvp/{$this->guest->token}/invitation")->assertStatus(503);
        $this->getJson('/api/rsvp/00000000-0000-0000-0000-000000000000/invitation')->assertNotFound();
    }
}
