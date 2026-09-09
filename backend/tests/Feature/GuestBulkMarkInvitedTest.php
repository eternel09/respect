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
 * Marquage « déjà invité » en masse : des invitations envoyées à la main hors
 * système sont marquées 'sent' pour que l'envoi groupé ne les recontacte pas.
 */
class GuestBulkMarkInvitedTest extends TestCase
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

    private function guest(string $phone): Guest
    {
        return Guest::create([
            'organization_id' => $this->org->id, 'occasion_id' => $this->occasion->id,
            'name' => 'Invité ' . $phone, 'phone' => $phone,
        ]);
    }

    private function admin()
    {
        return $this->withToken($this->admin->createToken('t')->plainTextToken);
    }

    public function test_mark_invited_sets_status_and_skips_them_on_bulk_send(): void
    {
        Http::fake(['*' => Http::response(['sent' => true], 200)]);

        $a = $this->guest('+243810000001'); // marqué à la main
        $b = $this->guest('+243810000002'); // marqué à la main
        $c = $this->guest('+243810000003'); // à envoyer

        $this->admin()
            ->postJson("/api/occasions/{$this->occasion->id}/guests/bulk-mark-invited", ['ids' => [$a->id, $b->id]])
            ->assertOk()
            ->assertJsonPath('count', 2);

        $this->assertSame('sent', $a->fresh()->invite_status);
        $this->assertNotNull($a->fresh()->invited_at);
        $this->assertSame('pending', $c->fresh()->invite_status);

        // L'envoi groupé ne contacte que $c (les deux marqués sont sautés).
        $this->admin()->postJson("/api/occasions/{$this->occasion->id}/send-invitations")
            ->assertOk()->assertJsonPath('sent', 1);
        Http::assertSentCount(1);
    }

    public function test_mark_pending_resets_status(): void
    {
        $a = $this->guest('+243810000001');
        $a->forceFill(['invite_status' => 'sent', 'invited_at' => now()])->save();

        $this->admin()
            ->postJson("/api/occasions/{$this->occasion->id}/guests/bulk-mark-invited", ['ids' => [$a->id], 'status' => 'pending'])
            ->assertOk()->assertJsonPath('count', 1);

        $this->assertSame('pending', $a->fresh()->invite_status);
        $this->assertNull($a->fresh()->invited_at);
    }

    public function test_foreign_occasion_ids_are_ignored(): void
    {
        $otherOccasion = Occasion::create([
            'organization_id' => $this->org->id, 'name' => 'Gala', 'type' => 'gala',
            'date' => now()->addWeek()->toDateString(),
        ]);
        $foreign = Guest::create([
            'organization_id' => $this->org->id, 'occasion_id' => $otherOccasion->id,
            'name' => 'Étranger', 'phone' => '+243810009999',
        ]);

        $this->admin()
            ->postJson("/api/occasions/{$this->occasion->id}/guests/bulk-mark-invited", ['ids' => [$foreign->id]])
            ->assertOk()->assertJsonPath('count', 0);

        $this->assertSame('pending', $foreign->fresh()->invite_status);
    }
}
