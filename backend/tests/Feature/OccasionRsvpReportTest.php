<?php

namespace Tests\Feature;

use App\Models\Guest;
use App\Models\Occasion;
use App\Models\OccasionTable;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Rapport des réponses (PDF / CSV) : réponse, personnes, boissons, mot. */
class OccasionRsvpReportTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Occasion $occasion;

    protected function setUp(): void
    {
        parent::setUp();
        $org = Organization::factory()->create();
        $this->admin = User::factory()->create(['organization_id' => $org->id, 'role' => 'admin']);
        $this->occasion = Occasion::create([
            'organization_id' => $org->id, 'name' => 'Mariage Ben & Sarah', 'type' => 'mariage',
            'date' => now()->addMonth()->toDateString(),
        ]);
        $this->occasion->forceFill(['invitation_content' => ['drinks' => [
            ['group' => null, 'name' => 'Bières', 'items' => ['Castel', 'Nkoy']], ['group' => null, 'name' => 'Sucrées', 'items' => ['Coca']],
        ]]])->save();
        $table = OccasionTable::create(['organization_id' => $org->id, 'occasion_id' => $this->occasion->id, 'label' => '3', 'seats' => 8]);
        // Champs de réponse hors $fillable (posés par la page de l'invité) : forceFill.
        $g = fn (array $a) => Guest::forceCreate(['organization_id' => $org->id, 'occasion_id' => $this->occasion->id, 'token' => (string) \Illuminate\Support\Str::uuid(), ...$a]);
        $g(['name' => 'Zoé Kabila', 'phone' => '+243810000001', 'occasion_table_id' => $table->id, 'confirmed_at' => now(), 'party_size' => 2, 'drinks' => ['Nkoy', 'Coca'], 'rsvp_message' => 'Félicitations !']);
        $g(['name' => 'Albert Mbuyi', 'confirmed_at' => now(), 'drinks' => ['Coca']]);
        $g(['name' => 'Bob Ilunga', 'declined' => true]);
        $g(['name' => 'Chantal Tshala', 'declined' => false, 'rsvp_message' => '=HYPERLINK("http://x")']);
    }

    private function url(string $suffix = '', ?User $user = null): string
    {
        $token = ($user ?? $this->admin)->createToken('t')->plainTextToken;

        return "/api/download/occasions/{$this->occasion->id}/rsvp-report?token={$token}{$suffix}";
    }

    public function test_pdf_report(): void
    {
        $res = $this->get($this->url())->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('content-type'));
        $this->assertStringContainsString('reponses-mariage-ben-sarah.pdf', (string) $res->headers->get('content-disposition'));
    }

    public function test_csv_report_lists_answers_drinks_and_totals(): void
    {
        $csv = $this->get($this->url('&format=csv'))->assertOk()->streamedContent();
        $lines = array_map(fn ($l) => str_getcsv($l, ';'), explode("\n", trim(substr($csv, 3))));

        $this->assertSame(['Nom', 'Téléphone', 'Table', 'Réponse', 'Personnes', 'Boissons', 'Mot pour les hôtes', 'Confirmé le'], $lines[0]);
        // Confirmés d'abord (par nom), puis déclinés, puis sans réponse.
        $this->assertSame(['Albert Mbuyi', 'Zoé Kabila', 'Bob Ilunga', 'Chantal Tshala'], array_column(array_slice($lines, 1, 4), 0));
        $this->assertSame(['Zoé Kabila', '="+243810000001"', 'Table 3', 'Confirmé', '2', 'Nkoy, Coca', 'Félicitations !'], array_slice($lines[2], 0, 7));
        $this->assertSame('Décliné', $lines[3][3]);
        $this->assertSame('En attente', $lines[4][3]);
        $this->assertSame('\'=HYPERLINK("http://x")', $lines[4][6], 'formule neutralisée');

        $this->assertContains(['Personnes attendues', '3'], $lines);
        $this->assertContains(['Sans réponse', '1'], $lines);
        // Total par boisson, dans l'ordre de la carte.
        $i = array_search(['Boisson', 'Invitations confirmées'], $lines, true);
        $this->assertSame([['Nkoy', '1'], ['Coca', '2']], array_slice($lines, $i + 1, 2));
    }

    public function test_access_is_restricted(): void
    {
        $this->get("/api/download/occasions/{$this->occasion->id}/rsvp-report")->assertForbidden();

        $outsider = User::factory()->create(['organization_id' => Organization::factory()->create()->id, 'role' => 'admin']);
        $this->get($this->url('', $outsider))->assertForbidden();

        $scanner = User::factory()->create(['organization_id' => $this->occasion->organization_id, 'role' => 'scanner']);
        $this->get($this->url('', $scanner))->assertForbidden();
    }
}
