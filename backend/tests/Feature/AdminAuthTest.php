<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): User
    {
        return User::factory()->create([
            'email'    => 'admin@famillerespect.cd',
            'password' => Hash::make('password'),
        ]);
    }

    public function test_admin_can_login_with_valid_credentials(): void
    {
        $this->createAdmin();

        $this->postJson('/api/admin/login', [
            'email'    => 'admin@famillerespect.cd',
            'password' => 'password',
        ])->assertStatus(200)
          ->assertJsonStructure(['token', 'user' => ['id', 'email']]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $this->createAdmin();

        $this->postJson('/api/admin/login', [
            'email'    => 'admin@famillerespect.cd',
            'password' => 'wrong-password',
        ])->assertStatus(401);
    }

    public function test_login_fails_with_unknown_email(): void
    {
        $this->postJson('/api/admin/login', [
            'email'    => 'nobody@example.com',
            'password' => 'password',
        ])->assertStatus(401);
    }

    public function test_login_validates_email_format(): void
    {
        $this->postJson('/api/admin/login', [
            'email'    => 'not-an-email',
            'password' => 'password',
        ])->assertStatus(422)
          ->assertJsonValidationErrors('email');
    }

    public function test_admin_can_logout(): void
    {
        $admin     = $this->createAdmin();
        $newToken  = $admin->createToken('test');

        $this->withToken($newToken->plainTextToken)
            ->postJson('/api/admin/logout')
            ->assertStatus(200);

        // Token must be removed from DB after logout
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $newToken->accessToken->id,
        ]);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $admin = $this->createAdmin();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/admin/me')
            ->assertStatus(200)
            ->assertJsonFragment(['email' => 'admin@famillerespect.cd']);
    }

    public function test_protected_routes_require_token(): void
    {
        $routes = [
            ['GET',  '/api/admin/dashboard'],
            ['GET',  '/api/admin/members'],
            ['GET',  '/api/admin/events'],
            ['GET',  '/api/admin/qrcodes'],
        ];

        foreach ($routes as [$method, $path]) {
            $this->json($method, $path)->assertStatus(401);
        }
    }
}
