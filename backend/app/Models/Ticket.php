<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** Billet nominatif = une place, avec son QR scanné à l'entrée. */
class Ticket extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id', 'occasion_id', 'ticket_order_id', 'ticket_type_id',
        'type_name', 'unit_price_cents', 'token', 'holder_name',
        'status', 'checked_in_at', 'checked_in_by',
    ];

    protected $casts = [
        'unit_price_cents' => 'integer',
        'checked_in_at'    => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Ticket $ticket) {
            if (empty($ticket->token)) {
                $ticket->token = (string) Str::uuid();
            }
        });
    }

    public function order()
    {
        return $this->belongsTo(TicketOrder::class, 'ticket_order_id');
    }

    public function type()
    {
        return $this->belongsTo(TicketType::class, 'ticket_type_id');
    }

    public function occasion()
    {
        return $this->belongsTo(Occasion::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
