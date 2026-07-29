<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private array $payload = [
        'organization_name'     => 'Paroisse Saint-Esprit',
        'name'                  => 'Frère Emmanuel',
        'email'                 => 'emmanuel@saint-esprit.cd',
        'password'              => 'motdepasse123',
        'password_confirmation' => 'motdepasse123',
        'modules'               => ['presence'],
    ];

    public function test_registration_creates_org_admin_and_returns_token(): void
    {
        $res = $this->postJson('/api/register', $this->payload)->assertStatus(201);

        $res->assertJsonPath('user.role', 'admin');
        $res->assertJsonPath('user.organization.name', 'Paroisse Saint-Esprit');
        $res->assertJsonPath('user.organization.modules', ['presence']);
        $this->assertNotEmpty($res->json('token'));
    }

    /**
     * La réponse d'inscription doit exposer les drapeaux réseau (comme /login et
     * /me), sinon la sidebar masque « Réseau » jusqu'au prochain reload.
     */
    public function test_registration_response_exposes_network_flags(): void
    {
        $res = $this->postJson('/api/register', $this->payload)->assertStatus(201);

        // Organisation de premier niveau avec le module présence → peut gérer un réseau.
        $res->assertJsonPath('user.organization.can_manage_network', true);
        // Fraîchement créée → aucune sous-organisation pour l'instant.
        $res->assertJsonPath('user.organization.is_network_parent', false);
    }
}
