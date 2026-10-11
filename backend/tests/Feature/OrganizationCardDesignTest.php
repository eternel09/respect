<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Carte de service à visuel personnalisé (produit Présence entreprise). */
class OrganizationCardDesignTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create([
            'organization_id' => Organization::factory()->create()->id, 'role' => 'admin',
        ]);
    }

    public function test_admin_uploads_and_removes_card_design(): void
    {
        Storage::fake('public');
        $admin = $this->admin();
        $token = $admin->createToken('t')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/admin/organization/card-design', [
                'design' => UploadedFile::fake()->image('carte.png', 1000, 620),
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Visuel de carte enregistré.')
            ->assertJson(fn ($j) => $j->whereType('card_design_url', 'string')->etc());

        $org = $admin->organization->fresh();
        $this->assertNotNull($org->card_design_path);
        Storage::disk('public')->assertExists($org->card_design_path);

        // Exposé par les réglages
        $this->withToken($token)->getJson('/api/admin/organization')
            ->assertOk()->assertJson(fn ($j) => $j->where('card_design_url', fn ($v) => is_string($v))->etc());

        // Retrait → design standard
        $this->withToken($token)->deleteJson('/api/admin/organization/card-design')
            ->assertOk()->assertJsonPath('message', 'Visuel de carte retiré.');
        $this->assertNull($admin->organization->fresh()->card_design_path);
    }

    public function test_pdf_is_rejected(): void
    {
        Storage::fake('public');
        $token = $this->admin()->createToken('t')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/admin/organization/card-design', [
                'design' => UploadedFile::fake()->create('carte.pdf', 100, 'application/pdf'),
            ])
            ->assertStatus(422);
    }

    public function test_secretaire_cannot_upload(): void
    {
        Storage::fake('public');
        $sec = User::factory()->create([
            'organization_id' => Organization::factory()->create()->id, 'role' => 'secretaire',
        ]);

        $this->withToken($sec->createToken('t')->plainTextToken)
            ->postJson('/api/admin/organization/card-design', [
                'design' => UploadedFile::fake()->image('carte.png'),
            ])
            ->assertForbidden();
    }
}
