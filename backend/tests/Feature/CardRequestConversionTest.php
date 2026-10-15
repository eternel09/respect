<?php

namespace Tests\Feature;

use App\Mail\OrganizationAdminWelcome;
use App\Models\CardPrintRequest;
use App\Models\Member;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Étape 1.7 — liste du personnel jointe sur le portail public, puis conversion
 * de la demande en organisation cliente : le personnel devient ses membres.
 */
class CardRequestConversionTest extends TestCase
{
    use RefreshDatabase;

    private function internal(string $role = 'super_admin'): User
    {
        return User::factory()->create(['organization_id' => null, 'role' => $role]);
    }

    private function orgAdmin(?Organization $org = null): User
    {
        return User::factory()->create(['organization_id' => ($org ?? Organization::factory()->create())->id, 'role' => 'admin']);
    }

    /** Requêtes au nom d'un utilisateur (garde réinitialisé : pas de mémoire du précédent). */
    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }

    /** Refus pour un client : 403 (rôle) ou 404 (la demande d'autrui lui est invisible). */
    private function assertDenied($response): void
    {
        $this->assertContains($response->status(), [403, 404]);
    }

    private function portalPayload(array $overrides = []): array
    {
        return array_merge([
            'contact_name'    => 'Awa Mbayo',
            'contact_company' => 'Clinique Horizon',
            'contact_email'   => 'awa@horizon.cd',
            'member_term'     => 'employe',
            'staff' => [
                ['first_name' => 'Jean', 'last_name' => 'Kabila', 'phone' => '+243 81 234 5678', 'job_title' => 'Infirmier', 'department' => 'Urgences', 'staff_id' => 'H-001'],
                ['first_name' => '', 'last_name' => '  Grâce   Nkosi ', 'phone' => 'n/a'],
            ],
        ], $overrides);
    }

    private function submitted(array $overrides = []): CardPrintRequest
    {
        Mail::fake();
        $this->postJson('/api/public/card-print-requests', $this->portalPayload($overrides))->assertCreated();

        return CardPrintRequest::withoutGlobalScopes()->latest('id')->firstOrFail();
    }

    private function convert(CardPrintRequest $req, array $overrides = [])
    {
        return $this->as($this->internal())->postJson("/api/admin/print-requests/{$req->id}/convert", array_merge([
            'name' => 'Clinique Horizon', 'admin_name' => 'Awa Mbayo', 'admin_email' => 'awa@horizon.cd',
        ], $overrides));
    }

    // ── Portail public : liste jointe ───────────────────────────

    public function test_portal_stores_a_cleaned_staff_list_and_derives_the_quantity(): void
    {
        $req = $this->submitted();

        $this->assertSame(2, $req->quantity);
        $this->assertSame('employe', $req->member_term);
        $this->assertSame('+243812345678', $req->staff[0]['phone']);   // espaces retirés
        $this->assertSame('Grâce Nkosi', $req->staff[1]['last_name']);  // espaces normalisés
        $this->assertNull($req->staff[1]['phone']);                     // numéro invalide écarté
    }

    public function test_quantity_is_required_only_without_a_staff_list(): void
    {
        $this->postJson('/api/public/card-print-requests', $this->portalPayload(['staff' => null]))
            ->assertUnprocessable()->assertJsonValidationErrors('quantity');

        $this->postJson('/api/public/card-print-requests', $this->portalPayload(['staff' => [['first_name' => 'Sans nom']]]))
            ->assertUnprocessable()->assertJsonValidationErrors('staff.0.last_name');
    }

    public function test_malformed_rows_are_rejected_cleanly(): void
    {
        $this->postJson('/api/public/card-print-requests', $this->portalPayload(['staff' => [
            ['last_name' => str_repeat('x', 101)], 'pas une ligne', ['last_name' => ['tableau']], ['last_name' => 'Ok', 'phone' => ['x' => 1]],
        ]]))->assertUnprocessable()
            ->assertJsonValidationErrors(['staff.0.last_name', 'staff.1', 'staff.2.last_name', 'staff.3.phone']);
    }

    public function test_staff_list_never_leaks_to_the_public_tracking_page(): void
    {
        $req = $this->submitted();

        $res = $this->getJson("/api/public/card-print-requests/{$req->public_token}")->assertOk();
        $this->assertStringNotContainsString('Kabila', $res->getContent());
    }

    public function test_team_sees_the_staff_count_and_list_but_clients_do_not(): void
    {
        $req = $this->submitted();

        $this->as($this->internal('operator'))->getJson('/api/admin/print-requests')
            ->assertOk()->assertJsonPath('data.0.staff_count', 2)->assertJsonMissing(['last_name' => 'Kabila']);
        $this->as($this->internal('operator'))->getJson("/api/admin/print-requests/{$req->id}/staff")
            ->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.last_name', 'Kabila');

        $this->assertDenied($this->as($this->orgAdmin())->getJson("/api/admin/print-requests/{$req->id}/staff"));
    }

    // ── Conversion en organisation cliente ──────────────────────

    public function test_super_admin_converts_a_request_into_a_client_with_its_staff(): void
    {
        $req = $this->submitted();

        $res = $this->convert($req)->assertCreated()
            ->assertJsonPath('imported', 2)
            ->assertJsonPath('request.organization.name', 'Clinique Horizon');
        $this->assertNotEmpty($res->json('temp_password'));

        $org = Organization::where('name', 'Clinique Horizon')->firstOrFail();
        $this->assertSame('employe', $org->member_term);       // vocabulaire choisi par le client
        $this->assertSame($org->id, $req->fresh()->organization_id);
        $this->assertDatabaseHas('users', ['email' => 'awa@horizon.cd', 'role' => 'admin', 'organization_id' => $org->id]);
        Mail::assertSent(OrganizationAdminWelcome::class, fn ($m) => $m->hasTo('awa@horizon.cd'));

        $jean = Member::withoutGlobalScopes()->where('organization_id', $org->id)->where('last_name', 'Kabila')->firstOrFail();
        $this->assertSame(['Infirmier', 'Urgences', 'H-001', '+243812345678'], [$jean->job_title, $jean->department, $jean->staff_id, $jean->phone]);
        $this->assertNotEmpty($jean->check_in_token); // QR personnel prêt pour carte et pointage
        $this->assertDatabaseHas('card_print_request_events', ['card_print_request_id' => $req->id, 'type' => 'converted']);
    }

    public function test_client_admin_finds_the_staff_in_their_back_office_and_nobody_else_does(): void
    {
        $req = $this->submitted();
        $this->convert($req)->assertCreated();
        $org = Organization::where('name', 'Clinique Horizon')->firstOrFail();

        $this->as($this->orgAdmin($org))->getJson('/api/admin/members')
            ->assertOk()->assertJsonCount(2, 'data')->assertJsonFragment(['last_name' => 'Kabila']);

        $this->as($this->orgAdmin())->getJson('/api/admin/members')
            ->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_term_defaults_to_agent_and_can_be_overridden_at_conversion(): void
    {
        $req = $this->submitted(['member_term' => null]);
        $this->convert($req)->assertCreated();
        $this->assertSame('agent', Organization::where('name', 'Clinique Horizon')->value('member_term'));

        $other = $this->submitted(['contact_email' => 'rh@acme.cd', 'member_term' => 'employe']);
        $this->convert($other, ['name' => 'Acme', 'admin_email' => 'rh@acme.cd', 'member_term' => 'membre'])->assertCreated();
        $this->assertSame('membre', Organization::where('name', 'Acme')->value('member_term'));
    }

    public function test_a_phone_already_used_on_the_platform_does_not_block_the_import(): void
    {
        $other = Organization::factory()->create();
        Member::create(['organization_id' => $other->id, 'first_name' => 'X', 'last_name' => 'Y', 'phone' => '+243812345678']);

        $req = $this->submitted(['staff' => [
            ['first_name' => 'Jean', 'last_name' => 'Kabila', 'phone' => '+243812345678'],
            ['first_name' => 'Paul', 'last_name' => 'Mbuyi', 'phone' => '+243899999999'],
            ['first_name' => 'Doublon', 'last_name' => 'Mbuyi', 'phone' => '+243899999999'],
        ]]);

        $this->convert($req)->assertCreated()->assertJsonPath('imported', 3)->assertJsonPath('phones_dropped', 2);
        $this->assertSame(1, Member::withoutGlobalScopes()->where('phone', '+243812345678')->count());
    }

    public function test_conversion_is_reserved_to_super_admin_and_happens_once(): void
    {
        $req = $this->submitted();

        $this->as($this->internal('operator'))->postJson("/api/admin/print-requests/{$req->id}/convert", [
            'name' => 'X', 'admin_name' => 'Y', 'admin_email' => 'y@x.cd',
        ])->assertForbidden();
        $this->assertDenied($this->as($this->orgAdmin())->postJson("/api/admin/print-requests/{$req->id}/convert", [
            'name' => 'X', 'admin_name' => 'Y', 'admin_email' => 'y@x.cd',
        ]));

        $this->convert($req)->assertCreated();
        $this->convert($req, ['admin_email' => 'autre@horizon.cd'])->assertUnprocessable();
        $this->assertSame(1, Organization::where('name', 'Clinique Horizon')->count());
    }

    public function test_failed_conversion_leaves_nothing_behind(): void
    {
        User::factory()->create(['email' => 'pris@horizon.cd']);
        $req = $this->submitted();

        $this->convert($req, ['admin_email' => 'pris@horizon.cd'])->assertUnprocessable()->assertJsonValidationErrors('admin_email');
        $this->assertNull($req->fresh()->organization_id);
        $this->assertSame(0, Member::withoutGlobalScopes()->count());
    }

    // ── Cartes du client, imprimées par l'équipe ────────────────

    public function test_team_downloads_the_cards_of_a_converted_request(): void
    {
        Http::fake(['*/print-cards' => Http::response('%PDF-1.4 fake', 200, ['Content-Type' => 'application/pdf'])]);
        $req = $this->submitted();

        $this->as($this->internal('operator'))->get("/api/admin/print-requests/{$req->id}/cards")->assertStatus(422);

        $this->convert($req)->assertCreated();
        $this->as($this->internal('operator'))->get("/api/admin/print-requests/{$req->id}/cards?layout=single")
            ->assertOk()->assertHeader('Content-Type', 'application/pdf');

        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/print-cards')
            && count($r['members']) === 2 && $r['layout'] === 'single'
            && collect($r['members'])->contains(fn ($m) => $m['name'] === 'Jean Kabila' && $m['staffId'] === 'H-001'));

        $this->assertDenied($this->as($this->orgAdmin())->get("/api/admin/print-requests/{$req->id}/cards"));
    }
}
