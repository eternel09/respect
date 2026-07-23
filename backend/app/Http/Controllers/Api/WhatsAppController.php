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
     * État de la liaison WhatsApp (+ QR de liaison à scanner si nécessaire).
     */
    public function status(): JsonResponse
    {
        try {
            $res = $this->service()->get('/status');

            return response()->json($res->json(), $res->status());
        } catch (ConnectionException) {
            return response()->json([
                'state'   => 'offline',
                'qr'      => null,
                'message' => 'Service WhatsApp injoignable. Démarrez-le : `npm start` dans le dossier whatsapp/.',
            ], 503);
        }
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
