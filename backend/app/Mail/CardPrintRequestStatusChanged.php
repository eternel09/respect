<?php

namespace App\Mail;

use App\Models\CardPrintRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Informe le demandeur que sa demande a avancé (en cours, terminée, annulée). */
class CardPrintRequestStatusChanged extends Mailable
{
    use Queueable, SerializesModels;

    public const HEADLINES = [
        'in_progress' => 'Votre demande est en cours de traitement',
        'done'        => 'Vos cartes sont prêtes',
        'cancelled'   => 'Votre demande a été annulée',
    ];

    public function __construct(public CardPrintRequest $request) {}

    public function envelope(): Envelope
    {
        $headline = self::HEADLINES[$this->request->status] ?? 'Mise à jour de votre demande';

        return new Envelope(subject: "{$headline} — ticket {$this->request->reference}");
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.card-print-request-status',
            with: [
                'headline' => self::HEADLINES[$this->request->status] ?? 'Mise à jour de votre demande',
                'trackUrl' => rtrim(config('app.frontend_url'), '/') . '/suivi/' . $this->request->public_token,
            ],
        );
    }
}
