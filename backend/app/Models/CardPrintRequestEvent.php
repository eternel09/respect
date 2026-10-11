<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Entrée d'historique d'une demande d'impression (statut, affectation, note). */
class CardPrintRequestEvent extends Model
{
    protected $fillable = ['card_print_request_id', 'user_id', 'type', 'message'];

    public function request()
    {
        return $this->belongsTo(CardPrintRequest::class, 'card_print_request_id');
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
