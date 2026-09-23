<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** Commande de billets (achat en ligne ou vente au guichet). */
class TicketOrder extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id', 'occasion_id', 'reference', 'token',
        'buyer_name', 'buyer_email', 'buyer_phone',
        'status', 'currency', 'total_cents',
        'payment_provider', 'payment_reference', 'paid_at', 'created_by',
    ];

    protected $casts = [
        'total_cents' => 'integer',
        'paid_at'     => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (TicketOrder $order) {
            if (empty($order->token)) {
                $order->token = (string) Str::uuid();
            }
            if (empty($order->reference)) {
                $order->reference = 'CMD-' . strtoupper(Str::random(6));
            }
        });
    }

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

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }
}
