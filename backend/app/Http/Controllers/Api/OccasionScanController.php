<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guest;
use App\Models\Occasion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API pour les agents d'accueil (app mobile) — scan des QR d'invités.
 * Distinct du scan des membres (ScanController) : ne le modifie pas.
 */
class OccasionScanController extends Controller
{
    /** Occasions actives (non passées) de l'organisation de l'agent. */
    public function occasions(Request $request): JsonResponse
    {
        $occasions = Occasion::active()->withCount('guests')
            // Agent confiné à un événement : il ne voit que le sien.
            ->when($request->user()->occasion_id, fn ($q, $id) => $q->whereKey($id))
            ->orderBy('date')
            ->get(['id', 'name', 'type', 'date', 'location'])
            ->map(fn (Occasion $o) => [
                'id'       => $o->id,
                'name'     => $o->name,
                'type'     => $o->type,
                'date'     => $o->date->toDateString(),
                'location' => $o->location,
                'guests'   => $o->guests_count,
            ]);

        return response()->json(['data' => $occasions]);
    }

    /** Manifeste hors-ligne : les invités d'une occasion (jeton, nom, table). */
    public function manifest(Request $request): JsonResponse
    {
        $occasion = Occasion::find($request->query('occasion_id'));
        abort_unless($occasion, 404, 'Événement introuvable.');

        $guests = $occasion->guests()->with('table')->get()
            ->map(fn (Guest $g) => [
                'token'      => $g->token,
                'name'       => $g->name,
                'table'      => $g->table?->label,
                'confirmed'  => $g->confirmed_at !== null,
                'checked_in' => $g->checked_in_at !== null,
            ]);

        return response()->json([
            'generated_at' => now()->toIso8601String(),
            'occasion'     => ['id' => $occasion->id, 'name' => $occasion->name],
            'count'        => $guests->count(),
            'guests'       => $guests,
        ]);
    }

    /** Scan d'un QR invité → infos + table + enregistrement de l'entrée. */
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

        $guest = Guest::where('token', $data['token'])
            ->where('occasion_id', $occasion->id)
            ->with('table')->first();

        if (! $guest) {
            return response()->json(['status' => 'unknown', 'message' => 'Invitation non reconnue pour cet événement.'], 404);
        }

        $payload = [
            'name'      => $guest->name,
            'table'     => $guest->table?->label,
            'confirmed' => $guest->confirmed_at !== null,
            'declined'  => $guest->declined,
        ];

        if ($guest->checked_in_at) {
            return response()->json([
                'status'  => 'already',
                'message' => $guest->name . ' est déjà entré(e).',
                'guest'   => $payload,
            ]);
        }

        $guest->update([
            'checked_in_at' => $data['scanned_at'] ?? now(),
            'checked_in_by' => $request->user()->id,
        ]);

        return response()->json([
            'status'  => 'checked_in',
            'message' => $guest->table
                ? $guest->name . ' — Table ' . $guest->table->label
                : $guest->name . ' — sans table assignée',
            'guest'   => $payload,
        ]);
    }
}
