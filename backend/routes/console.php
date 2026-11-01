<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Relance quotidienne de l'équipe sur les demandes de cartes qui stagnent.
// Nécessite le planificateur (service « scheduler » du docker-compose).
Schedule::command('cards:remind-stale')
    ->weekdays()
    ->at('08:00')
    ->timezone('Africa/Kinshasa')
    ->withoutOverlapping();

// Rappel WhatsApp du jour J aux invités (événements où l'option est activée) :
// à partir de 9 h, heure de Kinshasa, avec rattrapage toutes les 10 minutes
// jusqu'à 13 h (WhatsApp déconnecté, gros volume…). Chaque invité n'est
// rappelé qu'une fois.
Schedule::command('occasions:send-day-reminders')
    ->everyTenMinutes()
    ->between(config('occasions.day_reminder.at'), config('occasions.day_reminder.until'))
    ->timezone(config('occasions.day_reminder.timezone'))
    ->withoutOverlapping(180);
