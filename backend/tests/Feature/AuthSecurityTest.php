<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Garde-fous d'authentification : bruteforce login + tokens de téléchargement. */
class AuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_is_rate_limited(): void
    {
        // throttle:6,1 → les 6 premières tentatives passent (401), la 7e est bloquée (429).
        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/admin/login', ['email' => 'nobody@example.com', 'password' => 'wrong'])
                ->assertStatus(401);
        }

        $this->postJson('/api/admin/login', ['email' => 'nobody@example.com', 'password' => 'wrong'])
            ->assertStatus(429);
    }

    public function test_download_rejects_a_token_idle_beyond_timeout(): void
    {
        config(['sanctum.idle_timeout' => 10]);

        $user = User::factory()->create([
            'organization_id' => Organization::factory()->create()->id, 'role' => 'admin',
        ]);
        Member::factory()->create(['organization_id' => $user->organization_id]);

        $new = $user->createToken('t');
        // Dernière utilisation il y a 20 min > idle_timeout (10 min) → doit être refusé.
        $new->accessToken->forceFill(['last_used_at' => now()->subMinutes(20)])->save();

        $this->get('/api/download/cards?token=' . $new->plainTextToken)
            ->assertForbidden();
    }

    public function test_download_rejects_missing_or_unknown_token(): void
    {
        $this->get('/api/download/cards')->assertForbidden();
        $this->get('/api/download/cards?token=totally-invalid')->assertForbidden();
    }
}
