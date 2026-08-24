<?php

namespace Tests\Feature;

use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Carton d'invitation personnalisé (option A) : téléversement / retrait de
 * l'image de fond d'une occasion, sur laquelle l'app superpose QR + nom.
 */
class OccasionInvitationBgTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $admin;
    private Occasion $occasion;

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
    }

    private function actingAsAdmin()
    {
        return $this->withToken($this->admin->createToken('test')->plainTextToken);
    }

    public function test_admin_can_upload_invitation_background(): void
    {
        Storage::fake('public');

        $this->actingAsAdmin()
            ->postJson("/api/occasions/{$this->occasion->id}/invitation-bg", [
                'invitation' => UploadedFile::fake()->image('carton.png', 900, 1400),
            ])
            ->assertStatus(200)
            ->assertJsonPath('message', "Carton d'invitation enregistré.")
            ->assertJson(fn ($json) => $json->whereType('invitation_bg_url', 'string')->etc());

        $this->occasion->refresh();
        $this->assertNotNull($this->occasion->invitation_bg_path);
        // Normalisé en JPEG quelle que soit l'entrée.
        $this->assertStringEndsWith('.jpg', $this->occasion->invitation_bg_path);
        Storage::disk('public')->assertExists($this->occasion->invitation_bg_path);
    }

    public function test_upload_rejects_unreadable_file(): void
    {
        Storage::fake('public');

        // Un fichier qui n'est ni une image ni un PDF lisible → refus 422 clair,
        // que le serveur ait Imagick ou non.
        $this->actingAsAdmin()
            ->postJson("/api/occasions/{$this->occasion->id}/invitation-bg", [
                'invitation' => UploadedFile::fake()->create('notes.txt', 10, 'text/plain'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('invitation');
    }

    public function test_admin_can_remove_invitation_background(): void
    {
        Storage::fake('public');
        $path = UploadedFile::fake()->image('carton.png')->store('invitations', 'public');
        // invitation_bg_path n'est pas fillable (posé explicitement à l'upload).
        $this->occasion->invitation_bg_path = $path;
        $this->occasion->save();

        $this->actingAsAdmin()
            ->deleteJson("/api/occasions/{$this->occasion->id}/invitation-bg")
            ->assertStatus(200);

        $this->occasion->refresh();
        $this->assertNull($this->occasion->invitation_bg_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_preview_returns_composed_image(): void
    {
        // Le service WhatsApp est simulé : on ne teste que le relais backend.
        Http::fake(['*/preview-invitation' => Http::response('PNGBYTES', 200, ['Content-Type' => 'image/png'])]);

        $this->actingAsAdmin()
            ->get("/api/occasions/{$this->occasion->id}/invitation-preview")
            ->assertStatus(200)
            ->assertHeader('Content-Type', 'image/png');

        Http::assertSent(fn ($req) => str_ends_with($req->url(), '/preview-invitation')
            && $req['guestName'] === 'Marie Exemple');
    }

    public function test_preview_reports_service_unreachable(): void
    {
        Http::fake(fn () => throw new \Illuminate\Http\Client\ConnectionException('down'));

        $this->actingAsAdmin()
            ->getJson("/api/occasions/{$this->occasion->id}/invitation-preview")
            ->assertStatus(503);
    }
}
