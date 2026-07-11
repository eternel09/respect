<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Occasion;
use App\Models\OccasionTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OccasionTableController extends Controller
{
    public function store(Request $request, Occasion $occasion): JsonResponse
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:40'],
            'seats' => ['required', 'integer', 'min:1', 'max:100'],
        ], ['label.required' => 'Le libellé de la table est obligatoire.']);

        $table = $occasion->tables()->create([
            'organization_id' => $occasion->organization_id,
            'label'           => $data['label'],
            'seats'           => $data['seats'],
        ]);

        return response()->json([
            'id' => $table->id, 'label' => $table->label, 'seats' => $table->seats, 'occupied' => 0,
        ], 201);
    }

    public function update(Request $request, OccasionTable $occasionTable): JsonResponse
    {
        $data = $request->validate([
            'label' => ['sometimes', 'required', 'string', 'max:40'],
            'seats' => ['sometimes', 'required', 'integer', 'min:1', 'max:100'],
        ]);

        $occasionTable->update($data);

        return response()->json([
            'id' => $occasionTable->id, 'label' => $occasionTable->label,
            'seats' => $occasionTable->seats, 'occupied' => $occasionTable->guests()->count(),
        ]);
    }

    public function destroy(OccasionTable $occasionTable): JsonResponse
    {
        $occasionTable->delete(); // les invités assignés repassent "non assignés"
        return response()->json(['message' => 'Table supprimée.']);
    }
}
