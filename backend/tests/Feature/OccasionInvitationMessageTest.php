<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Message d'accompagnement WhatsApp : stocké par événement + ajouté à l'envoi. */
class OccasionInvitationMessageTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $admin;
    private Occasion $occasion;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create();
        $this->admin = User::factory()->create(['organization_id' => $this->org->id, 'role' => 'admin']);
        $this->occasion = Occasion::create([
            'organization_id' => $this->org->id, 'name' => 'Mariage', 'type' => 'mariage',
            'date' => now()->addWeek()->toDateString(),
        ]);
    }

    private function admin()
    {
        return $this->withToken($this->admin->createToken('t')->plainTextToken);
    }

    public function test_admin_saves_and_clears_the_message(): void
    {
        $this->admin()
            ->putJson("/api/occasions/{$this->occasion->id}/invitation-message", ['message' => '  Chère famille, bienvenue !  '])
            ->assertOk()
            ->assertJsonPath('invitation_message', 'Chère famille, bienvenue !'); // trim

        $this->admin()->getJson("/api/occasions/{$this->occasion->id}")
            ->assertOk()->assertJsonPath('occasion.invitation_message', 'Chère famille, bienvenue !');

        // Vide → null
        $this->admin()
            ->putJson("/api/occasions/{$this->occasion->id}/invitation-message", ['message' => '   '])
            ->assertOk()->assertJsonPath('invitation_message', null);
    }

    public function test_message_too_long_is_rejected(): void
    {
        $this->admin()
            ->putJson("/api/occasions/{$this->occasion->id}/invitation-message", ['message' => str_repeat('a', 1001)])
            ->assertStatus(422);
    }

    public function test_send_includes_custom_message(): void
    {
        Http::fake(['*' => Http::response(['sent' => true], 200)]);

        $this->admin()->putJson("/api/occasions/{$this->occasion->id}/invitation-message", ['message' => 'Notre plus beau jour']);

        $guest = Guest::create([
            'organization_id' => $this->org->id, 'occasion_id' => $this->occasion->id,
            'name' => 'M. Kalala', 'phone' => '+243810000000',
        ]);

        $this->admin()->postJson("/api/guests/{$guest->id}/invite")->assertOk();

        Http::assertSent(fn ($r) => str_contains($r->url(), '/send-invitation')
            && $r['customMessage'] === 'Notre plus beau jour');
    }
}
