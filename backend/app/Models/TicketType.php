<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

/** Catégorie de billets d'un événement (prix + quota). */
class TicketType extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id', 'occasion_id', 'name', 'description',
        'price_cents', 'currency', 'quota', 'is_active', 'position',
    ];

    protected $casts = [
        'price_cents' => 'integer',
        'quota'       => 'integer',
        'is_active'   => 'boolean',
        'position'    => 'integer',
    ];

    public function occasion()
    {
        return $this->belongsTo(Occasion::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }

    /** Places déjà prises (billets non annulés). Les billets « void » libèrent le quota. */
    public function soldCount(): int
    {
        return $this->tickets()->whereIn('status', ['valid', 'used'])->count();
    }

    /** Places restantes, ou null si quota illimité. */
    public function remaining(): ?int
    {
        return $this->quota === null ? null : max(0, $this->quota - $this->soldCount());
    }

    /** Y a-t-il la place pour $qty billets de plus ? (true si quota illimité) */
    public function canSell(int $qty): bool
    {
        $left = $this->remaining();
        return $left === null || $qty <= $left;
    }
}
