<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

/** Relance : récapitulatif à l'équipe des demandes de cartes qui stagnent. */
class CardPrintRequestDigest extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Collection $requests, public int $staleHours) {}

    public function envelope(): Envelope
    {
        $n = $this->requests->count();

        return new Envelope(subject: "Relance : {$n} demande(s) de cartes en attente de traitement");
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.card-print-request-digest',
            with: [
                'queueUrl' => rtrim(config('app.frontend_url'), '/') . '/admin/print-requests',
            ],
        );
    }
}
