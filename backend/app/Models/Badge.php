<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Badge extends Model
{
    use BelongsToOrganization;

    protected $fillable = ['organization_id', 'token', 'member_id', 'batch'];

    protected static function booted(): void
    {
        static::creating(function (Badge $badge) {
            if (empty($badge->token)) {
                $badge->token = (string) Str::uuid();
            }
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function scopeBlank($query)
    {
        return $query->whereNull('member_id');
    }
}
