<?php

namespace App\Mail;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrganizationAdminWelcome extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Organization $organization,
        public User $admin,
        public string $tempPassword,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Votre espace « {$this->organization->name} » est prêt",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.org-admin-welcome',
            with: [
                'loginUrl' => rtrim(config('app.frontend_url'), '/') . '/admin/login',
            ],
        );
    }
}
