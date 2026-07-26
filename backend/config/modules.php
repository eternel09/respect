<?php

/*
|--------------------------------------------------------------------------
| Catalogue des modules (applications) de la suite
|--------------------------------------------------------------------------
|
| Source de vérité côté backend : clés valides, libellé et rôles requis pour
| activer un module sur une organisation. Le front possède son propre registre
| (navigation, icônes) — les CLÉS doivent rester synchronisées entre les deux.
|
| Ajouter un module = ajouter une entrée ici + son registre front + ses pages.
|
*/

return [

    // Modules activables par défaut à la création d'une organisation.
    'defaults' => ['presence'],

    'catalog' => [

        'presence' => [
            'label'       => 'Gestion de présence',
            'description' => 'Membres, pointage par QR code, rapports et statistiques.',
        ],

        // Retiré temporairement (le temps de revoir l'approche du module mariage/
        // événementiel). Retiré du catalogue = masqué partout (sidebar, Applications,
        // inscription) et filtré de enabledModules() — les DONNÉES occasions restent
        // intactes en base. Réactivation : décommenter + le pendant dans lib/modules.jsx.
        // 'occasions' => [
        //     'label'       => 'Invitations & événements',
        //     'description' => 'Mariages, galas, cérémonies : plan de salle, invités, invitations QR.',
        // ],

    ],
];
