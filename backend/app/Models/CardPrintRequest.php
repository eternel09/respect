<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

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
        'quantity', 'note', 'delivery_address', 'design_path',
        'status', 'assigned_to', 'handled_by', 'handled_at',
    ];

    protected $casts = [
        'quantity'   => 'integer',
        'handled_at' => 'datetime',
    ];

    /** URL publique du visuel joint (portail), ou null. */
    public function designUrl(): ?string
    {
        return $this->design_path ? Storage::disk('public')->url($this->design_path) : null;
    }

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
}
