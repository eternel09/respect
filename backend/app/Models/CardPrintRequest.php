<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

/**
 * Demande d'impression de cartes de service. Canal `source` : in_app (client
 * connecté), public (portail/prospect), email. Une demande publique peut n'avoir
 * ni organisation ni utilisateur : le contact est alors porté par la demande.
 */
class CardPrintRequest extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id', 'requested_by', 'source',
        'contact_name', 'contact_company', 'contact_email', 'contact_phone',
        'quantity', 'note', 'delivery_address',
        'status', 'assigned_to', 'handled_by', 'handled_at',
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

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function events()
    {
        return $this->hasMany(CardPrintRequestEvent::class);
    }

    /** Journalise une entrée d'historique (statut, affectation, note…). */
    public function logEvent(string $type, ?string $message = null, ?int $userId = null): CardPrintRequestEvent
    {
        return $this->events()->create(['type' => $type, 'message' => $message, 'user_id' => $userId]);
    }
}
