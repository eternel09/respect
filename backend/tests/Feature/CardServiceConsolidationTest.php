<?php

namespace Tests\Feature;

use App\Mail\CardPrintRequestDigest;
use App\Mail\CardPrintRequestStatusChanged;
use App\Models\CardPrintRequest;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Consolidation du service de cartes : notification du client à chaque
 * avancement, tableau de bord opérateur, bon de livraison PDF, relance.
 */
class CardServiceConsolidationTest extends TestCase
{
    use RefreshDatabase;

    private function internal(string $role = 'operator'): User
    {
        return User::factory()->create(['organization_id' => null, 'role' => $role]);
    }

    private function orgAdmin(): User
    {
        return User::factory()->create(['organization_id' => Organization::factory()->create()->id, 'role' => 'admin']);
    }

    private function publicRequest(array $attrs = []): CardPrintRequest
    {
        return CardPrintRequest::create(array_merge([
            'source' => 'public', 'contact_name' => 'Awa', 'contact_email' => 'awa@horizon.cd',
            'quantity' => 40, 'status' => 'pending',
        ], $attrs));
    }

    private function ageRequest(CardPrintRequest $req, int $hours): void
    {
        DB::table('card_print_requests')->where('id', $req->id)->update(['updated_at' => now()->subHours($hours)]);
    }

    // ── Notification du client ──────────────────────────────────

    public function test_client_is_notified_when_status_changes(): void
    {
        Mail::fake();
        $req = $this->publicRequest();

        $this->withToken($this->internal()->createToken('t')->plainTextToken)
            ->patchJson("/api/admin/print-requests/{$req->id}", ['status' => 'in_progress'])->assertOk();

        Mail::assertSent(CardPrintRequestStatusChanged::class, fn ($m) => $m->hasTo('awa@horizon.cd'));
    }

    public function test_no_notification_when_status_unchanged_or_back_to_pending(): void
    {
        Mail::fake();
        $req = $this->publicRequest(['status' => 'in_progress']);
        $token = $this->internal()->createToken('t')->plainTextToken;

        $this->withToken($token)->patchJson("/api/admin/print-requests/{$req->id}", ['status' => 'in_progress'])->assertOk();
        $this->withToken($token)->patchJson("/api/admin/print-requests/{$req->id}", ['status' => 'pending'])->assertOk();

        Mail::assertNotSent(CardPrintRequestStatusChanged::class);
    }

    public function test_in_app_request_notifies_the_requesting_user(): void
    {
        Mail::fake();
        $admin = $this->orgAdmin();
        $req = CardPrintRequest::create([
            'organization_id' => $admin->organization_id, 'requested_by' => $admin->id,
            'source' => 'in_app', 'quantity' => 10, 'status' => 'pending',
        ]);

        $this->withToken($this->internal()->createToken('t')->plainTextToken)
            ->patchJson("/api/admin/print-requests/{$req->id}", ['status' => 'done'])->assertOk();

        Mail::assertSent(CardPrintRequestStatusChanged::class, fn ($m) => $m->hasTo($admin->email));
    }

    public function test_in_app_request_notifies_the_team(): void
    {
        Mail::fake();
        $op = $this->internal('operator');
        $admin = $this->orgAdmin();

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/admin/card-print-requests', ['quantity' => 25])
            ->assertCreated();

        Mail::assertSent(\App\Mail\CardPrintRequestReceived::class, fn ($m) => $m->hasTo($op->email));
    }

    // ── Tableau de bord ─────────────────────────────────────────

    public function test_stats_count_by_status_source_and_stale(): void
    {
        $this->publicRequest(['quantity' => 40]);
        $old = $this->publicRequest(['quantity' => 60, 'status' => 'in_progress']);
        $this->publicRequest(['quantity' => 10, 'status' => 'done']);
        $this->ageRequest($old, 72); // > 48 h sans avancement

        $this->withToken($this->internal()->createToken('t')->plainTextToken)
            ->getJson('/api/admin/print-requests/stats')
            ->assertOk()
            ->assertJsonPath('by_status.pending', 1)
            ->assertJsonPath('by_status.in_progress', 1)
            ->assertJsonPath('by_status.done', 1)
            ->assertJsonPath('by_source.public', 3)
            ->assertJsonPath('open_cards', 100) // 40 + 60, les terminées exclues
            ->assertJsonPath('stale', 1);
    }

    public function test_org_admin_cannot_read_stats_or_delivery_note(): void
    {
        // Demande de sa propre organisation : le binding résout, c'est bien le
        // middleware de rôle (et non un 404 de scope) qui refuse l'accès.
        $admin = $this->orgAdmin();
        $req = CardPrintRequest::create([
            'organization_id' => $admin->organization_id, 'source' => 'in_app', 'quantity' => 5, 'status' => 'pending',
        ]);
        $token = $admin->createToken('t')->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/print-requests/stats')->assertForbidden();
        $this->withToken($token)->get("/api/admin/print-requests/{$req->id}/delivery-note")->assertForbidden();
    }

    // ── Bon de livraison ────────────────────────────────────────

    public function test_operator_downloads_delivery_note_pdf(): void
    {
        $req = $this->publicRequest(['delivery_address' => '12 av. de la Paix, Kinshasa']);

        $res = $this->withToken($this->internal()->createToken('t')->plainTextToken)
            ->get("/api/admin/print-requests/{$req->id}/delivery-note");

        $res->assertOk();
        $this->assertStringContainsString('application/pdf', $res->headers->get('content-type'));
        $this->assertStringContainsString($req->reference, $res->headers->get('content-disposition'));
    }

    // ── Relance ─────────────────────────────────────────────────

    public function test_reminder_sends_digest_of_stale_requests_to_team(): void
    {
        Mail::fake();
        $op = $this->internal('operator');
        $stale = $this->publicRequest();
        $this->publicRequest(); // récente → pas dans la relance
        $this->ageRequest($stale, 72);

        $this->artisan('cards:remind-stale')->assertSuccessful();

        Mail::assertSent(CardPrintRequestDigest::class, fn ($m) =>
            $m->hasTo($op->email) && $m->requests->count() === 1 && $m->requests->first()->id === $stale->id);
    }

    public function test_reminder_is_silent_without_stale_requests(): void
    {
        Mail::fake();
        $this->internal('operator');
        $this->publicRequest(); // récente

        $this->artisan('cards:remind-stale')->assertSuccessful();

        Mail::assertNothingSent();
    }
}
