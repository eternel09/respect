<?php

namespace App\Mail;

use App\Models\CardPrintRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Accusé de réception envoyé au demandeur, avec son numéro de ticket + lien de suivi. */
class CardPrintRequestConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public CardPrintRequest $request) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Votre demande de cartes — ticket {$this->request->reference}");
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.card-print-request-confirmation',
            with: [
                'trackUrl' => rtrim(config('app.frontend_url'), '/') . '/suivi/' . $this->request->public_token,
            ],
        );
    }
}
