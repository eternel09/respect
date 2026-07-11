<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOccasionRequest;
use App\Http\Resources\GuestResource;
use App\Http\Resources\OccasionResource;
use App\Models\Occasion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OccasionController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $occasions = Occasion::withCount(['guests', 'tables'])
            ->withCount([
                'guests as invited_count'   => fn ($q) => $q->whereIn('invite_status', ['sent', 'queued']),
                'guests as confirmed_count' => fn ($q) => $q->whereNotNull('confirmed_at'),
            ])
            ->orderBy('date', 'desc')
            ->paginate(25);

        return OccasionResource::collection($occasions);
    }

    public function store(StoreOccasionRequest $request): JsonResponse
    {
        $occasion = Occasion::create([
            ...$request->validated(),
            'organization_id' => $request->user()->organization_id,
            'created_by'      => $request->user()->id,
        ]);

        return response()->json(new OccasionResource($occasion), 201);
    }

    /** Détail : occasion + statistiques + plan de salle + invités. */
    public function show(Occasion $occasion): JsonResponse
    {
        $occasion->loadCount([
            'guests', 'tables',
            'guests as invited_count'    => fn ($q) => $q->whereIn('invite_status', ['sent', 'queued']),
            'guests as confirmed_count'  => fn ($q) => $q->whereNotNull('confirmed_at'),
            'guests as checked_in_count' => fn ($q) => $q->whereNotNull('checked_in_at'),
        ]);

        $tables = $occasion->tables()->withCount('guests')->orderBy('id')->get()
            ->map(fn ($t) => [
                'id' => $t->id, 'label' => $t->label, 'seats' => $t->seats,
                'occupied' => $t->guests_count,
            ]);

        $guests = $occasion->guests()->with('table')->orderBy('name')->get();

        return response()->json([
            'occasion' => new OccasionResource($occasion),
            'tables'   => $tables,
            'guests'   => GuestResource::collection($guests),
        ]);
    }

    public function update(StoreOccasionRequest $request, Occasion $occasion): JsonResponse
    {
        $occasion->update($request->validated());

        return response()->json(new OccasionResource($occasion));
    }

    public function destroy(Occasion $occasion): JsonResponse
    {
        $occasion->delete(); // cascade → tables + invités
        return response()->json(['message' => 'Événement supprimé.']);
    }
}
