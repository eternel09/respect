<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Modèle d'invitation PDF : conservé tel quel + repères tamponnés à l'envoi. */
class OccasionInvitationPdfTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $admin;
    private Occasion $occasion;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create();
        $this->admin = User::factory()->create(['organization_id' => $this->org->id, 'role' => 'admin']);
        $this->occasion = Occasion::create([
            'organization_id' => $this->org->id, 'name' => 'Mariage', 'type' => 'mariage',
            'date' => now()->addWeek()->toDateString(),
        ]);
    }

    private function admin()
    {
        return $this->withToken($this->admin->createToken('t')->plainTextToken);
    }

    private function fakePdf(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            'carton.pdf',
            "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
        );
    }

    public function test_pdf_template_is_stored_as_pdf_not_rasterized(): void
    {
        Storage::fake('public');

        $this->admin()
            ->postJson("/api/occasions/{$this->occasion->id}/invitation-bg", ['invitation' => $this->fakePdf()])
            ->assertOk();

        $this->occasion->refresh();
        $this->assertStringEndsWith('.pdf', $this->occasion->invitation_bg_path);
        $this->assertTrue($this->occasion->invitationIsPdf());
        Storage::disk('public')->assertExists($this->occasion->invitation_bg_path);
    }

    public function test_show_reports_invitation_is_pdf(): void
    {
        Storage::fake('public');
        $this->admin()->postJson("/api/occasions/{$this->occasion->id}/invitation-bg", ['invitation' => $this->fakePdf()]);

        $this->admin()->getJson("/api/occasions/{$this->occasion->id}")
            ->assertOk()
            ->assertJsonPath('occasion.invitation_is_pdf', true);
    }

    public function test_invalid_pdf_header_is_rejected(): void
    {
        Storage::fake('public');
        $bad = UploadedFile::fake()->createWithContent('carton.pdf', 'PAS-UN-PDF');

        $this->admin()
            ->postJson("/api/occasions/{$this->occasion->id}/invitation-bg", ['invitation' => $bad])
            ->assertStatus(422);
    }

    public function test_send_uses_pdf_template_payload(): void
    {
        Storage::fake('public');
        Http::fake(['*' => Http::response(['sent' => true], 200)]);

        $this->admin()->postJson("/api/occasions/{$this->occasion->id}/invitation-bg", ['invitation' => $this->fakePdf()]);

        $guest = Guest::create([
            'organization_id' => $this->org->id, 'occasion_id' => $this->occasion->id,
            'name' => 'M. Kalala', 'phone' => '+243810000000',
        ]);

        $this->admin()->postJson("/api/guests/{$guest->id}/invite")->assertOk();

        Http::assertSent(function ($request) use ($guest) {
            return str_contains($request->url(), '/send-invitation')
                && ! empty($request['templatePdfBase64'])
                && $request['qrText'] === $guest->token
                && ! isset($request['backgroundDataUri']);
        });
    }
}
