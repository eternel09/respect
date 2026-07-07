<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS)
    |--------------------------------------------------------------------------
    |
    | Le back-office (app.domaine) et l'API (api.domaine) sont sur des origines
    | distinctes en prod. L'auth étant par token Bearer (stateless, sans cookie),
    | on n'active PAS supports_credentials — on autorise simplement l'origine du
    | front. En dev, la valeur par défaut '*' laisse tout passer (proxy Vite).
    |
    | CORS_ALLOWED_ORIGINS : liste séparée par des virgules
    |   ex. https://app.signiq.cd,https://admin.signiq.cd
    |
    */

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(
        explode(',', env('CORS_ALLOWED_ORIGINS', '*'))
    ),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    // Le front lit ce header pour le nom de fichier des PDF téléchargés.
    'exposed_headers' => ['Content-Disposition'],

    'max_age' => 3600,

    'supports_credentials' => false,

];
