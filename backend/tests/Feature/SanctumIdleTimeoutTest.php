<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Laravel\Sanctum\PersonalAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Expiration des tokens par inactivité (délai glissant) → reconnexion forcée. */
class SanctumIdleTimeoutTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create([
            'organization_id' => Organization::factory()->create()->id,
            'role' => 'admin',
        ]);
    }

    public function test_fresh_token_is_accepted(): void
    {
        $token = $this->admin()->createToken('t')->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/me')->assertOk();
    }

    public function test_token_idle_beyond_timeout_is_rejected(): void
    {
        $user = $this->admin();
        $token = $user->createToken('t')->plainTextToken;

        // Simule une inactivité au-delà du délai (défaut 10 min) : dernière
        // utilisation il y a 15 min.
        PersonalAccessToken::query()->update(['last_used_at' => now()->subMinutes(15)]);

        // Requête refusée → le front redirige vers la connexion.
        $this->withToken($token)->getJson('/api/admin/me')->assertUnauthorized();
    }

    public function test_activity_within_timeout_keeps_session(): void
    {
        $token = $this->admin()->createToken('t')->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/me')->assertOk();
        // Dernière activité il y a 30 s (< 1 min) → toujours valable.
        PersonalAccessToken::query()->update(['last_used_at' => now()->subSeconds(30)]);
        $this->withToken($token)->getJson('/api/admin/me')->assertOk();
    }
}
