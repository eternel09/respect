<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin()
    {
        $admin = User::factory()->create();
        return $this->withToken($admin->createToken('test')->plainTextToken);
    }

    public function test_index_returns_events(): void
    {
        Event::factory(3)->create();

        $this->actingAsAdmin()
            ->getJson('/api/admin/events')
            ->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_index_requires_auth(): void
    {
        $this->getJson('/api/admin/events')->assertStatus(401);
    }

    public function test_admin_can_create_event(): void
    {
        $payload = [
            'name' => 'Réunion du dimanche',
            'type' => 'reunion',
            'date' => now()->toDateString(),
        ];

        $this->actingAsAdmin()
            ->postJson('/api/admin/events', $payload)
            ->assertStatus(201)
            ->assertJsonFragment(['name' => 'Réunion du dimanche']);

        $this->assertDatabaseHas('events', ['name' => 'Réunion du dimanche']);
    }

    public function test_create_event_validates_name(): void
    {
        $this->actingAsAdmin()
            ->postJson('/api/admin/events', ['type' => 'reunion', 'date' => now()->toDateString()])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_create_event_validates_type(): void
    {
        $this->actingAsAdmin()
            ->postJson('/api/admin/events', [
                'name' => 'Test',
                'type' => 'invalid-type',
                'date' => now()->toDateString(),
            ])->assertStatus(422)
              ->assertJsonValidationErrors('type');
    }

    public function test_create_event_validates_date(): void
    {
        $this->actingAsAdmin()
            ->postJson('/api/admin/events', [
                'name' => 'Test',
                'type' => 'reunion',
                'date' => 'not-a-date',
            ])->assertStatus(422)
              ->assertJsonValidationErrors('date');
    }

    public function test_create_event_accepts_all_types(): void
    {
        foreach (['reunion', 'priere', 'autre'] as $i => $type) {
            $this->actingAsAdmin()
                ->postJson('/api/admin/events', [
                    'name' => "Event {$i}",
                    'type' => $type,
                    'date' => now()->addDays($i)->toDateString(),
                ])->assertStatus(201);
        }

        $this->assertDatabaseCount('events', 3);
    }

    public function test_show_returns_event(): void
    {
        $event = Event::factory()->create();

        $this->actingAsAdmin()
            ->getJson("/api/admin/events/{$event->id}")
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $event->id]);
    }

    public function test_admin_can_delete_event(): void
    {
        $event = Event::factory()->create();

        $this->actingAsAdmin()
            ->deleteJson("/api/admin/events/{$event->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('events', ['id' => $event->id]);
    }

    public function test_deleting_event_cascades_attendances(): void
    {
        $event  = Event::factory()->create();
        $member = Member::factory()->create();
        Attendance::factory()->create(['event_id' => $event->id, 'member_id' => $member->id]);

        $this->assertDatabaseCount('attendances', 1);

        $this->actingAsAdmin()
            ->deleteJson("/api/admin/events/{$event->id}")
            ->assertStatus(200);

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_public_events_endpoint_requires_no_auth(): void
    {
        Event::factory(2)->create();

        $this->getJson('/api/events/public')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }
}
