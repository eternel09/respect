<?php

namespace App\Services;

use App\Models\Badge;
use App\Models\Member;
use App\Models\Organization;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;

class BadgeService
{
    public function __construct(private QrCodeService $qr) {}

    /**
     * Badge PDF d'un seul membre.
     */
    public function forMember(Member $member): mixed
    {
        return $this->render($member->organization, collect([$member]));
    }

    /**
     * Planche de badges pour tous les membres d'une organisation.
     */
    public function forOrganization(int $organizationId): mixed
    {
        $organization = Organization::findOrFail($organizationId);
        $members = Member::where('organization_id', $organizationId)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        return $this->render($organization, $members);
    }

    /**
     * Planche de badges VIERGES (non liés) d'un lot d'impression : le QR est
     * actif mais anonyme — le membre sera créé et lié au premier scan.
     */
    public function forBlankBatch(int $organizationId, string $batch): mixed
    {
        $organization = Organization::findOrFail($organizationId);

        $cards = Badge::where('organization_id', $organizationId)
            ->where('batch', $batch)
            ->orderBy('id')
            ->get()
            ->map(fn (Badge $b) => [
                'id'        => $b->id,
                'full_name' => null, // vierge → ligne d'écriture manuscrite
                'phone'     => null,
                'serial'    => strtoupper(substr($b->token, 0, 8)),
                'qr'        => $this->qr->member($b->token),
            ]);

        return $this->renderCards($organization, $cards);
    }

    private function render(Organization $organization, Collection $members): mixed
    {
        $cards = $members->map(fn (Member $m) => [
            'id'        => $m->id,
            'full_name' => $m->full_name,
            'phone'     => $m->phone,
            'serial'    => strtoupper(substr($m->check_in_token, 0, 8)),
            'qr'        => $this->qr->member($m->check_in_token),
        ]);

        return $this->renderCards($organization, $cards);
    }

    private function renderCards(Organization $organization, Collection $cards): mixed
    {
        return Pdf::loadView('pdf.badges', [
            'organization' => $organization,
            'members'      => $cards,
        ])
            // N'embarque que les glyphes utilisés → PDF beaucoup plus léger
            // (sinon ~1 Mo de polices DejaVu, réponse trop grosse pour le dev).
            ->setOption('isFontSubsettingEnabled', true)
            ->setPaper('a4');
    }
}
