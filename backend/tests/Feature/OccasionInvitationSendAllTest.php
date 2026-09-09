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
    }
}
