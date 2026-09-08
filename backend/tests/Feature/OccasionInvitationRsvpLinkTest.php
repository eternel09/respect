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
 * Le lien de confirmation (RSVP) n'est envoyé que si le site a une URL publique.
 * Sur une URL localhost / non configurée, la ligne disparaît du message.
 */
class OccasionInvitationRsvpLinkTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();
        $org = Organization::factory()->create();
        $this->admin = User::factory()->create(['organization_id' => $org->id, 'role' => 'admin']);
        $occasion = Occasion::create([
            'organization_id' => $org->id, 'name' => 'Mariage', 'type' => 'mariage',
            'date' => now()->addWeek()->toDateString(),
        ]);
        $this->guest = Guest::create([
            'organization_id' => $org->id, 'occasion_id' => $occasion->id,
            'name' => 'M. Kalala', 'phone' => '+243810000000',
        ]);
    }

    private function invite(): void
    {
        $this->withToken($this->admin->createToken('t')->plainTextToken)
            ->postJson("/api/guests/{$this->guest->id}/invite")
            ->assertOk();
    }

    public function test_localhost_url_sends_no_confirmation_link(): void
    {
        config(['app.frontend_url' => 'http://localhost:5173']);
        Http::fake(['*' => Http::response(['sent' => true], 200)]);

        $this->invite();

        Http::assertSent(fn ($r) => str_contains($r->url(), '/send-invitation') && $r['rsvpUrl'] === null);
    }

    public function test_public_url_includes_confirmation_link(): void
    {
        config(['app.frontend_url' => 'https://signiq.saas.cd']);
        Http::fake(['*' => Http::response(['sent' => true], 200)]);

        $this->invite();

        Http::assertSent(fn ($r) => str_contains($r->url(), '/send-invitation')
            && $r['rsvpUrl'] === "https://signiq.saas.cd/confirmer/{$this->guest->token}");
    }
}
