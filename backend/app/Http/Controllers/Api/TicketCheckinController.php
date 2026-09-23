<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Occasion;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Contrôle des e-billets à l'entrée (agents / app mobile). Un billet valable et
 * payé n'est admis qu'une seule fois : le second scan renvoie « déjà entré ».
 */
class TicketCheckinController extends Controller
{
    public function scan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token'       => ['required', 'uuid'],
            'occasion_id' => ['required', 'integer'],
            'scanned_at'  => ['nullable', 'date'],
        ]);

        $occasion = Occasion::find($data['occasion_id']);
        if (! $occasion) {
            return response()->json(['status' => 'invalid_occasion', 'message' => 'Événement introuvable.'], 404);
        }
        if ($occasion->isExpired()) {
            return response()->json(['status' => 'expired', 'message' => 'Cet événement est terminé.'], 200);
        }

        $ticket = Ticket::where('token', $data['token'])
            ->where('occasion_id', $occasion->id)
            ->with('order')->first();

        if (! $ticket) {
            return response()->json(['status' => 'unknown', 'message' => 'Billet non reconnu pour cet événement.'], 404);
        }

        $payload = [
            'type'   => $ticket->type_name,
            'holder' => $ticket->holder_name,
            'reference' => $ticket->order?->reference,
        ];

        // Billet annulé, ou commande non payée → refusé.
        if ($ticket->status === 'void' || ! $ticket->order || $ticket->order->status !== 'paid') {
            return response()->json([
                'status'  => 'invalid',
                'message' => 'Billet non valable (non payé ou annulé).',
                'ticket'  => $payload,
            ], 200);
        }

        if ($ticket->status === 'used' || $ticket->checked_in_at) {
            return response()->json([
                'status'  => 'already',
                'message' => 'Ce billet est déjà entré.',
                'ticket'  => $payload,
            ], 200);
        }

        $ticket->update([
            'status'        => 'used',
            'checked_in_at' => $data['scanned_at'] ?? now(),
            'checked_in_by' => $request->user()->id,
        ]);

        return response()->json([
            'status'  => 'checked_in',
            'message' => $ticket->type_name . ($ticket->holder_name ? ' — ' . $ticket->holder_name : ''),
            'ticket'  => $payload,
        ]);
    }
}
