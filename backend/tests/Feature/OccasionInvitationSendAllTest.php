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
 * Envoi groupé des invitations : la boucle espacée doit contacter tous les
 * invités joignables et ignorer ceux sans téléphone. L'espacement lui-même est
 * neutralisé en test (WHATSAPP_INVITE_DELAY=0 dans phpunit.xml) pour ne pas
 * ralentir la suite.
 */
class OccasionInvitationSendAllTest extends TestCase
{
    use RefreshDatabase;

    public function test_send_all_dispatches_to_every_reachable_guest(): void
    {
        Http::fake(['*' => Http::response(['sent' => true], 200)]);

        $org = Organization::factory()->create();
        $admin = User::factory()->create(['organization_id' => $org->id, 'role' => 'admin']);
        $occasion = Occasion::create([
            'organization_id' => $org->id, 'name' => 'Mariage', 'type' => 'mariage',
            'date' => now()->addWeek()->toDateString(),
        ]);

        // 3 invités avec téléphone + 1 sans (doit être ignoré).
        foreach (['+243810000001', '+243810000002', '+243810000003'] as $i => $phone) {
            Guest::create([
                'organization_id' => $org->id, 'occasion_id' => $occasion->id,
                'name' => "Invité {$i}", 'phone' => $phone,
            ]);
        }
        Guest::create([
            'organization_id' => $org->id, 'occasion_id' => $occasion->id,
            'name' => 'Sans numéro', 'phone' => null,
        ]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson("/api/occasions/{$occasion->id}/send-invitations")
            ->assertOk()
            ->assertJsonPath('sent', 3)
            ->assertJsonPath('failed', 0)
            ->assertJsonPath('skipped', 1);

        Http::assertSentCount(3);

        // Verrou libéré après un envoi terminé.
        $this->assertNull($occasion->fresh()->invites_sending_at);
    }

    public function test_concurrent_send_is_refused_while_one_is_running(): void
    {
        Http::fake(['*' => Http::response(['sent' => true], 200)]);

        $org = Organization::factory()->create();
        $admin = User::factory()->create(['organization_id' => $org->id, 'role' => 'admin']);
        $occasion = Occasion::create([
            'organization_id' => $org->id, 'name' => 'Mariage', 'type' => 'mariage',
            'date' => now()->addWeek()->toDateString(),
        ]);
        $guest = Guest::create([
            'organization_id' => $org->id, 'occasion_id' => $occasion->id,
            'name' => 'Invité', 'phone' => '+243810000001',
        ]);

        // Un envoi est « en cours » (verrou frais posé à l'instant).
        $occasion->forceFill(['invites_sending_at' => now()])->save();

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson("/api/occasions/{$occasion->id}/send-invitations")
            ->assertStatus(409);

        // Aucun envoi n'a eu lieu, et le verrou de l'autre envoi reste posé.
        Http::assertNothingSent();
        $this->assertNotNull($occasion->fresh()->invites_sending_at);
        $this->assertSame('pending', $guest->fresh()->invite_status);
    }

    public function test_stale_lock_is_reclaimed(): void
    {
        Http::fake(['*' => Http::response(['sent' => true], 200)]);

        $org = Organization::factory()->create();
        $admin = User::factory()->create(['organization_id' => $org->id, 'role' => 'admin']);
        $occasion = Occasion::create([
            'organization_id' => $org->id, 'name' => 'Mariage', 'type' => 'mariage',
            'date' => now()->addWeek()->toDateString(),
        ]);
        Guest::create([
            'organization_id' => $org->id, 'occasion_id' => $occasion->id,
            'name' => 'Invité', 'phone' => '+243810000001',
        ]);

        // Verrou périmé (envoi précédent tué il y a 20 min) → doit être repris.
        $occasion->forceFill(['invites_sending_at' => now()->subMinutes(20)])->save();

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson("/api/occasions/{$occasion->id}/send-invitations")
            ->assertOk()
            ->assertJsonPath('sent', 1);

        Http::assertSentCount(1);
        $this->assertNull($occasion->fresh()->invites_sending_at);
    }
}
