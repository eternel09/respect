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
];
