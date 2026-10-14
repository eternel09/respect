<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Services\QrCodeService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class WhatsAppController extends Controller
{
    /**
     * État de la liaison WhatsApp. Le numéro d'envoi est celui de l'équipe
     * plateforme : une seule session sert toutes les organisations. Le QR de
     * liaison n'est donc remis qu'au super-admin — sinon la première
     * organisation à le scanner deviendrait l'expéditeur de tous les clients.
     */
    public function status(Request $request): JsonResponse
    {
        $canLink = $request->user()?->isSuperAdmin() ?? false;

        try {
            $res  = $this->service()->get('/status');
            $data = $res->json() ?? [];
        } catch (ConnectionException) {
            return response()->json([
                'state'   => 'offline',
                'qr'      => null,
                'message' => 'Service WhatsApp injoignable.',
            ], 503);
        }

        if (! $canLink) {
            $data['qr'] = null;
            $data['managed_by_platform'] = true;
        }

        return response()->json($data, $res->status());
    }

    /**
     * Déconnecte le numéro lié (super-admin) : la session est purgée et un
     * nouveau QR est proposé — pour changer de numéro d'envoi.
     */
    public function logout(): JsonResponse
    {
        try {
            $res = $this->service()->timeout(60)->post('/logout');
        } catch (ConnectionException) {
            return response()->json(['message' => 'Service WhatsApp injoignable.'], 503);
        }

        return response()->json([
            'message' => $res->successful()
                ? 'Numéro délié. Un nouveau QR de liaison va s\'afficher.'
                : ($res->json('message') ?? 'Déconnexion impossible.'),
        ], $res->successful() ? 200 : 502);
    }

    /**
     * Envoie la carte de membre (glassmorphism + QR personnel) sur WhatsApp.
     */
    public function sendCard(Member $member, Request $request, QrCodeService $qr): JsonResponse
    {
        abort_if($member->organization_id !== $request->user()->organization_id, 404);

        if (! $member->phone) {
            return response()->json(['message' => 'Ce membre n’a pas de numéro de téléphone enregistré.'], 422);
        }

        $payload = [
            'phone'     => $member->phone,
            'org'       => $member->organization->name,
            'orgLogo'   => $member->organization->logoDataUri(),
            'name'      => $member->full_name,
            'memberNo'  => str_pad($member->id, 4, '0', STR_PAD_LEFT),
            'serial'    => strtoupper(substr($member->check_in_token, 0, 8)),
            'qrDataUri' => 'data:image/svg+xml;base64,' . $qr->member($member->check_in_token),
            // Champs entreprise affichés sur la carte de service (optionnels).
            'jobTitle'   => $member->job_title,
            'department' => $member->department,
            'staffId'    => $member->staff_id,
            // Visuel de carte de service personnalisé (produit entreprise), ou null.
            'cardDesign' => $member->organization->cardDesignDataUri(),
        ];

        try {
            $res = $this->service()->timeout(120)->post('/send-card', $payload);

            return response()->json($res->json(), $res->status());
        } catch (ConnectionException) {
            return response()->json(['message' => 'Service WhatsApp injoignable.'], 503);
        }
    }

    private function service()
    {
        return Http::baseUrl(config('services.whatsapp.url'))
            ->withHeaders(['X-Api-Key' => config('services.whatsapp.key')])
            ->timeout(15)
            ->acceptJson();
    }
}
