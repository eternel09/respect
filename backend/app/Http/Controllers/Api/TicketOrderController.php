<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TicketOrderResource;
use App\Models\Occasion;
use App\Models\TicketOrder;
use App\Services\Payments\PaymentManager;
use App\Services\TicketOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Commandes de billets : achat public + gestion par l'organisateur. */
class TicketOrderController extends Controller
{
    public function __construct(private readonly TicketOrderService $orders)
    {
    }

    // ── Public (acheteurs) ──────────────────────────────────────

    /** Vitrine : événement + catégories en vente avec places restantes. */
    public function storefront(Occasion $occasion): JsonResponse
    {
        $types = $occasion->ticketTypes()->where('is_active', true)
            ->orderBy('position')->orderBy('id')->get()
            ->map(fn ($t) => [
                'id'          => $t->id,
                'name'        => $t->name,
                'description' => $t->description,
                'price_cents' => $t->price_cents,
                'currency'    => $t->currency,
                'remaining'   => $t->remaining(),
                'sold_out'    => $t->remaining() === 0,
            ]);

        return response()->json([
            'occasion' => [
                'id'       => $occasion->id,
                'name'     => $occasion->name,
                'date'     => $occasion->date->toDateString(),
                'location' => $occasion->location,
                'closed'   => $occasion->isExpired(),
            ],
            'ticket_types' => $types,
        ]);
    }

    /** Achat public : crée une commande en attente et démarre le paiement. */
    public function storePublic(Occasion $occasion, Request $request, PaymentManager $payments): JsonResponse
    {
        abort_if($occasion->isExpired(), 422, 'La billetterie de cet événement est fermée.');

        [$buyer, $items] = $this->validatedOrder($request);

        $order  = $this->orders->create($occasion, $buyer, $items);
        $result = $payments->gateway()->initiate($order);

        $order->update([
            'payment_provider'  => $result->provider,
            'payment_reference' => $result->reference,
        ]);
        if ($result->status === 'paid') {
            $this->orders->markPaid($order, $result->provider, $result->reference);
        }

        return response()->json([
            'order'   => new TicketOrderResource($order->fresh('tickets')),
            'payment' => [
                'status'       => $result->status,
                'instructions' => $result->instructions,
                'redirect_url' => $result->redirectUrl,
            ],
        ], 201);
    }

    /** Suivi public d'une commande par son jeton (statut + billets). */
    public function showPublic(string $token): JsonResponse
    {
        $order = TicketOrder::where('token', $token)->with('tickets')->first();
        abort_unless($order, 404, 'Commande introuvable.');

        return response()->json(['order' => new TicketOrderResource($order)]);
    }

    // ── Organisateur ────────────────────────────────────────────

    public function index(Occasion $occasion, Request $request): JsonResponse
    {
        abort_if($occasion->organization_id !== $request->user()->organization_id, 404);

        $orders = $occasion->ticketOrders()->withCount('tickets')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()->paginate(30);

        return response()->json([
            'data' => TicketOrderResource::collection($orders->items()),
            'meta' => ['current_page' => $orders->currentPage(), 'last_page' => $orders->lastPage(), 'total' => $orders->total()],
        ]);
    }

    /** Vente au guichet : commande créée puis marquée payée (encaissement direct). */
    public function storeManual(Occasion $occasion, Request $request): JsonResponse
    {
        abort_if($occasion->organization_id !== $request->user()->organization_id, 404);

        [$buyer, $items] = $this->validatedOrder($request);

        $order = $this->orders->create($occasion, $buyer, $items, $request->user()->id);
        $this->orders->markPaid($order, 'manual');

        return response()->json(new TicketOrderResource($order->fresh('tickets')), 201);
    }

    public function show(TicketOrder $ticketOrder): JsonResponse
    {
        return response()->json(new TicketOrderResource($ticketOrder->load('tickets')));
    }

    public function markPaid(TicketOrder $ticketOrder): JsonResponse
    {
        $this->orders->markPaid($ticketOrder, $ticketOrder->payment_provider ?? 'manual');

        return response()->json([
            'message' => 'Commande marquée comme payée. Les billets sont disponibles.',
            'order'   => new TicketOrderResource($ticketOrder->fresh('tickets')),
        ]);
    }

    public function cancel(TicketOrder $ticketOrder): JsonResponse
    {
        $this->orders->cancel($ticketOrder);

        return response()->json([
            'message' => 'Commande annulée, places libérées.',
            'order'   => new TicketOrderResource($ticketOrder->fresh('tickets')),
        ]);
    }

    /** Valide le corps de la requête et renvoie [buyer[], items[]]. */
    private function validatedOrder(Request $request): array
    {
        $data = $request->validate([
            'buyer_name'  => ['required', 'string', 'max:120'],
            'buyer_email' => ['nullable', 'email', 'max:190'],
            'buyer_phone' => ['nullable', 'string', 'max:30'],
            'items'                   => ['required', 'array', 'min:1'],
            'items.*.ticket_type_id'  => ['required', 'integer'],
            'items.*.quantity'        => ['required', 'integer', 'min:1', 'max:50'],
            'items.*.holder_names'    => ['nullable', 'array'],
            'items.*.holder_names.*'  => ['nullable', 'string', 'max:120'],
        ]);

        $buyer = [
            'buyer_name'  => $data['buyer_name'],
            'buyer_email' => $data['buyer_email'] ?? null,
            'buyer_phone' => $data['buyer_phone'] ?? null,
        ];

        return [$buyer, $data['items']];
    }
}
