<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CardPrintRequestEventResource;
use App\Http\Resources\CardPrintRequestResource;
use App\Http\Resources\PublicCardPrintRequestResource;
use App\Mail\CardPrintRequestConfirmation;
use App\Mail\CardPrintRequestReceived;
use App\Mail\CardPrintRequestStatusChanged;
use App\Models\CardPrintRequest;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
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

    // Taille maximale de la liste du personnel jointe à une demande publique.
    private const MAX_STAFF = 5000;

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
        $this->notifyOperators($req); // l'équipe est prévenue, comme pour le portail public

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
            // Sans liste jointe, la quantité est obligatoire ; avec, elle en découle.
            'quantity'         => ['required_without:staff', 'nullable', 'integer', 'min:1', 'max:100000'],
            'note'             => ['nullable', 'string', 'max:1000'],
            'delivery_address' => ['nullable', 'string', 'max:500'],
            // Liste du personnel (fichier Excel/CSV lu dans le navigateur)
            'staff'            => ['nullable', 'array', 'max:' . self::MAX_STAFF],
            'member_term'      => ['nullable', 'in:agent,employe,membre'],
        ]);

        $this->validateStaffRows($data['staff'] ?? []);
        $staff = $this->normalizeStaff($data['staff'] ?? []);

        $req = CardPrintRequest::create([
            'organization_id'  => null,
            'requested_by'     => null,
            'source'           => 'public',
            'contact_name'     => $data['contact_name'],
            'contact_company'  => $data['contact_company'] ?? null,
            'contact_email'    => $data['contact_email'],
            'contact_phone'    => $data['contact_phone'] ?? null,
            'quantity'         => $data['quantity'] ?? count($staff),
            'note'             => $data['note'] ?? null,
            'delivery_address' => $data['delivery_address'] ?? null,
            'staff'            => $staff ?: null,
            'member_term'      => $data['member_term'] ?? null,
            'status'           => 'pending',
        ]);

        $req->logEvent('created', $staff
            ? 'Demande reçue via le portail public, avec la liste de ' . count($staff) . ' personne(s).'
            : 'Demande reçue via le portail public.');
        $this->notifyOperators($req);
        $this->sendConfirmation($req);

        return response()->json([
            'message'   => 'Votre demande a bien été reçue. Notre équipe vous recontactera rapidement.',
            'reference' => $req->reference,
            'token'     => $req->public_token, // clé du lien de suivi
        ], 201);
    }

    // Champs d'une ligne du personnel et leur longueur maximale.
    private const STAFF_FIELDS = [
        'first_name' => 100, 'last_name' => 100, 'phone' => 40,
        'job_title' => 120, 'department' => 120, 'staff_id' => 60,
    ];

    /**
     * Contrôle ligne à ligne de la liste jointe. Équivaut à des règles `staff.*.x`
     * mais en temps linéaire : les règles joker mettent ~10 s sur 5 000 lignes.
     */
    private function validateStaffRows(array $rows): void
    {
        $errors = [];
        foreach ($rows as $i => $row) {
            if (! is_array($row)) {
                $errors["staff.$i"] = ["La ligne " . ($i + 1) . " est invalide."];
                continue;
            }
            foreach (self::STAFF_FIELDS as $field => $max) {
                $v = $row[$field] ?? null;
                if ($v !== null && ! is_scalar($v)) {
                    $errors["staff.$i.$field"] = ["Ligne " . ($i + 1) . " : valeur invalide."];
                } elseif (mb_strlen((string) $v) > $max) {
                    $errors["staff.$i.$field"] = ["Ligne " . ($i + 1) . " : {$max} caractères maximum."];
                }
            }
            $last = $row['last_name'] ?? null;
            if (! isset($errors["staff.$i.last_name"]) && (! is_scalar($last) || trim((string) $last) === '')) {
                $errors["staff.$i.last_name"] = ["Ligne " . ($i + 1) . " : le nom est obligatoire."];
            }
            if (count($errors) >= 20) {
                break; // assez pour corriger le fichier
            }
        }

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * Nettoie la liste jointe : espaces superflus, lignes sans nom écartées,
     * téléphone ramené à chiffres (+ indicatif) et gardé seulement s'il est valide.
     */
    private function normalizeStaff(array $rows): array
    {
        $clean = fn ($v) => ($v = trim(preg_replace('/\s+/', ' ', (string) ($v ?? '')))) === '' ? null : $v;

        return collect($rows)->map(function (array $r) use ($clean) {
            $phone = preg_replace('/[^\d+]/', '', (string) ($r['phone'] ?? ''));

            return [
                'first_name' => $clean($r['first_name'] ?? null) ?? '',
                'last_name'  => $clean($r['last_name'] ?? null),
                'phone'      => preg_match('/^\+?[0-9]{9,15}$/', $phone) ? $phone : null,
                'job_title'  => $clean($r['job_title'] ?? null),
                'department' => $clean($r['department'] ?? null),
                'staff_id'   => $clean($r['staff_id'] ?? null),
            ];
        })->filter(fn ($r) => $r['last_name'] !== null)->values()->all();
    }

    /** Accusé de réception au demandeur (numéro de ticket + lien de suivi) ; non bloquant. */
    private function sendConfirmation(CardPrintRequest $req): void
    {
        if (! $req->contact_email) {
            return;
        }

        try {
            Mail::to($req->contact_email)->send(new CardPrintRequestConfirmation($req));
        } catch (\Throwable) {
            // La demande reste enregistrée même si l'e-mail de confirmation échoue.
        }
    }

    /** Page de suivi publique : état d'une demande par son jeton non devinable. */
    public function publicShow(string $token): JsonResponse
    {
        $req = CardPrintRequest::withoutGlobalScopes()
            ->with(['events' => fn ($q) => $q->orderBy('id')])
            ->where('public_token', $token)
            ->first();

        abort_unless($req, 404, 'Demande introuvable.');

        return response()->json(['data' => new PublicCardPrintRequestResource($req)]);
    }

    /** Alerte l'équipe (super-admins + opérateurs) ; un échec d'envoi ne bloque jamais la demande. */
    private function notifyOperators(CardPrintRequest $req): void
    {
        $emails = User::whereNull('organization_id')
            ->whereIn('role', ['super_admin', 'operator'])
            ->pluck('email')->filter()->all();
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

        $previous = $cardPrintRequest->status;

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

        // Le client est prévenu de chaque avancement réel (pas de doublon si le
        // statut ne change pas, rien pour un retour « en attente »).
        if ($data['status'] !== $previous && $data['status'] !== 'pending') {
            $this->notifyRequester($cardPrintRequest);
        }

        return response()->json([
            'message' => 'Statut mis à jour.',
            'request' => new CardPrintRequestResource($cardPrintRequest->load('organization', 'requester', 'assignee')),
        ]);
    }

    /** Prévient le demandeur d'un changement de statut ; non bloquant. */
    private function notifyRequester(CardPrintRequest $req): void
    {
        $email = $req->contact_email ?: $req->requester?->email;
        if (! $email) {
            return;
        }

        try {
            Mail::to($email)->send(new CardPrintRequestStatusChanged($req));
        } catch (\Throwable) {
            // L'avancement est enregistré même si l'e-mail échoue.
        }
    }

    /** Tableau de bord de la file : volumes par statut et canal, demandes en souffrance. */
    public function stats(): JsonResponse
    {
        $staleHours = (int) config('services.cards.stale_hours', 48);

        $byStatus = CardPrintRequest::selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status');
        $bySource = CardPrintRequest::selectRaw('source, count(*) as n')->groupBy('source')->pluck('n', 'source');

        $open = CardPrintRequest::whereIn('status', ['pending', 'in_progress']);

        return response()->json([
            'by_status'   => collect(self::STATUSES)->mapWithKeys(fn ($s) => [$s => (int) ($byStatus[$s] ?? 0)]),
            'by_source'   => collect(['in_app', 'public', 'email'])->mapWithKeys(fn ($s) => [$s => (int) ($bySource[$s] ?? 0)]),
            'open_cards'  => (int) (clone $open)->sum('quantity'),
            'stale'       => (clone $open)->where('updated_at', '<', now()->subHours($staleHours))->count(),
            'stale_hours' => $staleHours,
        ]);
    }

    /** Bon de livraison PDF d'une demande. */
    public function deliveryNote(CardPrintRequest $cardPrintRequest)
    {
        $cardPrintRequest->loadMissing('organization');

        // Sous-ensemble de police : n'embarque que les glyphes utilisés (sinon
        // DejaVu complète → ~1 Mo pour une page).
        return Pdf::loadView('pdf.delivery-note', ['request' => $cardPrintRequest])
            ->setOption('isFontSubsettingEnabled', true)
            ->download("bon-livraison-{$cardPrintRequest->reference}.pdf");
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
            fputcsv($out, ['ID', 'Ticket', 'Date', 'Canal', 'Statut', 'Organisation', 'Contact', 'Société', 'Email', 'Téléphone', 'Quantité', 'Livraison', 'Note', 'Assigné', 'Traité le']);

            $query->chunk(200, function ($rows) use ($out) {
                foreach ($rows as $r) {
                    fputcsv($out, [
                        $r->id,
                        $r->reference,
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
