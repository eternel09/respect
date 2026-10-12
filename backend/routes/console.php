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
