<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ResolvesDownloadToken;
use App\Http\Controllers\Controller;
use App\Models\Occasion;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Exports PDF liés à une occasion (listes imprimables). */
class OccasionExportController extends Controller
{
    use ResolvesDownloadToken;

    /**
     * Liste imprimable des invités ayant reçu leur invitation (statut « sent »),
     * groupés par table — les « sans table » en fin de liste. Authentifié par le
     * token passé en query (?token=), comme les badges : permet une navigation
     * directe du navigateur (téléchargement natif) sans en-tête d'auth.
     */
    public function invitedGuestsPdf(Occasion $occasion, Request $request): Response
    {
        $user = $this->userFromToken($request);
        abort_if(! $user || $occasion->organization_id !== $user->organization_id, 403, 'Accès non autorisé.');

        // Mêmes statuts que le compteur « invited_count » de l'événement, pour
        // que le bouton (activé s'il y a des invités contactés) et le contenu du
        // PDF concordent.
        $guests = $occasion->guests()->with('table')
            ->whereIn('invite_status', ['sent', 'queued'])
            ->get();

        // Groupés par table (tri naturel des libellés : 1, 2, …, 10), invités
        // triés par nom ; le groupe « sans table » est renvoyé à part, en fin.
        $tabled = $guests->filter(fn ($g) => $g->table)
            ->groupBy(fn ($g) => $g->table->label)
            ->sortKeys(SORT_NATURAL | SORT_FLAG_CASE)
            ->map(fn ($list) => $list->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)->values());

        $noTable = $guests->filter(fn ($g) => ! $g->table)
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)->values();

        $document = Pdf::loadView('pdf.occasion-invited', [
            'occasion' => $occasion->loadMissing('organization'),
            'tabled'   => $tabled,
            'noTable'  => $noTable,
            'total'    => $guests->count(),
        ]);

        $slug = Str::slug($occasion->name) ?: ('evenement-' . $occasion->id);

        return $document->download("invites-envoyes-{$slug}.pdf");
    }

    /**
     * Rapport des réponses : tous les invités avec leur réponse (confirmé,
     * décliné, en attente), le nombre de personnes, la table, les boissons
     * choisies et leur mot ; en tête, le récapitulatif et le total par boisson.
     * PDF imprimable (par défaut) ou CSV pour Excel (?format=csv).
     */
    public function rsvpReport(Occasion $occasion, Request $request): Response|StreamedResponse
    {
        $user = $this->userFromToken($request);
        // Back-office de l'organisation (admin, secrétaire) ; un agent d'événement
        // ne voit que l'événement auquel il est rattaché.
        abort_if(! $user || $occasion->organization_id !== $user->organization_id
            || ! in_array($user->role, ['admin', 'secretaire'], true)
            || ($user->occasion_id && (int) $user->occasion_id !== $occasion->id), 403, 'Accès non autorisé.');

        $status = fn ($g) => $g->confirmed_at ? 'confirmed' : ($g->declined ? 'declined' : 'pending');
        $order = ['confirmed' => 0, 'declined' => 1, 'pending' => 2];
        $guests = $occasion->guests()->with('table')->get()
            ->sortBy([
                fn ($a, $b) => $order[$status($a)] <=> $order[$status($b)],
                fn ($a, $b) => strnatcasecmp($a->name, $b->name),
            ])->values();

        $confirmed = $guests->filter(fn ($g) => $status($g) === 'confirmed');
        $summary = [
            'total'     => $guests->count(),
            'confirmed' => $confirmed->count(),
            'people'    => $confirmed->sum(fn ($g) => max(1, (int) $g->party_size)),
            'declined'  => $guests->filter(fn ($g) => $status($g) === 'declined')->count(),
            'pending'   => $guests->filter(fn ($g) => $status($g) === 'pending')->count(),
        ];

        // Total par boisson (invitations confirmées), dans l'ordre de la carte.
        $counts = [];
        foreach ($confirmed as $g) {
            foreach ($g->drinks ?? [] as $d) {
                $counts[$d] = ($counts[$d] ?? 0) + 1;
            }
        }
        $menu = array_flip($occasion->drinkChoices());
        uksort($counts, fn ($a, $b) => ($menu[$a] ?? PHP_INT_MAX) <=> ($menu[$b] ?? PHP_INT_MAX) ?: strnatcasecmp($a, $b));

        $label = ['confirmed' => 'Confirmé', 'declined' => 'Décliné', 'pending' => 'En attente'];
        $rows = $guests->map(fn ($g) => [
            'name'    => $g->name,
            'phone'   => $g->phone,
            'table'   => $g->table ? (is_numeric($g->table->label) ? "Table {$g->table->label}" : $g->table->label) : null,
            'status'  => $status($g),
            'label'   => $label[$status($g)],
            'people'  => $status($g) === 'confirmed' ? max(1, (int) $g->party_size) : null,
            'drinks'  => $status($g) === 'confirmed' ? ($g->drinks ?? []) : [],
            'message' => $g->rsvp_message,
            'answered_at' => $g->confirmed_at,
        ]);

        $slug = Str::slug($occasion->name) ?: ('evenement-' . $occasion->id);

        if ($request->query('format') === 'csv') {
            // Texte libre (nom, mot de l'invité) : neutralise une formule Excel
            // (=, +, -, @ en tête). Téléphone : forcé en texte (sinon 2,43E+11).
            $text = fn (?string $v) => $v !== null && preg_match('/^[=+\-@\t\r]/', $v) ? "'" . $v : $v;
            $phone = fn (?string $v) => $v ? '="' . str_replace('"', '', $v) . '"' : null;

            return response()->streamDownload(function () use ($rows, $summary, $counts, $text, $phone) {
                $out = fopen('php://output', 'w');
                fwrite($out, "\xEF\xBB\xBF"); // BOM UTF-8 pour Excel
                fputcsv($out, ['Nom', 'Téléphone', 'Table', 'Réponse', 'Personnes', 'Boissons', 'Mot pour les hôtes', 'Confirmé le'], ';');
                foreach ($rows as $r) {
                    fputcsv($out, [
                        $text($r['name']), $phone($r['phone']), $text($r['table']), $r['label'], $r['people'],
                        implode(', ', $r['drinks']), $text($r['message']), $r['answered_at']?->format('d/m/Y H:i'),
                    ], ';');
                }
                fputcsv($out, [], ';');
                fputcsv($out, ['Récapitulatif'], ';');
                fputcsv($out, ['Invitations', $summary['total']], ';');
                fputcsv($out, ['Confirmées', $summary['confirmed']], ';');
                fputcsv($out, ['Personnes attendues', $summary['people']], ';');
                fputcsv($out, ['Déclinées', $summary['declined']], ';');
                fputcsv($out, ['Sans réponse', $summary['pending']], ';');
                if ($counts) {
                    fputcsv($out, [], ';');
                    fputcsv($out, ['Boisson', 'Invitations confirmées'], ';');
                    foreach ($counts as $drink => $n) {
                        fputcsv($out, [$text((string) $drink), $n], ';');
                    }
                }
                fclose($out);
            }, "reponses-{$slug}.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        return Pdf::loadView('pdf.occasion-rsvp', [
            'occasion' => $occasion->loadMissing('organization'),
            'rows'     => $rows,
            'summary'  => $summary,
            'drinks'   => $counts,
        ])->setPaper('a4', 'landscape')->download("reponses-{$slug}.pdf");
    }
}
