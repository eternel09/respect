<?php

namespace Tests\Feature;

use App\Models\CardPrintRequest;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Demandes d'impression de cartes de service : l'entreprise (admin) demande à
 * l'opérateur (super-admin) de faire imprimer ses cartes, puis suit le statut.
 */
class CardPrintRequestTest extends TestCase
{
    use RefreshDatabase;

    private function admin(?Organization $org = null): User
    {
        return User::factory()->create([
            'organization_id' => ($org ?? Organization::factory()->create())->id,
            'role'            => 'admin',
        ]);
    }

    private function superAdmin(): User
    {
        return User::factory()->create(['organization_id' => null, 'role' => 'super_admin']);
    }

    private function token(User $u): string
    {
        return $u->createToken('t')->plainTextToken;
    }

    public function test_enterprise_creates_and_lists_its_requests(): void
    {
        $admin = $this->admin();
        $token = $this->token($admin);

        $this->withToken($token)
            ->postJson('/api/admin/card-print-requests', [
                'quantity'         => 120,
                'note'             => 'Cartes PVC, finition mate',
                'delivery_address' => '12 av. de la Paix, Kinshasa',
            ])
            ->assertCreated()
            ->assertJsonPath('request.quantity', 120)
            ->assertJsonPath('request.status', 'pending');

        $this->assertDatabaseHas('card_print_requests', [
            'organization_id' => $admin->organization_id,
            'requested_by'    => $admin->id,
            'quantity'        => 120,
            'status'          => 'pending',
        ]);

        $this->withToken($token)->getJson('/api/admin/card-print-requests')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.quantity', 120);
    }

    public function test_enterprise_only_sees_its_own_requests(): void
    {
        $mine = $this->admin();
        $otherOrg = Organization::factory()->create();
        CardPrintRequest::create([
            'organization_id' => $otherOrg->id, 'quantity' => 50, 'status' => 'pending',
        ]);

        $this->withToken($this->token($mine))->getJson('/api/admin/card-print-requests')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_quantity_is_validated(): void
    {
        $this->withToken($this->token($this->admin()))
            ->postJson('/api/admin/card-print-requests', ['quantity' => 0])
            ->assertStatus(422);
    }

    public function test_operator_sees_all_requests_and_updates_status(): void
    {
        $orgA = Organization::factory()->create();
        $orgB = Organization::factory()->create();
        $reqA = CardPrintRequest::create(['organization_id' => $orgA->id, 'quantity' => 10, 'status' => 'pending']);
        CardPrintRequest::create(['organization_id' => $orgB->id, 'quantity' => 20, 'status' => 'pending']);

        $op = $this->superAdmin();
        $token = $this->token($op);

        $this->withToken($token)->getJson('/api/admin/print-requests')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 2);

        $this->withToken($token)
            ->patchJson("/api/admin/print-requests/{$reqA->id}", ['status' => 'done'])
            ->assertOk()
            ->assertJsonPath('request.status', 'done');

        $fresh = $reqA->fresh();
        $this->assertSame('done', $fresh->status);
        $this->assertSame($op->id, $fresh->handled_by);
        $this->assertNotNull($fresh->handled_at);
    }

    public function test_operator_can_filter_by_status(): void
    {
        $org = Organization::factory()->create();
        CardPrintRequest::create(['organization_id' => $org->id, 'quantity' => 10, 'status' => 'pending']);
        CardPrintRequest::create(['organization_id' => $org->id, 'quantity' => 20, 'status' => 'done']);

        $this->withToken($this->token($this->superAdmin()))
            ->getJson('/api/admin/print-requests?status=done')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'done');
    }

    public function test_enterprise_admin_cannot_reach_operator_routes(): void
    {
        // La demande appartient à l'org de l'admin : le binding résout, c'est
        // bien le middleware de rôle (et non un 404 de scope) qui refuse l'accès.
        $admin = $this->admin();
        $req = CardPrintRequest::create([
            'organization_id' => $admin->organization_id, 'quantity' => 10, 'status' => 'pending',
        ]);

        $token = $this->token($admin);

        $this->withToken($token)->getJson('/api/admin/print-requests')->assertForbidden();
        $this->withToken($token)
            ->patchJson("/api/admin/print-requests/{$req->id}", ['status' => 'done'])
            ->assertForbidden();
    }

    public function test_secretaire_cannot_create_request(): void
    {
        $sec = User::factory()->create([
            'organization_id' => Organization::factory()->create()->id, 'role' => 'secretaire',
        ]);

        $this->withToken($this->token($sec))
            ->postJson('/api/admin/card-print-requests', ['quantity' => 10])
            ->assertForbidden();
    }

    // ── Portail public (prospect sans compte) ───────────────────

    public function test_public_visitor_can_submit_a_request_without_account(): void
    {
        $this->postJson('/api/public/card-print-requests', [
            'contact_name'    => 'Awa Mbayo',
            'contact_company' => 'Clinique Horizon',
            'contact_email'   => 'awa@horizon.cd',
            'contact_phone'   => '+243900000000',
            'quantity'        => 80,
            'note'            => 'Badges du personnel soignant',
        ])->assertCreated()
          ->assertJson(fn ($j) => $j->where('message', fn ($v) => is_string($v))->etc());

        $this->assertDatabaseHas('card_print_requests', [
            'organization_id' => null,
            'requested_by'    => null,
            'source'          => 'public',
            'contact_email'   => 'awa@horizon.cd',
            'quantity'        => 80,
            'status'          => 'pending',
        ]);
    }

    public function test_public_request_requires_contact_and_quantity(): void
    {
        $this->postJson('/api/public/card-print-requests', ['note' => 'incomplet'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['contact_name', 'contact_email', 'quantity']);
    }

    public function test_public_request_can_attach_a_design(): void
    {
        Storage::fake('public');

        $this->postJson('/api/public/card-print-requests', [
            'contact_name'  => 'Awa Mbayo',
            'contact_email' => 'awa@horizon.cd',
            'quantity'      => 50,
            'design'        => UploadedFile::fake()->image('carte.png', 1000, 620),
        ])->assertCreated();

        $req = CardPrintRequest::withoutGlobalScopes()->firstOrFail();
        $this->assertNotNull($req->design_path);
        Storage::disk('public')->assertExists($req->design_path);
    }

    public function test_honeypot_silently_absorbs_bots(): void
    {
        $this->postJson('/api/public/card-print-requests', [
            'contact_name'  => 'Bot',
            'contact_email' => 'bot@spam.test',
            'quantity'      => 10,
            'website'       => 'http://spam.example', // champ piège
        ])->assertCreated();

        $this->assertDatabaseCount('card_print_requests', 0);
    }

    public function test_operator_sees_public_requests_and_take_self_assigns(): void
    {
        $req = CardPrintRequest::create([
            'source' => 'public', 'contact_name' => 'Awa', 'contact_email' => 'awa@horizon.cd',
            'quantity' => 40, 'status' => 'pending',
        ]);

        $op = $this->superAdmin();
        $token = $this->token($op);

        // Visible dans la file opérateur, filtrable par canal.
        $this->withToken($token)->getJson('/api/admin/print-requests?source=public')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.source', 'public');

        // « Prendre en charge » → affectation automatique à l'opérateur.
        $this->withToken($token)
            ->patchJson("/api/admin/print-requests/{$req->id}", ['status' => 'in_progress'])
            ->assertOk()
            ->assertJsonPath('request.status', 'in_progress')
            ->assertJsonPath('request.assigned_to', $op->name);

        $this->assertSame($op->id, $req->fresh()->assigned_to);
    }
}
