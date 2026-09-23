<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TicketTypeResource;
use App\Models\Occasion;
use App\Models\TicketType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Gestion des catégories de billets d'un événement (organisateur). */
class TicketTypeController extends Controller
{
    public function index(Occasion $occasion, Request $request): JsonResponse
    {
        abort_if($occasion->organization_id !== $request->user()->organization_id, 404);

        $types = $occasion->ticketTypes()->orderBy('position')->orderBy('id')->get();

        return response()->json(['data' => TicketTypeResource::collection($types)]);
    }

    public function store(Occasion $occasion, Request $request): JsonResponse
    {
        abort_if($occasion->organization_id !== $request->user()->organization_id, 404);

        $data = $this->validated($request);

        $type = $occasion->ticketTypes()->create([
            'organization_id' => $occasion->organization_id,
            ...$data,
        ]);

        return response()->json(new TicketTypeResource($type), 201);
    }

    public function update(TicketType $ticketType, Request $request): JsonResponse
    {
        $data = $this->validated($request, partial: true);
        $ticketType->update($data);

        return response()->json(new TicketTypeResource($ticketType->fresh()));
    }

    public function destroy(TicketType $ticketType): JsonResponse
    {
        // Des billets déjà vendus référencent la catégorie (nullOnDelete) mais
        // gardent leur snapshot (type_name, prix) : la suppression n'efface pas
        // l'historique des ventes.
        $ticketType->delete();

        return response()->json(['message' => 'Catégorie supprimée.']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name'        => [$req, 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'price_cents' => [$req, 'integer', 'min:0', 'max:100000000'],
            'currency'    => ['sometimes', 'string', 'size:3'],
            'quota'       => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'is_active'   => ['sometimes', 'boolean'],
            'position'    => ['sometimes', 'integer', 'min:0'],
        ], [
            'price_cents.min' => 'Le prix ne peut pas être négatif.',
            'quota.min'       => 'Le quota doit être au moins 1 (laisser vide = illimité).',
        ]);
    }
}
