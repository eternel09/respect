<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Member extends Model
{
    /** @use HasFactory<\Database\Factories\MemberFactory> */
    use HasFactory;

    protected $fillable = ['organization_id', 'first_name', 'last_name', 'phone', 'sms_sent_at'];

    protected $casts = ['sms_sent_at' => 'datetime'];

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
