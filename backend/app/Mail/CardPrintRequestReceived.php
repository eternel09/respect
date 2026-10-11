<?php

namespace App\Mail;

use App\Models\CardPrintRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Alerte l'équipe plateforme qu'une nouvelle demande de cartes est arrivée. */
class CardPrintRequestReceived extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public CardPrintRequest $request) {}

    public function envelope(): Envelope
    {
        $who = $this->request->contact_company
            ?: $this->request->contact_name
            ?: ($this->request->organization?->name ?? 'Prospect');

        return new Envelope(subject: "Nouvelle demande de cartes — {$who}");
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.card-print-request-received',
            with: [
                'queueUrl' => rtrim(config('app.frontend_url'), '/') . '/admin/print-requests',
            ],
        );
    }
}
