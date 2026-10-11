<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CardPrintRequestResource;
use App\Models\CardPrintRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Demandes d'impression de cartes de service. Côté entreprise (admin) : créer
 * et suivre ses demandes. Côté opérateur (super-admin) : voir toutes les
 * demandes et faire avancer leur statut.
 */
class CardPrintRequestController extends Controller
{
    // ── Entreprise ──────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'quantity'         => ['required', 'integer', 'min:1', 'max:100000'],
            'note'             => ['nullable', 'string', 'max:1000'],
            'delivery_address' => ['nullable', 'string', 'max:500'],
        ]);

        $req = CardPrintRequest::create([
            'organization_id'  => $request->user()->organization_id,
            'requested_by'     => $request->user()->id,
            'quantity'         => $data['quantity'],
            'note'             => $data['note'] ?? null,
            'delivery_address' => $data['delivery_address'] ?? null,
            'status'           => 'pending',
        ]);

        return response()->json([
            'message' => "Demande d'impression envoyée à l'opérateur.",
            'request' => new CardPrintRequestResource($req->load('requester')),
        ], 201);
    }

    public function index(): JsonResponse
    {
        // Global scope multi-tenant → uniquement les demandes de l'organisation.
        $items = CardPrintRequest::with('requester')->latest()->get();

        return response()->json(['data' => CardPrintRequestResource::collection($items)]);
    }

    // ── Opérateur (super-admin) ─────────────────────────────────
    public function adminIndex(Request $request): JsonResponse
    {
        $items = CardPrintRequest::with('organization', 'requester')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()->paginate(30);

        return response()->json([
            'data' => CardPrintRequestResource::collection($items->items()),
            'meta' => ['current_page' => $items->currentPage(), 'last_page' => $items->lastPage(), 'total' => $items->total()],
        ]);
    }

    public function updateStatus(CardPrintRequest $cardPrintRequest, Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,in_progress,done,cancelled'],
        ]);

        $cardPrintRequest->update([
            'status'     => $data['status'],
            'handled_by' => $request->user()->id,
            'handled_at' => in_array($data['status'], ['done', 'cancelled'], true) ? now() : $cardPrintRequest->handled_at,
        ]);

        return response()->json([
            'message' => 'Statut mis à jour.',
            'request' => new CardPrintRequestResource($cardPrintRequest->load('organization', 'requester')),
        ]);
    }
}
