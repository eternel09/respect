<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * Événement ponctuel (mariage, gala, cérémonie…). Module distinct du récurrent.
 */
class Occasion extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id', 'created_by', 'name', 'type', 'date',
        'starts_at', 'ends_at', 'location', 'description', 'invitation_message', 'features',
        'invitation_delivery',
    ];

    /**
     * Design de l'invitation en ligne. Palettes nommées (« auto » = couleur du
     * type d'événement) ou couleur libre ; polices ; carte affichée : « auto »
     * = le carton du client s'il en a téléversé un, sinon la carte Signiq.
     */
    public const THEME_PALETTES = ['auto', 'bordeaux', 'emeraude', 'nuit', 'rose', 'noir', 'violet', 'terracotta', 'custom'];
    public const THEME_FONTS = ['classique', 'romantique', 'moderne'];
    public const THEME_CARDS = ['auto', 'carton', 'signiq', 'none'];
    /** Photo de couverture : en arche sous la carte, en fond de page, ou les deux. */
    public const THEME_PHOTO = ['arch', 'background', 'both'];

    /** Modes d'envoi des invitations : pièce jointe, lien personnel, ou les deux. */
    public const DELIVERY_MODES = ['pdf', 'link', 'both'];

    protected $casts = [
        'date'               => 'date',
        'starts_at'          => 'datetime',
        'ends_at'            => 'datetime',
        'invites_sending_at' => 'datetime',
        'features'           => 'array',
        'day_reminder'       => 'boolean',
        'invitation_theme'   => 'array',
    ];

    /** Modules activés par défaut pour un type d'événement (config/occasions.php). */
    public static function defaultFeatures(?string $type): array
    {
        return config("occasions.defaults.{$type}", config('occasions.fallback', ['guests']));
    }

    /** Modules actifs : ceux enregistrés, sinon le défaut du type (rétro-compat). */
    public function featureList(): array
    {
        return $this->features ?? self::defaultFeatures($this->type);
    }

    /** Le module est-il actif sur cet événement ? */
    public function hasFeature(string $key): bool
    {
        return in_array($key, $this->featureList(), true);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tables()
    {
        return $this->hasMany(OccasionTable::class);
    }

    public function guests()
    {
        return $this->hasMany(Guest::class);
    }

    public function ticketTypes()
    {
        return $this->hasMany(TicketType::class);
    }

    public function ticketOrders()
    {
        return $this->hasMany(TicketOrder::class);
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }

    /** URL publique du carton d'invitation personnalisé (ou null). */
    public function invitationBgUrl(): ?string
    {
        return $this->invitation_bg_path
            ? Storage::disk('public')->url($this->invitation_bg_path)
            : null;
    }

    /** Mode d'envoi des invitations (« pdf » par défaut). */
    public function invitationDelivery(): string
    {
        return in_array($this->invitation_delivery, self::DELIVERY_MODES, true) ? $this->invitation_delivery : 'pdf';
    }

    /** L'envoi joint-il le lien personnel de l'invité (modes « link » et « both ») ? */
    public function sendsInvitationLink(): bool
    {
        return $this->invitationDelivery() !== 'pdf';
    }

    /** Le carton téléversé est un modèle PDF (repères détectés à l'envoi). */
    public function invitationIsPdf(): bool
    {
        return $this->invitation_bg_path !== null
            && str_ends_with(strtolower($this->invitation_bg_path), '.pdf');
    }

    /** Contenu du modèle PDF en base64 (pour le service WhatsApp), ou null. */
    public function invitationTemplateBase64(): ?string
    {
        if (! $this->invitationIsPdf()) {
            return null;
        }
        $disk = Storage::disk('public');
        return $disk->exists($this->invitation_bg_path)
            ? base64_encode($disk->get($this->invitation_bg_path))
            : null;
    }

    /**
     * Carton d'invitation en data-URI (pour le rendu Puppeteer côté WhatsApp) —
     * même principe que le logo d'organisation. Null si aucun carton ou fichier
     * absent.
     */
    public function invitationBgDataUri(): ?string
    {
        if (! $this->invitation_bg_path) {
            return null;
        }

        $disk = Storage::disk('public');
        if (! $disk->exists($this->invitation_bg_path)) {
            return null;
        }

        $mime = $disk->mimeType($this->invitation_bg_path) ?: 'image/png';

        return 'data:' . $mime . ';base64,' . base64_encode($disk->get($this->invitation_bg_path));
    }

    /** Design de l'invitation en ligne, valeurs par défaut comprises. */
    public function invitationTheme(): array
    {
        $theme = $this->invitation_theme ?? [];

        return [
            'palette' => in_array($theme['palette'] ?? null, self::THEME_PALETTES, true) ? $theme['palette'] : 'auto',
            'color'   => $theme['color'] ?? null,
            'font'    => in_array($theme['font'] ?? null, self::THEME_FONTS, true) ? $theme['font'] : 'classique',
            'seal'    => $theme['seal'] ?? null,
            'card'    => in_array($theme['card'] ?? null, self::THEME_CARDS, true) ? $theme['card'] : 'auto',
            'photo'   => in_array($theme['photo'] ?? null, self::THEME_PHOTO, true) ? $theme['photo'] : 'arch',
            // Paillettes dorées (étoiles flottantes, gerbes à l'ouverture et à la confirmation).
            'sparkles' => (bool) ($theme['sparkles'] ?? true),
        ];
    }

    /** La page en ligne montre-t-elle le carton du client (plutôt que la carte Signiq) ? */
    public function showsCartonOnline(): bool
    {
        return $this->invitation_bg_path !== null
            && ! in_array($this->invitationTheme()['card'], ['signiq', 'none'], true);
    }

    /** URL publique de la photo de couverture de l'invitation en ligne, ou null. */
    public function invitationCoverUrl(): ?string
    {
        return $this->invitation_cover_path
            ? Storage::disk('public')->url($this->invitation_cover_path)
            : null;
    }

    /** URL publique de la vidéo du couple (RSVP), ou null. */
    public function rsvpVideoUrl(): ?string
    {
        return $this->rsvp_video_path
            ? Storage::disk('public')->url($this->rsvp_video_path)
            : null;
    }

    /** URL publique du visuel de billet personnalisé, ou null. */
    public function ticketDesignUrl(): ?string
    {
        return $this->ticket_design_path
            ? Storage::disk('public')->url($this->ticket_design_path)
            : null;
    }

    /** Visuel de billet en data-URI (pour l'incrustation dans le PDF dompdf), ou null. */
    public function ticketDesignDataUri(): ?string
    {
        if (! $this->ticket_design_path) {
            return null;
        }

        $disk = Storage::disk('public');
        if (! $disk->exists($this->ticket_design_path)) {
            return null;
        }

        $mime = $disk->mimeType($this->ticket_design_path) ?: 'image/jpeg';

        return 'data:' . $mime . ';base64,' . base64_encode($disk->get($this->ticket_design_path));
    }

    /** Passé (la fin, sinon la date, est dépassée) → plus scannable. */
    public function isExpired(): bool
    {
        $end = $this->ends_at ?? $this->date?->endOfDay();
        return $end !== null && $end->isPast();
    }

    /** Occasions encore actives (pour la liste des agents d'accueil). */
    public function scopeActive($query)
    {
        return $query->where(fn ($q) => $q
            ->whereNull('ends_at')->where('date', '>=', now()->toDateString())
            ->orWhere('ends_at', '>=', now()));
    }
}
