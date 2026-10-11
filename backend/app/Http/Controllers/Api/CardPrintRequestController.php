<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CardPrintRequestEventResource;
use App\Http\Resources\CardPrintRequestResource;
use App\Mail\CardPrintRequestReceived;
use App\Models\CardPrintRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Demandes d'impression de cartes de service (service opéré par la plateforme).
 *
 * - Client connecté (admin) : créer et suivre les demandes de son organisation.
 * - Portail public (prospect) : déposer une demande sans compte.
 * - Opérateur (super-admin) : file de travail unique, tous canaux ; traitement,
 *   affectation, historique/notes, avancement du statut et export.
 */
class CardPrintRequestController extends Controller
{
    private const STATUSES = ['pending', 'in_progress', 'done', 'cancelled'];

    private const STATUS_LABELS = [
        'pending'     => 'En attente',
        'in_progress' => 'En cours',
        'done'        => 'Terminé',
        'cancelled'   => 'Annulé',
    ];

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

        $req->logEvent('created', 'Demande créée depuis l\'espace client.', $request->user()->id);

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

        $req = CardPrintRequest::create([
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

        $req->logEvent('created', 'Demande reçue via le portail public.');
        $this->notifyOperators($req);

        return response()->json([
            'message' => 'Votre demande a bien été reçue. Notre équipe vous recontactera rapidement.',
        ], 201);
    }

    /** Alerte l'équipe (super-admins) ; un échec d'envoi ne bloque jamais la demande. */
    private function notifyOperators(CardPrintRequest $req): void
    {
        $emails = User::where('role', 'super_admin')->pluck('email')->filter()->all();
        if (! $emails) {
            return;
        }

        try {
            Mail::to($emails)->send(new CardPrintRequestReceived($req->load('organization')));
        } catch (\Throwable) {
            // Pas de blocage : la demande est enregistrée quoi qu'il arrive.
        }
    }

    // ── Opérateur (super-admin) ─────────────────────────────────
    public function adminIndex(Request $request): JsonResponse
    {
        $items = $this->filtered($request)->paginate(30);

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
        $autoAssign = $data['status'] === 'in_progress' && ! $cardPrintRequest->assigned_to;
        if ($autoAssign) {
            $attrs['assigned_to'] = $request->user()->id;
        }

        $cardPrintRequest->update($attrs);

        $label = self::STATUS_LABELS[$data['status']] ?? $data['status'];
        $cardPrintRequest->logEvent('status', "Statut : {$label}.", $request->user()->id);
        if ($autoAssign) {
            $cardPrintRequest->logEvent('assigned', "Pris en charge par {$request->user()->name}.", $request->user()->id);
        }

        return response()->json([
            'message' => 'Statut mis à jour.',
            'request' => new CardPrintRequestResource($cardPrintRequest->load('organization', 'requester', 'assignee')),
        ]);
    }

    /** Historique d'une demande (statuts, affectations, notes). */
    public function events(CardPrintRequest $cardPrintRequest): JsonResponse
    {
        $events = $cardPrintRequest->events()->with('author')->orderByDesc('id')->get();

        return response()->json(['data' => CardPrintRequestEventResource::collection($events)]);
    }

    /** Ajoute une note interne de suivi à une demande. */
    public function addNote(CardPrintRequest $cardPrintRequest, Request $request): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $event = $cardPrintRequest->logEvent('note', $data['message'], $request->user()->id);

        return response()->json([
            'message' => 'Note ajoutée.',
            'event'   => new CardPrintRequestEventResource($event->load('author')),
        ], 201);
    }

    /** Export CSV des demandes (mêmes filtres que la file). */
    public function export(Request $request): StreamedResponse
    {
        $query = $this->filtered($request);

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="demandes-cartes.csv"',
        ];

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM UTF-8 pour Excel
            fputcsv($out, ['ID', 'Date', 'Canal', 'Statut', 'Organisation', 'Contact', 'Société', 'Email', 'Téléphone', 'Quantité', 'Livraison', 'Note', 'Assigné', 'Traité le']);

            $query->chunk(200, function ($rows) use ($out) {
                foreach ($rows as $r) {
                    fputcsv($out, [
                        $r->id,
                        $r->created_at?->toDateTimeString(),
                        $r->source,
                        self::STATUS_LABELS[$r->status] ?? $r->status,
                        $r->organization?->name,
                        $r->contact_name,
                        $r->contact_company,
                        $r->contact_email,
                        $r->contact_phone,
                        $r->quantity,
                        $r->delivery_address,
                        $r->note,
                        $r->assignee?->name,
                        $r->handled_at?->toDateTimeString(),
                    ]);
                }
            });

            fclose($out);
        }, 'demandes-cartes.csv', $headers);
    }

    /** Requête opérateur commune (file + export), filtrable par statut et canal. */
    private function filtered(Request $request)
    {
        return CardPrintRequest::with('organization', 'requester', 'assignee')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('source'), fn ($q, $s) => $q->where('source', $s))
            ->latest();
    }
}
