<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Confirmation de présence (RSVP) : page publique par jeton + vidéo du couple.
 */
class RsvpFlowTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $admin;
    private Occasion $occasion;
    private Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create();
        $this->admin = User::factory()->create(['organization_id' => $this->org->id]);
        $this->occasion = Occasion::create([
            'organization_id' => $this->org->id,
            'name'            => 'Mariage Test',
            'type'            => 'mariage',
            'date'            => now()->addWeek()->toDateString(),
        ]);
        $this->guest = $this->occasion->guests()->create([
            'organization_id' => $this->org->id,
            'name'            => 'Grâce Nkosi',
        ]);
    }

    public function test_public_can_view_rsvp_by_token(): void
    {
        $this->getJson("/api/rsvp/{$this->guest->token}")
            ->assertStatus(200)
            ->assertJsonPath('guest.name', 'Grâce Nkosi')
            ->assertJsonPath('guest.status', 'pending')
            ->assertJsonPath('occasion.name', 'Mariage Test');
    }

    public function test_unknown_token_returns_404(): void
    {
        $this->getJson('/api/rsvp/00000000-0000-0000-0000-000000000000')->assertStatus(404);
    }

    public function test_guest_can_confirm_presence(): void
    {
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'confirm'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'confirmed');

        $this->guest->refresh();
        $this->assertNotNull($this->guest->confirmed_at);
        $this->assertFalse($this->guest->declined);
    }

    public function test_guest_can_decline(): void
    {
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'decline'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'declined');

        $this->guest->refresh();
        $this->assertTrue($this->guest->declined);
        $this->assertNull($this->guest->confirmed_at);
    }

    public function test_admin_can_upload_rsvp_video(): void
    {
        Storage::fake('public');

        $this->withToken($this->admin->createToken('t')->plainTextToken)
            ->postJson("/api/occasions/{$this->occasion->id}/rsvp-video", [
                'video' => UploadedFile::fake()->create('couple.mp4', 2048, 'video/mp4'),
            ])
            ->assertStatus(200)
            ->assertJsonPath('message', 'Vidéo enregistrée.');

        $this->occasion->refresh();
        $this->assertNotNull($this->occasion->rsvp_video_path);
        Storage::disk('public')->assertExists($this->occasion->rsvp_video_path);
    }

    public function test_video_upload_rejects_non_video(): void
    {
        Storage::fake('public');

        $this->withToken($this->admin->createToken('t')->plainTextToken)
            ->postJson("/api/occasions/{$this->occasion->id}/rsvp-video", [
                'video' => UploadedFile::fake()->create('notes.txt', 10, 'text/plain'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('video');
    }
}
