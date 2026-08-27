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
        'starts_at', 'ends_at', 'location', 'description',
    ];

    protected $casts = [
        'date'      => 'date',
        'starts_at' => 'datetime',
        'ends_at'   => 'datetime',
    ];

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

    /** URL publique du carton d'invitation personnalisé (ou null). */
    public function invitationBgUrl(): ?string
    {
        return $this->invitation_bg_path
            ? Storage::disk('public')->url($this->invitation_bg_path)
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

    /** URL publique de la vidéo du couple (RSVP), ou null. */
    public function rsvpVideoUrl(): ?string
    {
        return $this->rsvp_video_path
            ? Storage::disk('public')->url($this->rsvp_video_path)
            : null;
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
