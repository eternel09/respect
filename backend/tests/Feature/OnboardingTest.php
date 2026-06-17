<?php

namespace Tests\Feature;

use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnboardingTest extends TestCase
{
    use RefreshDatabase;

    private array $valid = [
        'first_name' => 'Jean',
        'last_name'  => 'Kabila',
        'phone'      => '+243812345678',
    ];

    public function test_member_can_register(): void
    {
        $res = $this->postJson('/api/onboarding', $this->valid);

        $res->assertStatus(201)
            ->assertJsonFragment(['first_name' => 'Jean']);

        $this->assertDatabaseHas('members', ['phone' => '+243812345678']);
    }

    public function test_duplicate_phone_returns_409(): void
    {
        Member::factory()->create(['phone' => '+243812345678']);

        $res = $this->postJson('/api/onboarding', $this->valid);

        $res->assertStatus(409)
            ->assertJsonFragment(['already_registered' => true]);

        $this->assertDatabaseCount('members', 1);
    }

    public function test_registration_requires_first_name(): void
    {
        $this->postJson('/api/onboarding', array_merge($this->valid, ['first_name' => '']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('first_name');
    }

    public function test_registration_requires_last_name(): void
    {
        $this->postJson('/api/onboarding', array_merge($this->valid, ['last_name' => '']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('last_name');
    }

    public function test_registration_requires_phone(): void
    {
        $this->postJson('/api/onboarding', array_merge($this->valid, ['phone' => '']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('phone');
    }

    public function test_registration_rejects_invalid_phone_format(): void
    {
        $this->postJson('/api/onboarding', array_merge($this->valid, ['phone' => 'not-a-phone']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('phone');
    }

    public function test_short_phone_is_rejected(): void
    {
        $this->postJson('/api/onboarding', array_merge($this->valid, ['phone' => '123']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('phone');
    }

    public function test_member_count_increases_after_registration(): void
    {
        $this->assertDatabaseCount('members', 0);
        $this->postJson('/api/onboarding', $this->valid)->assertStatus(201);
        $this->assertDatabaseCount('members', 1);
    }
}
