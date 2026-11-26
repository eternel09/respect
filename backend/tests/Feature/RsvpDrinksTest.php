<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Occasion;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Modèle « save the date » : carte des boissons réglée par les hôtes, choix
 * de l'invité avec sa réponse, visible dans la liste des invités.
 */
class RsvpDrinksTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Occasion $occasion;
    private Guest $guest;

    private const MENU = [
        ['group' => 'Locales', 'name' => 'Bières', 'items' => ['Castel', 'Beaufort', 'Nkoy']],
        ['group' => 'Locales', 'name' => 'Sucrées', 'items' => ['Coca', 'Fanta', 'Eau']],
        ['group' => 'Liqueurs', 'name' => 'Autres', 'items' => ['Vin blanc', 'Whisky']],
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $org = Organization::factory()->create();
        $this->admin = User::factory()->create(['organization_id' => $org->id, 'role' => 'admin']);
        $this->occasion = Occasion::create([
            'organization_id' => $org->id, 'name' => 'Mariage Ben & Sarah', 'type' => 'mariage', 'date' => now()->addMonth()->toDateString(),
        ]);
        $this->guest = $this->occasion->guests()->create(['organization_id' => $org->id, 'name' => 'M. & Mme Jean Mukendi']);
    }

    private function saveMenu(array $payload)
    {
        return $this->actingAs($this->admin)->putJson("/api/occasions/{$this->occasion->id}/invitation-content", $payload);
    }

    public function test_save_the_date_is_a_template(): void
    {
        $this->actingAs($this->admin)->putJson("/api/occasions/{$this->occasion->id}/invitation-theme", ['template' => 'save-the-date', 'palette' => 'auto', 'font' => 'romantique', 'card' => 'signiq'])
            ->assertOk()->assertJsonPath('invitation_theme.template', 'save-the-date');
    }

    public function test_admin_sets_the_drinks_menu(): void
    {
        $this->saveMenu(['drinks' => [...self::MENU, ['group' => '', 'name' => 'Vide', 'items' => [' Coca ', 'Coca']]]])
            ->assertOk()
            ->assertJsonPath('invitation_content.drinks.0.name', 'Bières')
            ->assertJsonPath('invitation_content.drinks.0.items.2', 'Nkoy')
            ->assertJsonPath('invitation_content.drinks.3.group', null)
            ->assertJsonPath('invitation_content.drinks.3.items', ['Coca']);

        $this->saveMenu(['drinks' => [['name' => 'Bières', 'items' => []]]])->assertStatus(422)->assertJsonValidationErrors('drinks.0.items');
        $this->saveMenu(['drinks' => [['name' => '', 'items' => ['Castel']]]])->assertStatus(422)->assertJsonValidationErrors('drinks.0.name');
    }

    public function test_guest_chooses_drinks_from_the_menu(): void
    {
        $this->saveMenu(['drinks' => self::MENU])->assertOk();

        $this->getJson("/api/rsvp/{$this->guest->token}")->assertOk()
            ->assertJsonPath('occasion.content.drinks.1.name', 'Sucrées')
            ->assertJsonPath('guest.drinks', []);

        // Hors carte ignoré ; ordre de la carte conservé.
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'confirm', 'drinks' => ['Whisky', 'Castel', 'Champagne', 'Castel']])
            ->assertOk();
        $this->assertSame(['Castel', 'Whisky'], $this->guest->fresh()->drinks);
        $this->getJson("/api/rsvp/{$this->guest->token}")->assertJsonPath('guest.drinks', ['Castel', 'Whisky']);
        $this->actingAs($this->admin)->getJson("/api/occasions/{$this->occasion->id}")->assertJsonPath('guests.0.drinks', ['Castel', 'Whisky']);

        // Réponse sans le champ : choix conservé ; refus : choix effacé.
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'confirm'])->assertOk();
        $this->assertSame(['Castel', 'Whisky'], $this->guest->fresh()->drinks);
        $this->postJson("/api/rsvp/{$this->guest->token}", ['status' => 'decline', 'drinks' => ['Castel']])->assertOk();
        $this->assertNull($this->guest->fresh()->drinks);
    }
}
