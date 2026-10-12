<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Demande d'impression de cartes de service. Canal `source` : in_app (client
 * connecté), public (portail/prospect), email. Une demande publique peut n'avoir
 * ni organisation ni utilisateur : le contact est alors porté par la demande.
 *
 * Chaque demande porte un `reference` (numéro de ticket lisible, communiqué au
 * client) et un `public_token` (clé non devinable de la page de suivi publique).
 */
class CardPrintRequest extends Model
{
    use BelongsToOrganization;

    // Alphabet du numéro de ticket : sans caractères ambigus (0/O, 1/I/L).
    private const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

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

    protected static function booted(): void
    {
        static::creating(function (CardPrintRequest $req) {
            if (empty($req->public_token)) {
                $req->public_token = (string) Str::uuid();
            }
            if (empty($req->reference)) {
                $req->reference = static::generateReference();
            }
        });
    }

    /** Numéro de ticket unique et lisible (ex. CP-7FK3Q2). */
    public static function generateReference(): string
    {
        do {
            $code = 'CP-' . collect(range(1, 6))
                ->map(fn () => self::REF_ALPHABET[random_int(0, strlen(self::REF_ALPHABET) - 1)])
                ->implode('');
        } while (static::withoutGlobalScopes()->where('reference', $code)->exists());

        return $code;
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
