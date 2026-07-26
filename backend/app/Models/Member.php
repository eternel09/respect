<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Member extends Model
{
    /** @use HasFactory<\Database\Factories\MemberFactory> */
    use BelongsToOrganization, HasFactory;

    protected $fillable = [
        'organization_id', 'first_name', 'last_name', 'phone', 'sms_sent_at',
        'check_in_token', 'registered_at_event_id',
    ];

    protected $casts = ['sms_sent_at' => 'datetime'];

    /**
     * Génère automatiquement le jeton de check-in (QR personnel) à la création.
     */
    protected static function booted(): void
    {
        static::creating(function (Member $member) {
            if (empty($member->check_in_token)) {
                $member->check_in_token = (string) Str::uuid();
            }
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
