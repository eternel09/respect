<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

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
