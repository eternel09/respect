<?php

namespace Tests\Feature;

use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Modules par événement : défauts selon le type, personnalisation, rétro-compat. */
class OccasionFeaturesTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create([
            'organization_id' => Organization::factory()->create()->id, 'role' => 'admin',
        ]);
    }

    public function test_create_uses_type_defaults_when_features_absent(): void
    {
        $this->withToken($this->admin()->createToken('t')->plainTextToken)
            ->postJson('/api/occasions', ['name' => 'Concert X', 'type' => 'concert', 'date' => now()->addWeek()->toDateString()])
            ->assertCreated()
            ->assertJsonPath('features', ['ticketing']); // concert = billetterie pure
    }

    public function test_wedding_defaults_include_couple_video_no_ticketing(): void
    {
        $this->withToken($this->admin()->createToken('t')->plainTextToken)
            ->postJson('/api/occasions', ['name' => 'Mariage', 'type' => 'mariage', 'date' => now()->addWeek()->toDateString()])
            ->assertCreated()
            ->assertJsonPath('features', ['guests', 'tables', 'couple_video']);
    }

    public function test_custom_features_are_respected_and_validated(): void
    {
        $token = $this->admin()->createToken('t')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/occasions', [
                'name' => 'Gala', 'type' => 'gala', 'date' => now()->addWeek()->toDateString(),
                'features' => ['guests', 'ticketing'],
            ])
            ->assertCreated()
            ->assertJsonPath('features', ['guests', 'ticketing']);

        // Clé inconnue → 422
        $this->withToken($token)
            ->postJson('/api/occasions', [
                'name' => 'X', 'type' => 'autre', 'date' => now()->addWeek()->toDateString(),
                'features' => ['bogus'],
            ])
            ->assertStatus(422);
    }

    public function test_legacy_occasion_without_features_falls_back_to_type_defaults(): void
    {
        $admin = $this->admin();
        $occasion = Occasion::create([
            'organization_id' => $admin->organization_id, 'name' => 'Ancien', 'type' => 'anniversaire',
            'date' => now()->addWeek()->toDateString(),
        ]);
        // Simule une ligne antérieure à la colonne (features NULL).
        $occasion->forceFill(['features' => null])->save();

        $this->assertSame(['guests', 'tables'], $occasion->fresh()->featureList());
    }
}
