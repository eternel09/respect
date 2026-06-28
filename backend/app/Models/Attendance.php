<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    /** @use HasFactory<\Database\Factories\AttendanceFactory> */
    use BelongsToOrganization, HasFactory;

    protected $fillable = ['organization_id', 'member_id', 'event_id', 'attended_date', 'scanned_by'];

    protected $casts = ['attended_date' => 'date'];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function scannedBy()
    {
        return $this->belongsTo(User::class, 'scanned_by');
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
