<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOccasionRequest;
use App\Http\Resources\GuestResource;
use App\Http\Resources\OccasionResource;
use App\Models\Occasion;
use App\Services\InvitationImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

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

    /**
     * Téléverse le carton d'invitation (option A) : une image de fond par
     * occasion, sur laquelle l'app superpose le QR + le nom de chaque invité.
     * Même carton pour tous les invités de l'événement.
     */
    public function uploadInvitation(Request $request, Occasion $occasion, InvitationImageService $images): JsonResponse
    {
        // Validation souple : on accepte largement (le client peut apporter JPG,
        // PNG, WEBP, HEIC d'iPhone ou un PDF de designer) puis on normalise. Le
        // service est le vrai garde-fou : il convertit ou refuse avec un message.
        $request->validate([
            'invitation' => ['required', 'file', 'max:12288'],
        ], [
            'invitation.required' => 'Sélectionnez une image de carton.',
            'invitation.max'      => 'Fichier trop lourd (12 Mo maximum).',
        ]);

        // Normalise en JPEG (redimensionné, aplati) ; lève une ValidationException
        // (422) si le fichier est illisible ou d'un format non pris en charge.
        $path = $images->process($request->file('invitation'));

        if ($occasion->invitation_bg_path) {
            Storage::disk('public')->delete($occasion->invitation_bg_path);
        }

        $occasion->invitation_bg_path = $path;
        $occasion->save();

        return response()->json([
            'message'            => "Carton d'invitation enregistré.",
            'invitation_bg_url'  => $occasion->invitationBgUrl(),
        ]);
    }

    /** Retire le carton d'invitation (retour au design généré par défaut). */
    public function removeInvitation(Occasion $occasion): JsonResponse
    {
        if ($occasion->invitation_bg_path) {
            Storage::disk('public')->delete($occasion->invitation_bg_path);
            $occasion->invitation_bg_path = null;
            $occasion->save();
        }

        return response()->json(['message' => "Carton d'invitation retiré."]);
    }
}
