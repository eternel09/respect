<?php

namespace Tests\Feature;

use App\Models\Occasion;
use App\Models\OccasionTable;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Import Excel avec assignation de table immédiate (création à la volée). */
class OccasionGuestImportTablesTest extends TestCase
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
            'organization_id' => $this->org->id, 'name' => 'Mariage', 'type' => 'mariage',
            'date' => now()->addWeek()->toDateString(),
        ]);
    }

    private function import(array $guests)
    {
        return $this->withToken($this->admin->createToken('t')->plainTextToken)
            ->postJson("/api/occasions/{$this->occasion->id}/guests/bulk", ['guests' => $guests]);
    }

    public function test_import_assigns_and_creates_tables(): void
    {
        $this->import([
            ['name' => 'Alice', 'table' => 'Honneur'],
            ['name' => 'Bob', 'table' => 'Honneur'],
            ['name' => 'Chloé', 'table' => '3'],
            ['name' => 'Sans table'],
        ])->assertCreated()->assertJsonPath('count', 4);

        // Deux tables créées : "Honneur" et "3".
        $this->assertDatabaseCount('occasion_tables', 2);

        $honneur = OccasionTable::where('label', 'Honneur')->first();
        $this->assertNotNull($honneur);
        // Capacité par défaut ≥ nombre d'invités assignés (2) et ≥ 10.
        $this->assertGreaterThanOrEqual(10, $honneur->seats);

        $this->assertDatabaseHas('guests', ['name' => 'Alice', 'occasion_table_id' => $honneur->id]);
        $this->assertDatabaseHas('guests', ['name' => 'Bob', 'occasion_table_id' => $honneur->id]);
        $this->assertDatabaseHas('guests', ['name' => 'Sans table', 'occasion_table_id' => null]);
    }

    public function test_existing_table_is_matched_case_insensitively(): void
    {
        $t = $this->occasion->tables()->create([
            'organization_id' => $this->org->id, 'label' => 'Famille', 'seats' => 12,
        ]);

        $this->import([
            ['name' => 'Alice', 'table' => 'famille'], // casse différente
        ])->assertCreated();

        // Pas de doublon : la table existante est réutilisée.
        $this->assertDatabaseCount('occasion_tables', 1);
        $this->assertDatabaseHas('guests', ['name' => 'Alice', 'occasion_table_id' => $t->id]);
    }
}
