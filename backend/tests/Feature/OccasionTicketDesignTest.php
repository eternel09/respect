<?php

namespace Tests\Feature;

use App\Models\Occasion;
use App\Models\Organization;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Visuel de billet personnalisé : téléversement / retrait ; le e-billet l'utilise
 * en en-tête (QR conservé sur zone blanche). Sans lui, design standard.
 */
class OccasionTicketDesignTest extends TestCase
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
            'organization_id' => $this->org->id, 'name' => 'Concert', 'type' => 'concert',
            'date' => now()->addWeek()->toDateString(),
        ]);
    }

    private function admin()
    {
        return $this->withToken($this->admin->createToken('t')->plainTextToken);
    }

    public function test_admin_uploads_and_removes_ticket_design(): void
    {
        Storage::fake('public');

        $this->admin()
            ->postJson("/api/occasions/{$this->occasion->id}/ticket-design", [
                'design' => UploadedFile::fake()->image('billet.png', 1000, 600),
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Visuel de billet enregistré.')
            ->assertJson(fn ($j) => $j->whereType('ticket_design_url', 'string')->etc());

        $this->occasion->refresh();
        $this->assertNotNull($this->occasion->ticket_design_path);
        $this->assertStringEndsWith('.jpg', $this->occasion->ticket_design_path); // normalisé
        Storage::disk('public')->assertExists($this->occasion->ticket_design_path);

        // Exposé sur la ressource
        $this->admin()->getJson("/api/occasions/{$this->occasion->id}")
            ->assertOk()->assertJson(fn ($j) => $j->where('occasion.ticket_design_url', fn ($v) => is_string($v))->etc());

        // Retrait → revient au design standard
        $this->admin()->deleteJson("/api/occasions/{$this->occasion->id}/ticket-design")
            ->assertOk()->assertJsonPath('message', 'Visuel de billet retiré.');
        $this->assertNull($this->occasion->refresh()->ticket_design_path);
    }

    public function test_pdf_is_wrong_format_rejected(): void
    {
        Storage::fake('public');

        $this->admin()
            ->postJson("/api/occasions/{$this->occasion->id}/ticket-design", [
                'design' => UploadedFile::fake()->create('billet.pdf', 100, 'application/pdf'),
            ])
            ->assertStatus(422);

        $this->assertNull($this->occasion->refresh()->ticket_design_path);
    }

    public function test_eticket_renders_with_custom_design(): void
    {
        Storage::fake('public');

        $this->admin()->postJson("/api/occasions/{$this->occasion->id}/ticket-design", [
            'design' => UploadedFile::fake()->image('billet.png', 1000, 600),
        ])->assertOk();

        $type = TicketType::create([
            'organization_id' => $this->org->id, 'occasion_id' => $this->occasion->id,
            'name' => 'Standard', 'price_cents' => 500000, 'currency' => 'CDF', 'quota' => 10, 'is_active' => true,
        ]);
        $order = app(\App\Services\TicketOrderService::class)->create(
            $this->occasion, ['buyer_name' => 'Jean'], [['ticket_type_id' => $type->id, 'quantity' => 1]]
        );
        app(\App\Services\TicketOrderService::class)->markPaid($order);

        $res = $this->get("/api/download/orders/{$order->token}/tickets");
        $res->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('content-type'));
    }

    public function test_other_organization_cannot_upload(): void
    {
        Storage::fake('public');
        $outsider = User::factory()->create([
            'organization_id' => Organization::factory()->create()->id, 'role' => 'admin',
        ]);

        $this->withToken($outsider->createToken('t')->plainTextToken)
            ->postJson("/api/occasions/{$this->occasion->id}/ticket-design", [
                'design' => UploadedFile::fake()->image('x.png'),
            ])
            ->assertNotFound();
    }
}
