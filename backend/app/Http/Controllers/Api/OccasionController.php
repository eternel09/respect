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
        $data = $request->validated();
        // Modules non fournis → valeurs par défaut du type (matrice).
        $data['features'] = $data['features'] ?? Occasion::defaultFeatures($data['type']);

        $occasion = Occasion::create([
            ...$data,
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
            'guests as reminded_count'   => fn ($q) => $q->where('reminder_status', 'sent'),
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
            'invitation' => ['required', 'file', 'max:30720'],
        ], [
            'invitation.required' => 'Sélectionnez une image de carton.',
            'invitation.max'      => 'Fichier trop lourd (30 Mo maximum).',
        ]);

        // Normalise en JPEG (redimensionné, aplati) ; lève une ValidationException
        // (422) si le fichier est illisible ou d'un format non pris en charge.
        $path = $images->process($request->file('invitation'));

        if ($occasion->invitation_bg_path) {
            Storage::disk('public')->delete($occasion->invitation_bg_path);
        }
        \App\Services\InvitationCartonService::forget($occasion);

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
            \App\Services\InvitationCartonService::forget($occasion);
            $occasion->invitation_bg_path = null;
            $occasion->save();
        }

        return response()->json(['message' => "Carton d'invitation retiré."]);
    }

    /**
     * Téléverse le visuel de billet personnalisé (image) : il coiffe le e-billet,
     * le QR restant apposé sur une zone blanche en dessous. Sans lui, le e-billet
     * garde le design standard. Une image (JPG/PNG/WEBP/HEIC) — pas de PDF, car
     * le QR est incrusté par-dessus au rendu.
     */
    public function uploadTicketDesign(Request $request, Occasion $occasion, InvitationImageService $images): JsonResponse
    {
        abort_if($occasion->organization_id !== $request->user()->organization_id, 404);

        $request->validate([
            'design' => ['required', 'file', 'max:30720'],
        ], [
            'design.required' => 'Sélectionnez une image de billet.',
            'design.max'      => 'Fichier trop lourd (30 Mo maximum).',
        ]);

        $file = $request->file('design');
        if (strtolower((string) $file->getClientOriginalExtension()) === 'pdf'
            || $file->getMimeType() === 'application/pdf') {
            return response()->json(['message' => 'Utilisez une image (le PDF n’est pas pris en charge pour le billet).'], 422);
        }

        // Normalise en JPEG (redimensionné) ; 422 si illisible / format non géré.
        $path = $images->process($file);

        if ($occasion->ticket_design_path) {
            Storage::disk('public')->delete($occasion->ticket_design_path);
        }
        $occasion->ticket_design_path = $path;
        $occasion->save();

        return response()->json([
            'message'           => 'Visuel de billet enregistré.',
            'ticket_design_url' => $occasion->ticketDesignUrl(),
        ]);
    }

    /** Retire le visuel de billet (retour au design standard). */
    public function removeTicketDesign(Request $request, Occasion $occasion): JsonResponse
    {
        abort_if($occasion->organization_id !== $request->user()->organization_id, 404);

        if ($occasion->ticket_design_path) {
            Storage::disk('public')->delete($occasion->ticket_design_path);
            $occasion->ticket_design_path = null;
            $occasion->save();
        }

        return response()->json(['message' => 'Visuel de billet retiré.']);
    }

    /**
     * Message d'accompagnement WhatsApp : un mot personnalisé ajouté en tête de
     * la légende automatique de chaque invitation. Vide = seule la légende
     * automatique est envoyée.
     */
    public function updateInvitationMessage(Request $request, Occasion $occasion): JsonResponse
    {
        $data = $request->validate([
            'message' => ['nullable', 'string', 'max:1000'],
        ], ['message.max' => 'Message trop long (1000 caractères maximum).']);

        $occasion->invitation_message = trim((string) ($data['message'] ?? '')) ?: null;
        $occasion->save();

        return response()->json([
            'message'            => 'Message enregistré.',
            'invitation_message' => $occasion->invitation_message,
        ]);
    }

    /**
     * Mode d'envoi des invitations : carton PDF en pièce jointe, lien personnel
     * de l'invité, ou les deux.
     */
    public function updateInvitationDelivery(Request $request, Occasion $occasion): JsonResponse
    {
        $data = $request->validate([
            'delivery' => ['required', 'in:' . implode(',', Occasion::DELIVERY_MODES)],
        ], ['delivery.in' => 'Mode d’envoi inconnu.']);

        $occasion->invitation_delivery = $data['delivery'];
        $occasion->save();

        return response()->json([
            'message'             => 'Mode d’envoi enregistré.',
            'invitation_delivery' => $occasion->invitationDelivery(),
            'invitation_links_available' => \App\Services\InvitationComposer::publicBaseUrl() !== null,
        ]);
    }

    /**
     * Design de l'invitation en ligne : palette (ou couleur libre), polices,
     * texte du cachet, carte affichée (carton du client ou carte Signiq).
     */
    public function updateInvitationTheme(Request $request, Occasion $occasion): JsonResponse
    {
        abort_if($occasion->organization_id !== $request->user()->organization_id, 404);

        $data = $request->validate([
            'palette' => ['required', 'in:' . implode(',', Occasion::THEME_PALETTES)],
            'color'   => ['nullable', 'required_if:palette,custom', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'font'    => ['required', 'in:' . implode(',', Occasion::THEME_FONTS)],
            'seal'    => ['nullable', 'string', 'max:3'],
            'card'    => ['required', 'in:' . implode(',', Occasion::THEME_CARDS)],
            'photo'   => ['nullable', 'in:' . implode(',', Occasion::THEME_PHOTO)],
            'sparkles' => ['nullable', 'boolean'],
        ], [
            'palette.in'        => 'Palette inconnue.',
            'color.required_if' => 'Choisissez une couleur.',
            'color.regex'       => 'Couleur invalide (format #RRGGBB).',
            'font.in'           => 'Style de polices inconnu.',
            'seal.max'          => 'Le cachet accepte 3 caractères au plus.',
            'card.in'           => 'Carte inconnue.',
            'photo.in'          => 'Affichage de la photo inconnu.',
        ]);

        $seal = trim((string) ($data['seal'] ?? ''));
        $occasion->invitation_theme = [
            'palette' => $data['palette'],
            'color'   => $data['palette'] === 'custom' ? strtolower($data['color']) : null,
            'font'    => $data['font'],
            'seal'    => $seal !== '' ? mb_strtoupper($seal) : null,
            'card'    => $data['card'],
            'photo'   => $data['photo'] ?? 'arch',
            'sparkles' => (bool) ($data['sparkles'] ?? true),
        ];
        $occasion->save();

        return response()->json([
            'message'          => 'Design de l’invitation enregistré.',
            'invitation_theme' => $occasion->invitationTheme(),
        ]);
    }

    /** Photo de couverture de l'invitation en ligne (couple, lieu…) : une image. */
    public function uploadInvitationCover(Request $request, Occasion $occasion, InvitationImageService $images): JsonResponse
    {
        abort_if($occasion->organization_id !== $request->user()->organization_id, 404);

        $request->validate([
            'cover' => ['required', 'file', 'max:30720'],
        ], [
            'cover.required' => 'Sélectionnez une photo.',
            'cover.max'      => 'Fichier trop lourd (30 Mo maximum).',
        ]);

        $file = $request->file('cover');
        if (strtolower((string) $file->getClientOriginalExtension()) === 'pdf'
            || $file->getMimeType() === 'application/pdf') {
            return response()->json(['message' => 'Utilisez une photo (JPG, PNG, WEBP ou HEIC).'], 422);
        }

        // Normalise en JPEG (redimensionné) ; 422 si illisible / format non géré.
        $path = $images->process($file);

        if ($occasion->invitation_cover_path) {
            Storage::disk('public')->delete($occasion->invitation_cover_path);
        }
        $occasion->invitation_cover_path = $path;
        $occasion->save();

        return response()->json([
            'message'              => 'Photo de couverture enregistrée.',
            'invitation_cover_url' => $occasion->invitationCoverUrl(),
        ]);
    }

    public function removeInvitationCover(Request $request, Occasion $occasion): JsonResponse
    {
        abort_if($occasion->organization_id !== $request->user()->organization_id, 404);

        if ($occasion->invitation_cover_path) {
            Storage::disk('public')->delete($occasion->invitation_cover_path);
            $occasion->invitation_cover_path = null;
            $occasion->save();
        }

        return response()->json(['message' => 'Photo de couverture retirée.']);
    }

    /**
     * Active / désactive le rappel WhatsApp du jour J : le matin de
     * l'événement, chaque invité qui a reçu son invitation (et ne l'a pas
     * déclinée) reçoit un message avec le lien de son invitation.
     */
    public function updateDayReminder(Request $request, Occasion $occasion): JsonResponse
    {
        abort_if($occasion->organization_id !== $request->user()->organization_id, 404);
        $data = $request->validate(['enabled' => ['required', 'boolean']]);

        $occasion->day_reminder = $data['enabled'];
        $occasion->save();

        return response()->json([
            'message'      => $occasion->day_reminder
                ? 'Rappel du jour J activé : il partira à ' . ltrim(str_replace(':', 'h', config('occasions.day_reminder.at')), '0') . ' le jour de l’événement.'
                : 'Rappel du jour J désactivé.',
            'day_reminder' => $occasion->day_reminder,
        ]);
    }

    /**
     * Téléverse la vidéo « short » du couple, montrée à l'invité sur la page de
     * confirmation (RSVP). Une vidéo par occasion. Stockée telle quelle.
     */
    public function uploadRsvpVideo(Request $request, Occasion $occasion): JsonResponse
    {
        $request->validate([
            'video' => ['required', 'file', 'mimetypes:video/mp4,video/quicktime,video/webm', 'max:102400'],
        ], [
            'video.required'  => 'Sélectionnez une vidéo.',
            'video.mimetypes' => 'Format non pris en charge : utilisez MP4, MOV ou WEBM.',
            'video.max'       => 'Vidéo trop lourde (100 Mo maximum).',
        ]);

        if ($occasion->rsvp_video_path) {
            Storage::disk('public')->delete($occasion->rsvp_video_path);
        }

        $occasion->rsvp_video_path = $request->file('video')->store('rsvp-videos', 'public');
        $occasion->save();

        return response()->json([
            'message'        => 'Vidéo enregistrée.',
            'rsvp_video_url' => $occasion->rsvpVideoUrl(),
        ]);
    }

    /** Retire la vidéo du couple. */
    public function removeRsvpVideo(Occasion $occasion): JsonResponse
    {
        if ($occasion->rsvp_video_path) {
            Storage::disk('public')->delete($occasion->rsvp_video_path);
            $occasion->rsvp_video_path = null;
            $occasion->save();
        }

        return response()->json(['message' => 'Vidéo retirée.']);
    }
}
