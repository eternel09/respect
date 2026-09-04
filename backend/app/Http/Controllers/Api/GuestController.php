<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\GuestResource;
use App\Models\Guest;
use App\Models\Occasion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GuestController extends Controller
{
    public function store(Request $request, Occasion $occasion): JsonResponse
    {
        $data = $request->validate($this->rules($occasion), $this->messages());

        $guest = $occasion->guests()->create([
            'organization_id'   => $occasion->organization_id,
            'name'              => $data['name'],
            'phone'             => $data['phone'] ?? null,
            'occasion_table_id' => $data['occasion_table_id'] ?? null,
        ]);

        return response()->json(new GuestResource($guest->load('table')), 201);
    }

    /** Ajout en lot (import d'une liste d'invités). */
    public function bulkStore(Request $request, Occasion $occasion): JsonResponse
    {
        $data = $request->validate([
            'guests'                     => ['required', 'array', 'min:1', 'max:1000'],
            'guests.*.name'              => ['required', 'string', 'max:120'],
            'guests.*.phone'             => ['nullable', 'string', 'max:30'],
        ]);

        $created = collect($data['guests'])->map(fn ($g) => $occasion->guests()->create([
            'organization_id' => $occasion->organization_id,
            'name'            => $g['name'],
            'phone'           => $g['phone'] ?? null,
        ]));

        return response()->json([
            'message' => count($created) . ' invité(s) ajouté(s).',
            'count'   => $created->count(),
        ], 201);
    }

    public function update(Request $request, Guest $guest): JsonResponse
    {
        $data = $request->validate($this->rules($guest->occasion, partial: true));

        $guest->update($data);

        return response()->json(new GuestResource($guest->load('table')));
    }

    public function destroy(Guest $guest): JsonResponse
    {
        $guest->delete();
        return response()->json(['message' => 'Invité supprimé.']);
    }

    /** Suppression en masse : ne supprime que les invités de CETTE occasion. */
    public function bulkDestroy(Request $request, Occasion $occasion): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1', 'max:2000'],
            'ids.*' => ['integer'],
        ]);

        // Borné à l'occasion : des ids étrangers sont simplement ignorés.
        $deleted = $occasion->guests()->whereIn('id', $data['ids'])->delete();

        return response()->json([
            'message' => $deleted . ' invité(s) supprimé(s).',
            'count'   => $deleted,
        ]);
    }

    private function rules(Occasion $occasion, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return [
            'name'              => [$req, 'string', 'max:120'],
            'phone'             => ['nullable', 'string', 'max:30'],
            'occasion_table_id' => [
                'nullable', 'integer',
                // La table doit appartenir à CETTE occasion.
                Rule::exists('occasion_tables', 'id')->where('occasion_id', $occasion->id),
            ],
        ];
    }

    private function messages(): array
    {
        return [
            'name.required'            => "Le nom de l'invité est obligatoire.",
            'occasion_table_id.exists' => 'Table invalide pour cet événement.',
        ];
    }
}
