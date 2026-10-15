<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ResolvesDownloadToken;
use App\Http\Controllers\Controller;
use App\Models\CardPrintRequest;
use App\Models\Member;
use App\Services\QrCodeService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * Impression des cartes de membre design (glassmorphism), format carte de
 * visite CR80 — rendues par le service Node (Puppeteer) et servies en PDF.
 */
class MemberCardController extends Controller
{
    use ResolvesDownloadToken;

    public function __construct(private QrCodeService $qr) {}

    /** Planche PDF : la carte d'UN membre. */
    public function single(Member $member, Request $request)
    {
        $user = $this->userFromToken($request);
        abort_if(! $user || $member->organization_id !== $user->organization_id, 403, 'Accès non autorisé.');

        return $this->printSheet($member->organization, collect([$member]), 'carte-' . $member->id . '.pdf', 'single');
    }

    /** Planche PDF : les cartes de TOUS les membres de l'organisation. */
    public function batch(Request $request)
    {
        $user = $this->userFromToken($request);
        abort_if(! $user || ! $user->organization_id, 403, 'Accès non autorisé.');

        $members = Member::where('organization_id', $user->organization_id)
            ->orderBy('last_name')->orderBy('first_name')->get();

        abort_if($members->isEmpty(), 404, 'Aucun membre.');

        // Mise en page : 'single' = 1 carte par page (prête à découper), sinon planche.
        $layout = $request->query('layout') === 'single' ? 'single' : 'sheet';

        return $this->printSheet($user->organization, $members, 'cartes-membres.pdf', $layout);
    }

    /**
     * Équipe plateforme : les cartes de l'organisation rattachée à une demande
     * (service opéré — l'opérateur imprime pour le client).
     */
    public function forPrintRequest(CardPrintRequest $cardPrintRequest, Request $request)
    {
        $org = $cardPrintRequest->organization;
        abort_unless($org, 422, "Cette demande n'est rattachée à aucune organisation : convertissez-la d'abord en client.");

        $members = Member::withoutGlobalScopes()->where('organization_id', $org->id)
            ->orderBy('last_name')->orderBy('first_name')->get();

        abort_if($members->isEmpty(), 404, "Aucune personne enregistrée dans l'organisation.");

        $layout = $request->query('layout') === 'single' ? 'single' : 'sheet';

        return $this->printSheet($org, $members, "cartes-{$cardPrintRequest->reference}.pdf", $layout);
    }

    private function printSheet(\App\Models\Organization $org, $members, string $filename, string $layout = 'sheet')
    {
        $payload = [
            'org'     => $org->name,
            'orgLogo' => $org->logoDataUri(),
            // Visuel de carte personnalisé (org) appliqué à chaque carte, ou null.
            'cardDesign' => $org->cardDesignDataUri(),
            'layout'  => $layout,
            'members' => $members->map(fn (Member $m) => [
                'name'      => $m->full_name,
                'phone'     => $m->phone,
                'memberNo'  => str_pad($m->id, 4, '0', STR_PAD_LEFT),
                'serial'    => strtoupper(substr($m->check_in_token, 0, 8)),
                'qrDataUri' => 'data:image/svg+xml;base64,' . $this->qr->member($m->check_in_token),
                'jobTitle'   => $m->job_title,
                'department' => $m->department,
                'staffId'    => $m->staff_id,
            ])->values(),
        ];

        try {
            $res = Http::baseUrl(config('services.whatsapp.url'))
                ->withHeaders(['X-Api-Key' => config('services.whatsapp.key')])
                ->timeout(300)
                ->post('/print-cards', $payload);
        } catch (ConnectionException) {
            abort(503, 'Service de rendu des cartes injoignable. Démarrez-le : npm start dans whatsapp/.');
        }

        abort_unless($res->successful(), 500, $res->json('message') ?? 'Échec de la génération des cartes.');

        return response($res->body(), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'attachment; filename=' . $filename,
        ]);
    }

}
