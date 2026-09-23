<?php

namespace Tests\Feature;

use App\Models\Occasion;
use App\Models\Organization;
use App\Models\Ticket;
use App\Models\TicketOrder;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Billetterie : catégories, achat public, quota, paiement, e-billets, scan. */
class TicketingTest extends TestCase
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

    private function type(array $attrs = []): TicketType
    {
        return TicketType::create(array_merge([
            'organization_id' => $this->org->id,
            'occasion_id'     => $this->occasion->id,
            'name'            => 'Standard',
            'price_cents'     => 500000,   // 5000 CDF
            'currency'        => 'CDF',
            'quota'           => 10,
            'is_active'       => true,
        ], $attrs));
    }

    public function test_admin_manages_ticket_types(): void
    {
        $this->admin()
            ->postJson("/api/occasions/{$this->occasion->id}/ticket-types", [
                'name' => 'VIP', 'price_cents' => 2000000, 'quota' => 5,
            ])
            ->assertCreated()
            ->assertJsonPath('name', 'VIP')
            ->assertJsonPath('remaining', 5);

        $this->admin()->getJson("/api/occasions/{$this->occasion->id}/ticket-types")
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_public_purchase_reserves_tickets_pending(): void
    {
        $type = $this->type(['quota' => 10]);

        $res = $this->postJson("/api/public/occasions/{$this->occasion->id}/orders", [
            'buyer_name' => 'Jean', 'buyer_phone' => '+243810000001',
            'items' => [['ticket_type_id' => $type->id, 'quantity' => 3]],
        ])->assertCreated()
          ->assertJsonPath('order.status', 'pending')
          ->assertJsonPath('order.total_cents', 1500000)
          ->assertJsonPath('payment.status', 'pending');

        $this->assertCount(3, $res->json('order.tickets'));
        $this->assertSame(3, $type->fresh()->soldCount()); // réservé compte dans le quota
        $this->assertSame(7, $type->fresh()->remaining());
    }

    public function test_quota_prevents_oversell(): void
    {
        $type = $this->type(['quota' => 2]);

        $this->postJson("/api/public/occasions/{$this->occasion->id}/orders", [
            'buyer_name' => 'Jean',
            'items' => [['ticket_type_id' => $type->id, 'quantity' => 3]],
        ])->assertStatus(422);

        $this->assertSame(0, $type->fresh()->soldCount()); // rien de réservé (transaction annulée)
    }

    public function test_unlimited_quota_allows_any_quantity(): void
    {
        $type = $this->type(['quota' => null]);

        $this->postJson("/api/public/occasions/{$this->occasion->id}/orders", [
            'buyer_name' => 'Jean',
            'items' => [['ticket_type_id' => $type->id, 'quantity' => 40]],
        ])->assertCreated();
        $this->assertSame(40, $type->fresh()->soldCount());
        $this->assertNull($type->fresh()->remaining());
    }

    public function test_mark_paid_then_eticket_downloadable(): void
    {
        $type = $this->type();
        $order = app(\App\Services\TicketOrderService::class)->create(
            $this->occasion, ['buyer_name' => 'Jean'], [['ticket_type_id' => $type->id, 'quantity' => 2]]
        );

        // Avant paiement : e-billets refusés
        $this->get("/api/download/orders/{$order->token}/tickets")->assertForbidden();

        $this->admin()->postJson("/api/ticket-orders/{$order->id}/mark-paid")
            ->assertOk()->assertJsonPath('order.status', 'paid');

        // Après paiement : PDF téléchargeable
        $res = $this->get("/api/download/orders/{$order->token}/tickets");
        $res->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('content-type'));
    }

    public function test_cancel_releases_quota(): void
    {
        $type = $this->type(['quota' => 5]);
        $order = app(\App\Services\TicketOrderService::class)->create(
            $this->occasion, ['buyer_name' => 'Jean'], [['ticket_type_id' => $type->id, 'quantity' => 4]]
        );
        $this->assertSame(1, $type->fresh()->remaining());

        $this->admin()->postJson("/api/ticket-orders/{$order->id}/cancel")->assertOk();

        $this->assertSame(5, $type->fresh()->remaining()); // places rendues
        $this->assertSame('void', $order->tickets()->first()->status);
    }

    public function test_manual_sale_is_paid_immediately(): void
    {
        $type = $this->type();

        $this->admin()
            ->postJson("/api/occasions/{$this->occasion->id}/orders/manual", [
                'buyer_name' => 'Guichet',
                'items' => [['ticket_type_id' => $type->id, 'quantity' => 1]],
            ])
            ->assertCreated()
            ->assertJsonPath('status', 'paid');
    }

    public function test_checkin_admits_a_paid_ticket_once(): void
    {
        $type = $this->type();
        $order = app(\App\Services\TicketOrderService::class)->create(
            $this->occasion, ['buyer_name' => 'Jean'], [['ticket_type_id' => $type->id, 'quantity' => 1]]
        );
        $ticket = $order->tickets()->first();

        $scanner = User::factory()->create(['organization_id' => $this->org->id, 'role' => 'scanner']);
        $scan = fn () => $this->withToken($scanner->createToken('s')->plainTextToken)
            ->postJson('/api/occasion-scan/ticket', ['token' => $ticket->token, 'occasion_id' => $this->occasion->id]);

        // Non payé → refusé
        $scan()->assertOk()->assertJsonPath('status', 'invalid');

        // Payé → admis une fois, puis « déjà entré »
        app(\App\Services\TicketOrderService::class)->markPaid($order);
        $scan()->assertOk()->assertJsonPath('status', 'checked_in');
        $scan()->assertOk()->assertJsonPath('status', 'already');

        $this->assertSame('used', $ticket->fresh()->status);
    }

    public function test_other_organization_cannot_manage_types(): void
    {
        $type = $this->type();
        $otherAdmin = User::factory()->create([
            'organization_id' => Organization::factory()->create()->id, 'role' => 'admin',
        ]);

        $this->withToken($otherAdmin->createToken('t')->plainTextToken)
            ->putJson("/api/ticket-types/{$type->id}", ['name' => 'Pirate'])
            ->assertNotFound();
    }
}
