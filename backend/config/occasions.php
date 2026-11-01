<?php

/*
|--------------------------------------------------------------------------
| Modules d'un événement (occasion)
|--------------------------------------------------------------------------
|
| Chaque événement active un sous-ensemble de modules. L'interface n'affiche
| que ce qui est activé → un concert (billetterie seule) ne montre pas le
| carton d'invitation ni la vidéo du couple, etc. `defaults` donne les modules
| pré-cochés selon le type ; l'organisateur peut ensuite ajuster.
|
| Modules :
|   guests       Invitations & invités (liste nominative, envoi WhatsApp,
|                carton d'invitation, message d'accompagnement, RSVP, export).
|   tables       Plan de salle (tables + assignation).
|   couple_video Vidéo du couple sur la page de confirmation (spécifique mariage).
|   ticketing    Billetterie (billets payants, e-billets, contrôle à l'entrée).
|
*/

return [

    'modules' => ['guests', 'tables', 'couple_video', 'ticketing'],

    'defaults' => [
        'mariage'      => ['guests', 'tables', 'couple_video'],
        'gala'         => ['guests', 'tables', 'ticketing'],
        'ceremonie'    => ['guests'],
        'anniversaire' => ['guests', 'tables'],
        'concert'      => ['ticketing'],
        'autre'        => ['guests', 'tables', 'ticketing'],
    ],

    // Repli si un type inconnu ou aucune valeur par défaut.
    'fallback' => ['guests'],

    // Rappel WhatsApp le jour J (option par événement) : envoyé à partir de
    // cette heure, dans ce fuseau — celui où l'organisateur saisit les heures
    // de ses événements. Le planificateur rattrape les envois jusqu'à
    // `until` (WhatsApp déconnecté à 9 h, gros volume d'invités…).
    'day_reminder' => [
        'at'       => env('OCCASION_REMINDER_AT', '09:00'),
        'until'    => env('OCCASION_REMINDER_UNTIL', '13:00'),
        'timezone' => env('OCCASION_REMINDER_TZ', 'Africa/Kinshasa'),
    ],
];
