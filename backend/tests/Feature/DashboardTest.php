<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin()
    {
        $admin = User::factory()->create();
        return $this->withToken($admin->createToken('test')->plainTextToken);
    }

    public function test_dashboard_requires_auth(): void
    {
        $this->getJson('/api/admin/dashboard')->assertStatus(401);
    }

    public function test_dashboard_returns_stats(): void
    {
        $this->actingAsAdmin()
            ->getJson('/api/admin/dashboard')
            ->assertStatus(200)
            ->assertJsonStructure(['stats' => [
                'total_members',
                'total_events',
                'today_attendance_count',
                'total_attendances',
            ]]);
    }

    public function test_dashboard_counts_are_accurate(): void
    {
        Member::factory(3)->create();
        $event = Event::factory()->create(['date' => now()->toDateString()]);

        $members = Member::all();
        foreach ($members as $member) {
            Attendance::factory()->create([
                'member_id'     => $member->id,
                'event_id'      => $event->id,
                'attended_date' => now()->toDateString(),
            ]);
        }

        $res = $this->actingAsAdmin()
            ->getJson('/api/admin/dashboard')
            ->assertStatus(200);

        $this->assertEquals(3, $res->json('stats.total_members'));
        $this->assertEquals(1, $res->json('stats.total_events'));
        $this->assertEquals(3, $res->json('stats.today_attendance_count'));
        $this->assertEquals(3, $res->json('stats.total_attendances'));
    }

    public function test_dashboard_today_attendances_excludes_past_dates(): void
    {
        $member = Member::factory()->create();
        $event  = Event::factory()->create();

        // Past attendance — should NOT appear in today count
        Attendance::factory()->create([
            'member_id'     => $member->id,
            'event_id'      => $event->id,
            'attended_date' => now()->subDay()->toDateString(),
        ]);

        $res = $this->actingAsAdmin()
            ->getJson('/api/admin/dashboard')
            ->assertStatus(200);

        $this->assertEquals(0, $res->json('stats.today_attendance_count'));
        $this->assertEquals(1, $res->json('stats.total_attendances'));
    }

    public function test_dashboard_returns_today_attendances_list(): void
    {
        $member = Member::factory()->create();
        $event  = Event::factory()->create();
        Attendance::factory()->create([
            'member_id'     => $member->id,
            'event_id'      => $event->id,
            'attended_date' => now()->toDateString(),
        ]);

        $this->actingAsAdmin()
            ->getJson('/api/admin/dashboard')
            ->assertStatus(200)
            ->assertJsonStructure(['today_attendances' => [['id', 'attended_date', 'member', 'event']]]);
    }
}
