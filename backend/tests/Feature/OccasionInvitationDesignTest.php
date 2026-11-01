<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use App\Services\InvitationCartonService;
use App\Services\InvitationComposer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Design propre à chaque invitation en ligne : palette / couleur libre,
 * polices, cachet, photo de couverture, et carton du client qui sort de
 * l'enveloppe (composé au nom de l'invité pour un modèle PDF).
 */
class OccasionInvitationDesignTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $admin;
    private Occasion $occasion;
    private Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config(['services.whatsapp.url' => 'http://wa.test']);

        $this->org = Organization::factory()->create();
        $this->admin = User::factory()->create(['organization_id' => $this->org->id, 'role' => 'admin']);
        $this->occasion = Occasion::create([
            'organization_id' => $this->org->id, 'name' => 'Mariage Ana & Paul', 'type' => 'mariage',
            'date' => now()->addMonth()->toDateString(),
        ]);
        $this->guest = Guest::create([
            'organization_id' => $this->org->id, 'occasion_id' => $this->occasion->id,
            'name' => 'M. Kalala', 'phone' => '+243810000000',
        ]);
    }

    private function asAdmin(): static
    {
        return $this->withToken($this->admin->createToken('t')->plainTextToken);
    }

    private function theme(array $data)
    {
        return $this->asAdmin()->putJson("/api/occasions/{$this->occasion->id}/invitation-theme", $data + [
            'palette' => 'auto', 'font' => 'classique', 'card' => 'auto',
        ]);
    }

    // ── Réglage du design ────────────────────────────────────────

    public function test_defaults_follow_the_event_type(): void
    {
        $this->getJson("/api/rsvp/{$this->guest->token}")->assertOk()
            ->assertJsonPath('occasion.theme', ['palette' => 'auto', 'color' => null, 'font' => 'classique', 'seal' => null, 'card' => 'auto'])
            ->assertJsonPath('occasion.cover_url', null)
            ->assertJsonPath('occasion.carton', false);
    }

    public function test_the_design_is_saved_and_shown_to_guests(): void
    {
        $this->theme(['palette' => 'custom', 'color' => '#1F6F5C', 'font' => 'romantique', 'seal' => ' a&p '])
            ->assertOk()
            ->assertJsonPath('invitation_theme.color', '#1f6f5c')
            ->assertJsonPath('invitation_theme.seal', 'A&P');

        $this->getJson("/api/rsvp/{$this->guest->token}")->assertOk()
            ->assertJsonPath('occasion.theme.palette', 'custom')
            ->assertJsonPath('occasion.theme.font', 'romantique')
            ->assertJsonPath('occasion.theme.seal', 'A&P');

        // Une palette nommée efface la couleur libre.
        $this->theme(['palette' => 'emeraude', 'color' => '#123456'])->assertOk()
            ->assertJsonPath('invitation_theme.color', null);
    }

    public function test_invalid_design_values_are_rejected(): void
    {
        $this->theme(['palette' => 'custom'])->assertStatus(422)->assertJsonValidationErrors('color');
        $this->theme(['palette' => 'custom', 'color' => 'red'])->assertStatus(422)->assertJsonValidationErrors('color');
        $this->theme(['palette' => 'fluo'])->assertStatus(422)->assertJsonValidationErrors('palette');
        $this->theme(['seal' => 'ABCD'])->assertStatus(422)->assertJsonValidationErrors('seal');
    }

    public function test_another_organization_cannot_change_the_design(): void
    {
        $intruder = User::factory()->create(['organization_id' => Organization::factory()->create()->id, 'role' => 'admin']);

        $this->withToken($intruder->createToken('t')->plainTextToken)
            ->putJson("/api/occasions/{$this->occasion->id}/invitation-theme", ['palette' => 'noir', 'font' => 'moderne', 'card' => 'auto'])
            ->assertNotFound();
        $this->assertNull($this->occasion->fresh()->invitation_theme);
    }

    // ── Photo de couverture ──────────────────────────────────────

    public function test_cover_photo_upload_and_removal(): void
    {
        $this->asAdmin()->post("/api/occasions/{$this->occasion->id}/invitation-cover", [
            'cover' => UploadedFile::fake()->image('couple.jpg', 1200, 900),
        ])->assertOk();

        $path = $this->occasion->fresh()->invitation_cover_path;
        Storage::disk('public')->assertExists($path);
        $this->assertStringContainsString($path, $this->getJson("/api/rsvp/{$this->guest->token}")->json('occasion.cover_url'));

        $this->asAdmin()->deleteJson("/api/occasions/{$this->occasion->id}/invitation-cover")->assertOk();
        Storage::disk('public')->assertMissing($path);
        $this->assertNull($this->occasion->fresh()->invitation_cover_path);
    }

    public function test_a_pdf_is_refused_as_cover(): void
    {
        $this->asAdmin()->post("/api/occasions/{$this->occasion->id}/invitation-cover", [
            'cover' => UploadedFile::fake()->create('plan.pdf', 50, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertStatus(422);
    }

    // ── Carton dans l'enveloppe ──────────────────────────────────

    public function test_an_image_carton_is_shown_as_is(): void
    {
        Storage::disk('public')->put('invitations/carton.jpg', 'JPEGDATA');
        $this->occasion->forceFill(['invitation_bg_path' => 'invitations/carton.jpg'])->save();

        $this->getJson("/api/rsvp/{$this->guest->token}")->assertJsonPath('occasion.carton', true);
        $res = $this->get("/api/rsvp/{$this->guest->token}/carton")->assertOk();
        $this->assertSame('JPEGDATA', $res->streamedContent());
    }

    public function test_the_signiq_card_can_be_kept_despite_a_carton(): void
    {
        Storage::disk('public')->put('invitations/carton.jpg', 'JPEGDATA');
        $this->occasion->forceFill(['invitation_bg_path' => 'invitations/carton.jpg'])->save();
        $this->theme(['card' => 'signiq'])->assertOk();

        $this->getJson("/api/rsvp/{$this->guest->token}")->assertJsonPath('occasion.carton', false);
        $this->get("/api/rsvp/{$this->guest->token}/carton")->assertNotFound();
    }

    public function test_no_carton_means_404(): void
    {
        $this->get("/api/rsvp/{$this->guest->token}/carton")->assertNotFound();
    }

    public function test_a_pdf_template_is_composed_for_the_guest_and_cached(): void
    {
        Storage::disk('public')->put('invitations/modele.pdf', '%PDF-1.7 modèle');
        $this->occasion->forceFill(['invitation_bg_path' => 'invitations/modele.pdf'])->save();
        Http::fake(['wa.test/preview-invitation' => Http::response('%PDF-1.7 composé', 200, ['Content-Type' => 'application/pdf'])]);
        $this->fakeRasterizer();

        $res = $this->get("/api/rsvp/{$this->guest->token}/carton")->assertOk();
        $this->assertSame('JPEG<%PDF-1.7 composé>', $res->streamedContent());
        Http::assertSent(fn ($r) => $r->url() === 'http://wa.test/preview-invitation' && $r['guestName'] === 'M. Kalala');

        // Deuxième visite : servi depuis le cache, sans nouveau rendu.
        $this->get("/api/rsvp/{$this->guest->token}/carton")->assertOk();
        Http::assertSentCount(1);

        // Nouveau carton : le cache de l'événement est vidé.
        $this->asAdmin()->deleteJson("/api/occasions/{$this->occasion->id}/invitation-bg")->assertOk();
        $this->assertSame([], Storage::disk('public')->allFiles("invitations/cartons/{$this->occasion->id}"));
    }

    public function test_the_raw_template_is_shown_when_the_renderer_is_down(): void
    {
        Storage::disk('public')->put('invitations/modele.pdf', '%PDF-1.7 modèle');
        $this->occasion->forceFill(['invitation_bg_path' => 'invitations/modele.pdf'])->save();
        Http::fake(['wa.test/*' => Http::response('', 500)]);
        $this->fakeRasterizer();

        $res = $this->get("/api/rsvp/{$this->guest->token}/carton")->assertOk();
        $this->assertSame('JPEG<%PDF-1.7 modèle>', $res->streamedContent());
    }

    /** Remplace Imagick (absent en test) par un rendu factice traçable. */
    private function fakeRasterizer(): void
    {
        $this->app->bind(InvitationCartonService::class, fn ($app) => new class($app->make(InvitationComposer::class)) extends InvitationCartonService {
            protected function canRasterize(): bool { return true; }
            protected function rasterize(string $pdf): ?string { return "JPEG<{$pdf}>"; }
        });
    }
}
