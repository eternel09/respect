<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** Invité d'une occasion. QR = token UUID opaque. */
class Guest extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id', 'occasion_id', 'occasion_table_id', 'name', 'phone',
        'token', 'invite_status', 'invited_at', 'invite_error',
        'confirmed_at', 'declined', 'checked_in_at', 'checked_in_by',
    ];

    protected $casts = [
        'invited_at'    => 'datetime',
        'confirmed_at'  => 'datetime',
        'checked_in_at' => 'datetime',
        'declined'      => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Guest $guest) {
            if (empty($guest->token)) {
                $guest->token = (string) Str::uuid();
            }
        });
    }

    public function occasion()
    {
        return $this->belongsTo(Occasion::class);
    }

    public function table()
    {
        return $this->belongsTo(OccasionTable::class, 'occasion_table_id');
    }

    public function checkedInBy()
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }

    public function isCheckedIn(): bool
    {
        return $this->checked_in_at !== null;
    }
}
