<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Numéro WhatsApp d'envoi = celui de l'équipe plateforme (une seule session
 * pour toutes les organisations) : seul le super-admin reçoit le QR de liaison
 * et peut délier le numéro.
 */
class WhatsAppNumberAccessTest extends TestCase
{
    use RefreshDatabase;

    private const QR = 'data:image/png;base64,QRDELIAISON';

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake([
            '*/status' => Http::response(['state' => 'qr', 'qr' => self::QR]),
            '*/logout' => Http::response(['ok' => true, 'state' => 'starting']),
        ]);
    }

    private function user(string $role, bool $internal): User
    {
        return User::factory()->create([
            'organization_id' => $internal ? null : Organization::factory()->create()->id,
            'role'            => $role,
        ]);
    }

    private function token(User $u): string
    {
        // Le garde d'auth mémorise l'utilisateur d'une requête à l'autre dans un
        // même test : on le réinitialise pour que chaque appel teste SON rôle.
        $this->app['auth']->forgetGuards();

        return $u->createToken('t')->plainTextToken;
    }

    public function test_organization_sees_the_state_but_never_the_qr(): void
    {
        $this->withToken($this->token($this->user('admin', false)))
            ->getJson('/api/admin/whatsapp/status')
            ->assertOk()
            ->assertJsonPath('state', 'qr')
            ->assertJsonPath('qr', null)
            ->assertJsonPath('managed_by_platform', true);
    }

    public function test_super_admin_gets_the_linking_qr(): void
    {
        $this->withToken($this->token($this->user('super_admin', true)))
            ->getJson('/api/admin/platform/whatsapp')
            ->assertOk()
            ->assertJsonPath('qr', self::QR);
    }

    public function test_operator_sees_the_state_but_not_the_qr(): void
    {
        $this->withToken($this->token($this->user('operator', true)))
            ->getJson('/api/admin/platform/whatsapp')
            ->assertOk()
            ->assertJsonPath('state', 'qr')
            ->assertJsonPath('qr', null);
    }

    public function test_organization_cannot_reach_the_platform_endpoint(): void
    {
        $this->withToken($this->token($this->user('admin', false)))
            ->getJson('/api/admin/platform/whatsapp')
            ->assertForbidden();
    }

    public function test_only_super_admin_can_unlink_the_number(): void
    {
        $this->withToken($this->token($this->user('operator', true)))
            ->postJson('/api/admin/platform/whatsapp/logout')->assertForbidden();
        $this->withToken($this->token($this->user('admin', false)))
            ->postJson('/api/admin/platform/whatsapp/logout')->assertForbidden();

        $this->withToken($this->token($this->user('super_admin', true)))
            ->postJson('/api/admin/platform/whatsapp/logout')->assertOk();

        Http::assertSent(fn ($req) => str_ends_with($req->url(), '/logout'));
    }

    public function test_service_down_reports_offline(): void
    {
        Http::fake(fn () => throw new ConnectionException('down'));

        $this->withToken($this->token($this->user('super_admin', true)))
            ->getJson('/api/admin/platform/whatsapp')
            ->assertStatus(503)
            ->assertJsonPath('state', 'offline');
    }
}
