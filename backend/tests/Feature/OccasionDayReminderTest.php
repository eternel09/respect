<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Rappel WhatsApp du jour J : option par événement, envoyé le matin (9 h,
 * heure de Kinshasa) aux invités qui ont reçu leur invitation, avec le lien.
 */
class OccasionDayReminderTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $admin;
    private Occasion $occasion;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'app.frontend_url' => 'https://signiq.saas.cd',
            'services.whatsapp.url' => 'http://wa.test',
            'services.whatsapp.invite_delay' => 0,
        ]);
        // 9 h 05 à Kinshasa (UTC+1) le jour de l'événement.
        Carbon::setTestNow(Carbon::parse('2026-12-12 08:05:00', 'UTC'));

        $this->org = Organization::factory()->create();
        $this->admin = User::factory()->create(['organization_id' => $this->org->id, 'role' => 'admin']);
        $this->occasion = Occasion::create([
            'organization_id' => $this->org->id, 'name' => 'Mariage Ana & Paul', 'type' => 'mariage',
            'date' => '2026-12-12', 'starts_at' => '2026-12-12 18:00:00', 'location' => 'Salle Bella',
        ]);
        $this->occasion->forceFill(['day_reminder' => true])->save();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function guest(array $attrs = []): Guest
    {
        return Guest::create($attrs + [
            'organization_id' => $this->org->id, 'occasion_id' => $this->occasion->id,
            'name' => 'M. Kalala', 'phone' => '+243810000000', 'invite_status' => 'sent',
        ]);
    }

    private function fakeWhatsapp(): void
    {
        Http::fake(['wa.test/send-reminder' => Http::response(['sent' => true])]);
    }

    // ── Réglage ──────────────────────────────────────────────────

    public function test_reminder_is_off_by_default_and_can_be_toggled(): void
    {
        $other = Occasion::create([
            'organization_id' => $this->org->id, 'name' => 'Gala', 'type' => 'gala', 'date' => '2026-12-20',
        ]);
        $token = $this->admin->createToken('t')->plainTextToken;

        $this->withToken($token)->getJson("/api/occasions/{$other->id}")->assertOk()
            ->assertJsonPath('occasion.day_reminder', false)
            ->assertJsonPath('occasion.day_reminder_at', '09:00');

        $this->withToken($token)->putJson("/api/occasions/{$other->id}/day-reminder", ['enabled' => true])
            ->assertOk()->assertJsonPath('day_reminder', true);
        $this->assertTrue($other->fresh()->day_reminder);
    }

    public function test_another_organization_cannot_toggle_the_reminder(): void
    {
        $intruder = User::factory()->create(['organization_id' => Organization::factory()->create()->id, 'role' => 'admin']);

        $this->withToken($intruder->createToken('t')->plainTextToken)
            ->putJson("/api/occasions/{$this->occasion->id}/day-reminder", ['enabled' => false])
            ->assertNotFound();
        $this->assertTrue($this->occasion->fresh()->day_reminder);
    }

    // ── Envoi ────────────────────────────────────────────────────

    public function test_invited_guests_get_the_reminder_with_their_link_once(): void
    {
        $this->fakeWhatsapp();
        $guest = $this->guest();
        $guest->update(['occasion_table_id' => $this->occasion->tables()->create(['organization_id' => $this->org->id, 'label' => '3', 'seats' => 8])->id]);

        $this->artisan('occasions:send-day-reminders')->assertSuccessful();

        Http::assertSent(fn ($r) => $r->url() === 'http://wa.test/send-reminder'
            && $r['phone'] === '+243810000000'
            && $r['timeText'] === '18h00'
            && $r['tableLabel'] === 'Table 3'
            && $r['invitationUrl'] === "https://signiq.saas.cd/confirmer/{$guest->token}");
        $this->assertSame('sent', $guest->fresh()->reminder_status);
        $this->assertNotNull($guest->fresh()->reminded_at);

        // Passage suivant : personne n'est rappelé deux fois.
        $this->artisan('occasions:send-day-reminders')->assertSuccessful();
        Http::assertSentCount(1);
    }

    public function test_only_eligible_guests_are_reminded(): void
    {
        $this->fakeWhatsapp();
        $this->guest(['name' => 'Invité ok']);
        $this->guest(['name' => 'Pas encore invité', 'invite_status' => 'pending']);
        $this->guest(['name' => 'A décliné', 'declined' => true]);
        $this->guest(['name' => 'Sans numéro', 'phone' => null]);
        $this->guest(['name' => 'Déjà entré', 'checked_in_at' => now()]);

        $this->artisan('occasions:send-day-reminders')->assertSuccessful();

        Http::assertSentCount(1);
        Http::assertSent(fn ($r) => $r['guestName'] === 'Invité ok');
    }

    public function test_nothing_is_sent_when_the_option_is_off_or_on_another_day(): void
    {
        $this->fakeWhatsapp();
        $this->guest();
        $this->occasion->forceFill(['day_reminder' => false])->save();
        $this->artisan('occasions:send-day-reminders')->assertSuccessful();

        $this->occasion->forceFill(['day_reminder' => true, 'date' => '2026-12-13', 'starts_at' => '2026-12-13 18:00:00'])->save();
        $this->artisan('occasions:send-day-reminders')->assertSuccessful();

        Http::assertNothingSent();
    }

    public function test_nothing_is_sent_before_nine_or_once_the_event_has_started(): void
    {
        $this->fakeWhatsapp();
        $this->guest();

        Carbon::setTestNow(Carbon::parse('2026-12-12 07:30:00', 'UTC')); // 8 h 30 à Kinshasa
        $this->artisan('occasions:send-day-reminders')->assertSuccessful();

        Carbon::setTestNow(Carbon::parse('2026-12-12 17:10:00', 'UTC')); // 18 h 10 : commencé
        $this->artisan('occasions:send-day-reminders')->assertSuccessful();

        Http::assertNothingSent();
    }

    public function test_nothing_is_sent_without_a_public_address(): void
    {
        $this->fakeWhatsapp();
        $this->guest();
        config(['app.frontend_url' => 'http://localhost:5173']);

        $this->artisan('occasions:send-day-reminders')->assertSuccessful();

        Http::assertNothingSent();
    }

    public function test_whatsapp_not_connected_is_retried_on_the_next_run(): void
    {
        $guest = $this->guest();
        Http::fake(['wa.test/send-reminder' => Http::sequence()
            ->push(['message' => 'WhatsApp non connecté.'], 409)
            ->push(['sent' => true])]);

        $this->artisan('occasions:send-day-reminders')->assertSuccessful();
        $this->assertNull($guest->fresh()->reminder_status);

        $this->artisan('occasions:send-day-reminders')->assertSuccessful();
        $this->assertSame('sent', $guest->fresh()->reminder_status);
    }

    public function test_a_failed_number_is_not_retried(): void
    {
        $guest = $this->guest();
        Http::fake(['wa.test/send-reminder' => Http::response(['message' => "Ce numéro n'est pas sur WhatsApp."], 404)]);

        $this->artisan('occasions:send-day-reminders')->assertSuccessful();
        $this->artisan('occasions:send-day-reminders')->assertSuccessful();

        $this->assertSame('failed', $guest->fresh()->reminder_status);
        Http::assertSentCount(1);
    }

    public function test_the_reminder_runs_every_ten_minutes_in_the_morning(): void
    {
        $event = collect(app(\Illuminate\Console\Scheduling\Schedule::class)->events())
            ->first(fn ($e) => str_contains($e->command, 'occasions:send-day-reminders'));

        $this->assertNotNull($event);
        $this->assertSame('*/10 * * * *', $event->expression);
        $this->assertSame('Africa/Kinshasa', $event->timezone);
    }
}
