<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceTest extends TestCase
{
    use RefreshDatabase;

    private function makeEvent(): Event
    {
        return Event::factory()->create(['date' => now()->toDateString()]);
    }

    private function makeMember(): Member
    {
        return Member::factory()->create(['phone' => '+243812345678']);
    }

    public function test_member_can_check_in(): void
    {
        $member = $this->makeMember();
        $event  = $this->makeEvent();

        $res = $this->postJson('/api/attendance', [
            'phone'    => $member->phone,
            'event_id' => $event->id,
        ]);

        $res->assertStatus(201)
            ->assertJsonFragment(['first_name' => $member->first_name]);

        $this->assertDatabaseHas('attendances', [
            'member_id' => $member->id,
            'event_id'  => $event->id,
        ]);
    }

    public function test_unknown_phone_returns_404(): void
    {
        $event = $this->makeEvent();

        $this->postJson('/api/attendance', [
            'phone'    => '+243999999999',
            'event_id' => $event->id,
        ])->assertStatus(404);
    }

    public function test_duplicate_checkin_same_event_same_day_returns_409(): void
    {
        $member = $this->makeMember();
        $event  = $this->makeEvent();

        Attendance::factory()->create([
            'member_id'     => $member->id,
            'event_id'      => $event->id,
            'attended_date' => now()->toDateString(),
        ]);

        $this->postJson('/api/attendance', [
            'phone'    => $member->phone,
            'event_id' => $event->id,
        ])->assertStatus(409)
          ->assertJsonFragment(['already_checked_in' => true]);

        $this->assertDatabaseCount('attendances', 1);
    }

    public function test_member_can_checkin_different_events_same_day(): void
    {
        $member = $this->makeMember();
        $event1 = $this->makeEvent();
        $event2 = $this->makeEvent();

        $this->postJson('/api/attendance', ['phone' => $member->phone, 'event_id' => $event1->id])
            ->assertStatus(201);

        $this->postJson('/api/attendance', ['phone' => $member->phone, 'event_id' => $event2->id])
            ->assertStatus(201);

        $this->assertDatabaseCount('attendances', 2);
    }

    public function test_checkin_requires_phone(): void
    {
        $event = $this->makeEvent();
        $this->postJson('/api/attendance', ['event_id' => $event->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('phone');
    }

    public function test_checkin_requires_event_id(): void
    {
        $this->postJson('/api/attendance', ['phone' => '+243812345678'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('event_id');
    }

    public function test_checkin_rejects_nonexistent_event(): void
    {
        $this->makeMember();
        $this->postJson('/api/attendance', ['phone' => '+243812345678', 'event_id' => 9999])
            ->assertStatus(422)
            ->assertJsonValidationErrors('event_id');
    }

    public function test_checkin_returns_greeting_with_first_name(): void
    {
        $member = Member::factory()->create(['first_name' => 'Marie', 'phone' => '+243812345678']);
        $event  = $this->makeEvent();

        $this->postJson('/api/attendance', ['phone' => $member->phone, 'event_id' => $event->id])
            ->assertStatus(201)
            ->assertJsonFragment(['message' => 'Présence enregistrée. Bienvenue, Marie !']);
    }
}
