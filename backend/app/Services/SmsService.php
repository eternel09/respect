<?php

namespace App\Services;

use App\Models\Member;
use Twilio\Rest\Client;

class SmsService
{
    private Client $client;
    private string $from;

    public function __construct()
    {
        $this->client = new Client(
            config('services.twilio.sid'),
            config('services.twilio.token')
        );
        $this->from = config('services.twilio.from');
    }

    public function sendWelcome(Member $member): void
    {
        if (! config('services.twilio.sid')) {
            return;
        }

        $this->client->messages->create($member->phone, [
            'from' => $this->from,
            'body' => "Bienvenue dans Famille Respect, {$member->first_name} ! Votre inscription est confirmée.",
        ]);

        $member->update(['sms_sent_at' => now()]);
    }
}
