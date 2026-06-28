<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    /** @use HasFactory<\Database\Factories\EventFactory> */
    use BelongsToOrganization, HasFactory;

    protected $fillable = ['organization_id', 'name', 'type', 'date', 'description'];

    protected $casts = ['date' => 'date'];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }
}
