<?php

namespace Tests\Feature;

use App\Models\CardPrintRequest;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** File des demandes : recherche, « mes demandes », non attribuées, attribution à un collègue. */
class PrintQueueTeamTest extends TestCase
{
    use RefreshDatabase;

    private function internal(string $role = 'operator', array $attrs = []): User
    {
        return User::factory()->create(array_merge(['organization_id' => null, 'role' => $role], $attrs));
    }

    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }

    private function request(array $attrs = []): CardPrintRequest
    {
        return CardPrintRequest::create(array_merge([
            'source' => 'public', 'contact_name' => 'Awa Mbayo', 'contact_email' => 'awa@horizon.cd',
            'contact_company' => 'Clinique Horizon', 'quantity' => 10, 'status' => 'pending',
        ], $attrs));
    }

    private function refs($response): array
    {
        return collect($response->assertOk()->json('data'))->pluck('reference')->sort()->values()->all();
    }

    public function test_search_by_ticket_company_contact_or_organization(): void
    {
        $op = $this->internal();
        $a = $this->request();
        $b = $this->request(['contact_company' => 'Lycée Molière', 'contact_name' => 'Marc Lunda', 'contact_email' => 'marc@moliere.cd']);
        $org = Organization::factory()->create(['name' => 'Brasserie du Congo']);
        $c = $this->request(['source' => 'in_app', 'organization_id' => $org->id, 'contact_company' => null, 'contact_name' => null, 'contact_email' => null]);

        $this->assertSame([$a->reference], $this->refs($this->as($op)->getJson('/api/admin/print-requests?q=' . strtolower($a->reference))));
        $this->assertSame([$b->reference], $this->refs($this->as($op)->getJson('/api/admin/print-requests?q=MOLIÈRE')));
        $this->assertSame([$b->reference], $this->refs($this->as($op)->getJson('/api/admin/print-requests?q=marc@')));
        $this->assertSame([$c->reference], $this->refs($this->as($op)->getJson('/api/admin/print-requests?q=brasserie')));
        $this->assertSame([], $this->refs($this->as($op)->getJson('/api/admin/print-requests?q=introuvable')));
    }

    public function test_filters_mine_unassigned_and_by_colleague(): void
    {
        $me = $this->internal();
        $colleague = $this->internal();
        $mine = $this->request(['assigned_to' => $me->id]);
        $theirs = $this->request(['assigned_to' => $colleague->id]);
        $free = $this->request();

        $this->assertSame([$mine->reference], $this->refs($this->as($me)->getJson('/api/admin/print-requests?assigned=me')));
        $this->assertSame([$free->reference], $this->refs($this->as($me)->getJson('/api/admin/print-requests?assigned=none')));
        $this->assertSame([$theirs->reference], $this->refs($this->as($me)->getJson("/api/admin/print-requests?assigned={$colleague->id}")));
        $this->assertCount(3, $this->as($me)->getJson('/api/admin/print-requests')->json('data'));
    }

    public function test_export_follows_the_same_filters(): void
    {
        $op = $this->internal();
        $kept = $this->request(['assigned_to' => $op->id]);
        $other = $this->request();

        $csv = $this->as($op)->get('/api/admin/print-requests/export?assigned=me')->assertOk()->streamedContent();
        $this->assertStringContainsString($kept->reference, $csv);
        $this->assertStringNotContainsString($other->reference, $csv);
    }

    public function test_assign_to_a_colleague_reassign_and_release(): void
    {
        $op = $this->internal('operator', ['name' => 'Jean Ops']);
        $colleague = $this->internal('operator', ['name' => 'Marie Ops']);
        $req = $this->request();

        $this->as($op)->patchJson("/api/admin/print-requests/{$req->id}/assign", ['user_id' => $colleague->id])
            ->assertOk()->assertJsonPath('request.assigned_to', 'Marie Ops');
        $this->assertDatabaseHas('card_print_request_events', ['card_print_request_id' => $req->id, 'type' => 'assigned', 'message' => 'Attribuée à Marie Ops par Jean Ops.']);

        $this->as($op)->patchJson("/api/admin/print-requests/{$req->id}/assign", ['user_id' => $op->id])
            ->assertOk()->assertJsonPath('request.assigned_to', 'Jean Ops');

        $this->as($op)->patchJson("/api/admin/print-requests/{$req->id}/assign", ['user_id' => null])->assertOk();
        $this->assertNull($req->fresh()->assigned_to);
        $this->assertSame(3, $req->events()->where('type', 'assigned')->count());

        // Même attribution répétée : pas de doublon dans l'historique.
        $this->as($op)->patchJson("/api/admin/print-requests/{$req->id}/assign", ['user_id' => null])->assertOk();
        $this->assertSame(3, $req->events()->where('type', 'assigned')->count());
    }

    public function test_only_active_team_members_can_receive_a_request(): void
    {
        $op = $this->internal();
        $inactive = $this->internal('operator', ['is_active' => false]);
        $client = User::factory()->create(['organization_id' => Organization::factory()->create()->id, 'role' => 'admin']);
        $req = $this->request();

        $this->as($op)->patchJson("/api/admin/print-requests/{$req->id}/assign", ['user_id' => $inactive->id])->assertUnprocessable();
        $this->as($op)->patchJson("/api/admin/print-requests/{$req->id}/assign", ['user_id' => $client->id])->assertUnprocessable();

        $team = collect($this->as($op)->getJson('/api/admin/platform/team')->assertOk()->json('data'))->pluck('id');
        $this->assertTrue($team->contains($op->id));
        $this->assertFalse($team->contains($inactive->id));
        $this->assertFalse($team->contains($client->id));

        $this->assertContains($this->as($client)->patchJson("/api/admin/print-requests/{$req->id}/assign", ['user_id' => $op->id])->status(), [403, 404]);
        $this->as($client)->getJson('/api/admin/platform/team')->assertForbidden();
    }
}
