<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CardPrintRequestResource;
use App\Models\CardPrintRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Demandes d'impression de cartes de service (service opéré par la plateforme).
 *
 * - Client connecté (admin) : créer et suivre les demandes de son organisation.
 * - Portail public (prospect) : déposer une demande sans compte.
 * - Opérateur (super-admin) : file de travail unique, tous canaux ; traitement,
 *   affectation et avancement du statut.
 */
class CardPrintRequestController extends Controller
{
    private const STATUSES = ['pending', 'in_progress', 'done', 'cancelled'];

    // ── Entreprise (client connecté) ────────────────────────────
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
            'source'           => 'in_app',
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
        $items = CardPrintRequest::with('requester', 'assignee')->latest()->get();

        return response()->json(['data' => CardPrintRequestResource::collection($items)]);
    }

    // ── Portail public (prospect sans compte) ───────────────────
    public function publicStore(Request $request): JsonResponse
    {
        // Honeypot anti-spam : un bot remplit souvent tous les champs.
        if (filled($request->input('website'))) {
            return response()->json(['message' => 'Demande reçue.'], 201);
        }

        $data = $request->validate([
            'contact_name'     => ['required', 'string', 'max:150'],
            'contact_company'  => ['nullable', 'string', 'max:150'],
            'contact_email'    => ['required', 'email', 'max:150'],
            'contact_phone'    => ['nullable', 'string', 'max:40'],
            'quantity'         => ['required', 'integer', 'min:1', 'max:100000'],
            'note'             => ['nullable', 'string', 'max:1000'],
            'delivery_address' => ['nullable', 'string', 'max:500'],
        ]);

        CardPrintRequest::create([
            'organization_id'  => null,
            'requested_by'     => null,
            'source'           => 'public',
            'contact_name'     => $data['contact_name'],
            'contact_company'  => $data['contact_company'] ?? null,
            'contact_email'    => $data['contact_email'],
            'contact_phone'    => $data['contact_phone'] ?? null,
            'quantity'         => $data['quantity'],
            'note'             => $data['note'] ?? null,
            'delivery_address' => $data['delivery_address'] ?? null,
            'status'           => 'pending',
        ]);

        return response()->json([
            'message' => 'Votre demande a bien été reçue. Notre équipe vous recontactera rapidement.',
        ], 201);
    }

    // ── Opérateur (super-admin) ─────────────────────────────────
    public function adminIndex(Request $request): JsonResponse
    {
        $items = CardPrintRequest::with('organization', 'requester', 'assignee')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('source'), fn ($q, $s) => $q->where('source', $s))
            ->latest()->paginate(30);

        return response()->json([
            'data' => CardPrintRequestResource::collection($items->items()),
            'meta' => ['current_page' => $items->currentPage(), 'last_page' => $items->lastPage(), 'total' => $items->total()],
        ]);
    }

    public function updateStatus(CardPrintRequest $cardPrintRequest, Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:' . implode(',', self::STATUSES)],
        ]);

        $attrs = [
            'status'     => $data['status'],
            'handled_by' => $request->user()->id,
            'handled_at' => in_array($data['status'], ['done', 'cancelled'], true) ? now() : $cardPrintRequest->handled_at,
        ];

        // « Prendre en charge » : l'opérateur qui démarre le traitement se voit
        // affecter la demande si personne ne l'a encore prise.
        if ($data['status'] === 'in_progress' && ! $cardPrintRequest->assigned_to) {
            $attrs['assigned_to'] = $request->user()->id;
        }

        $cardPrintRequest->update($attrs);

        return response()->json([
            'message' => 'Statut mis à jour.',
            'request' => new CardPrintRequestResource($cardPrintRequest->load('organization', 'requester', 'assignee')),
        ]);
    }
}
