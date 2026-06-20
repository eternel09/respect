<?php

namespace App\Services;

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

    private function render(Organization $organization, Collection $members): mixed
    {
        $cards = $members->map(fn (Member $m) => [
            'id'        => $m->id,
            'full_name' => $m->full_name,
            'phone'     => $m->phone,
            'qr'        => $this->qr->member($m->check_in_token),
        ]);

        return Pdf::loadView('pdf.badges', [
            'organization' => $organization,
            'members'      => $cards,
        ])->setPaper('a4');
    }
}
