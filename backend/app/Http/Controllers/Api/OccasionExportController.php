<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Occasion;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

/** Exports PDF liés à une occasion (listes imprimables). */
class OccasionExportController extends Controller
{
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

    private function userFromToken(Request $request): ?User
    {
        $token = $request->query('token');

        return $token ? PersonalAccessToken::findToken($token)?->tokenable : null;
    }
}
