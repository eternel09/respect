<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin()
    {
        $admin = User::factory()->create();
        return $this->withToken($admin->createToken('test')->plainTextToken);
    }

    public function test_index_returns_paginated_members(): void
    {
        Member::factory(5)->create();

        $this->actingAsAdmin()
            ->getJson('/api/admin/members')
            ->assertStatus(200)
            ->assertJsonStructure(['data', 'meta'])
            ->assertJsonCount(5, 'data');
    }

    public function test_index_requires_auth(): void
    {
        $this->getJson('/api/admin/members')->assertStatus(401);
    }

    public function test_index_searches_by_first_name(): void
    {
        Member::factory()->create(['first_name' => 'Alice', 'phone' => '+243800000001']);
        Member::factory()->create(['first_name' => 'Bob',   'phone' => '+243800000002']);

        $this->actingAsAdmin()
            ->getJson('/api/admin/members?search=Alice')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['first_name' => 'Alice']);
    }

    public function test_index_searches_by_phone(): void
    {
        Member::factory()->create(['phone' => '+243811111111']);
        Member::factory()->create(['phone' => '+243822222222']);

        $this->actingAsAdmin()
            ->getJson('/api/admin/members?search=811111')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_show_returns_member_with_attendance_history(): void
    {
        $member = Member::factory()->create();
        $event  = Event::factory()->create();
        Attendance::factory()->create(['member_id' => $member->id, 'event_id' => $event->id]);

        $res = $this->actingAsAdmin()
            ->getJson("/api/admin/members/{$member->id}")
            ->assertStatus(200);

        $res->assertJsonStructure(['member', 'attendances']);
        $this->assertCount(1, $res->json('attendances'));
    }

    public function test_show_returns_404_for_missing_member(): void
    {
        $this->actingAsAdmin()
            ->getJson('/api/admin/members/9999')
            ->assertStatus(404);
    }

    public function test_member_resource_includes_attendance_count(): void
    {
        $member = Member::factory()->create();
        $event  = Event::factory()->create();
        // Dates distinctes : la présence est unique par (membre, événement, jour).
        Attendance::factory(3)
            ->sequence(
                ['attended_date' => now()->subDays(1)->toDateString()],
                ['attended_date' => now()->subDays(2)->toDateString()],
                ['attended_date' => now()->subDays(3)->toDateString()],
            )
            ->create(['member_id' => $member->id, 'event_id' => $event->id]);

        // Can't use withCount on the show endpoint since it returns all attendances separately
        // Verify via index which uses withCount
        $res = $this->actingAsAdmin()
            ->getJson('/api/admin/members')
            ->assertStatus(200);

        $this->assertEquals(3, $res->json('data.0.attendance_count'));
    }
}
