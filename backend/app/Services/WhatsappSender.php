<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Client léger du micro-service WhatsApp pour l'envoi de documents (PDF).
 * Encapsule l'appel HTTP : les jobs/service métier ne connaissent pas l'URL ni
 * la clé. Renvoie simplement un booléen de succès (l'appelant décide de la suite).
 */
class WhatsappSender
{
    /** Envoie un document (PDF…) à un numéro. true si le service confirme l'envoi. */
    public function sendDocument(string $phone, string $bytes, string $filename, string $caption): bool
    {
        try {
            $res = Http::baseUrl(config('services.whatsapp.url'))
                ->withHeaders(['X-Api-Key' => config('services.whatsapp.key')])
                ->timeout(120)
                ->acceptJson()
                ->post('/send-document', [
                    'phone'    => $phone,
                    'base64'   => base64_encode($bytes),
                    'mime'     => 'application/pdf',
                    'filename' => $filename,
                    'caption'  => $caption,
                ]);
        } catch (ConnectionException) {
            return false;
        }

        return $res->successful() && $res->json('sent') === true;
    }
}
