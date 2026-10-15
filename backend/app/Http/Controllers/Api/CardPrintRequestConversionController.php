<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CardPrintRequestResource;
use App\Models\CardPrintRequest;
use App\Models\Member;
use App\Models\Organization;
use App\Services\OrganizationProvisioner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Demande de cartes → organisation cliente.
 *
 * Une demande déposée sur le portail public (prospect sans compte) peut porter
 * la liste du personnel. Quand le contrat est signé, le super-admin la
 * convertit : l'organisation et son compte admin sont créés, le personnel
 * devient ses membres (QR personnels prêts pour les cartes et le pointage) et
 * la demande est rattachée à l'organisation.
 */
class CardPrintRequestConversionController extends Controller
{
    /** Personnel joint à la demande (aperçu avant conversion). */
    public function staff(CardPrintRequest $cardPrintRequest): JsonResponse
    {
        return response()->json([
            'data'        => $cardPrintRequest->staff ?? [],
            'member_term' => $cardPrintRequest->member_term,
        ]);
    }

    public function convert(CardPrintRequest $cardPrintRequest, Request $request, OrganizationProvisioner $provisioner): JsonResponse
    {
        abort_if($cardPrintRequest->organization_id, 422, 'Cette demande est déjà rattachée à une organisation.');

        $data = $request->validate([
            'name'        => ['required', 'string', 'max:150'],
            'admin_name'  => ['required', 'string', 'max:150'],
            'admin_email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'member_term' => ['nullable', 'in:membre,agent,employe'],
        ]);

        $staff = $cardPrintRequest->staff ?? [];
        $imported = 0;
        $phonesDropped = 0;

        [$org, $admin, $tempPassword, $emailSent] = $provisioner->create(
            $data['name'], $data['admin_name'], $data['admin_email'],
            ['member_term' => $data['member_term'] ?? $cardPrintRequest->member_term ?? 'agent'],
            function (Organization $org) use ($staff, $cardPrintRequest, &$imported, &$phonesDropped) {
                [$imported, $phonesDropped] = $this->importStaff($org, $staff);
                $cardPrintRequest->update(['organization_id' => $org->id]);
            },
        );

        $cardPrintRequest->logEvent(
            'converted',
            "Convertie en client : {$org->name} — {$imported} personne(s) importée(s).",
            $request->user()->id,
        );

        return response()->json([
            'message'        => "Organisation « {$org->name} » créée avec {$imported} personne(s).",
            'organization'   => ['id' => $org->id, 'name' => $org->name],
            'admin'          => ['name' => $admin->name, 'email' => $admin->email],
            'temp_password'  => $tempPassword, // affiché une fois au super-admin
            'email_sent'     => $emailSent,
            'imported'       => $imported,
            'phones_dropped' => $phonesDropped,
            'request'        => new CardPrintRequestResource($cardPrintRequest->fresh()->load('organization', 'requester', 'assignee')),
        ], 201);
    }

    /**
     * Crée les membres de l'organisation à partir de la liste jointe.
     * Le téléphone est unique sur la plateforme : un numéro déjà pris (ou en
     * double dans la liste) est laissé vide plutôt que de bloquer l'import.
     *
     * @return array{0: int, 1: int} [importés, téléphones écartés]
     */
    private function importStaff(Organization $org, array $staff): array
    {
        $phones = collect($staff)->pluck('phone')->filter()->all();
        $taken = $phones
            ? Member::withoutGlobalScopes()->whereIn('phone', $phones)->pluck('phone')->flip()->all()
            : [];

        $imported = 0;
        $dropped = 0;
        foreach ($staff as $row) {
            $phone = $row['phone'] ?? null;
            if ($phone && isset($taken[$phone])) {
                $phone = null;
                $dropped++;
            }
            if ($phone) {
                $taken[$phone] = true;
            }

            Member::create([
                'organization_id' => $org->id,
                'first_name'      => $row['first_name'] ?? '',
                'last_name'       => $row['last_name'],
                'phone'           => $phone,
                'job_title'       => $row['job_title'] ?? null,
                'department'      => $row['department'] ?? null,
                'staff_id'        => $row['staff_id'] ?? null,
            ]);
            $imported++;
        }

        return [$imported, $dropped];
    }
}
