<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

/** Demande d'impression de cartes de service (entreprise → opérateur). */
class CardPrintRequest extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id', 'requested_by', 'quantity', 'note',
        'delivery_address', 'status', 'handled_by', 'handled_at',
    ];

    protected $casts = [
        'quantity'   => 'integer',
        'handled_at' => 'datetime',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}
