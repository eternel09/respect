<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin()
    {
        $admin = User::factory()->create();
        return $this->withToken($admin->createToken('test')->plainTextToken);
    }

    private function seedAttendance(string $date): void
    {
        $member = Member::factory()->create();
        $event  = Event::factory()->create(['date' => $date]);
        Attendance::factory()->create([
            'member_id'     => $member->id,
            'event_id'      => $event->id,
            'attended_date' => $date,
        ]);
    }

    public function test_report_requires_auth(): void
    {
        $this->getJson('/api/admin/reports?date=' . now()->toDateString())
            ->assertStatus(401);
    }

    public function test_report_by_date_returns_pdf(): void
    {
        $date = now()->toDateString();
        $this->seedAttendance($date);

        $res = $this->actingAsAdmin()
            ->get("/api/admin/reports?date={$date}");

        $res->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $res->headers->get('Content-Type'));
    }

    public function test_report_by_period_returns_pdf(): void
    {
        $this->seedAttendance(now()->toDateString());
        $this->seedAttendance(now()->subDay()->toDateString());

        $from = now()->subDays(7)->toDateString();
        $to   = now()->toDateString();

        $res = $this->actingAsAdmin()
            ->get("/api/admin/reports?from={$from}&to={$to}");

        $res->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $res->headers->get('Content-Type'));
    }

    public function test_report_fails_without_date_or_period(): void
    {
        $this->actingAsAdmin()
            ->getJson('/api/admin/reports')
            ->assertStatus(422);
    }

    public function test_report_period_requires_both_from_and_to(): void
    {
        $this->actingAsAdmin()
            ->getJson('/api/admin/reports?from=' . now()->toDateString())
            ->assertStatus(422);
    }

    public function test_report_rejects_to_before_from(): void
    {
        $this->actingAsAdmin()
            ->getJson('/api/admin/reports?from=' . now()->toDateString() . '&to=' . now()->subDay()->toDateString())
            ->assertStatus(422);
    }

    public function test_report_works_with_empty_attendances(): void
    {
        $date = now()->toDateString();

        $res = $this->actingAsAdmin()
            ->get("/api/admin/reports?date={$date}");

        $res->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $res->headers->get('Content-Type'));
    }
}
