<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Passerelle de paiement par défaut
    |--------------------------------------------------------------------------
    | Couche générique : le code métier ne connaît que l'interface
    | App\Services\Payments\PaymentGateway. On branche un vrai agrégateur
    | (Mobile Money : CinetPay, FlexPay… ou carte) en ajoutant un driver ici,
    | sans toucher aux contrôleurs. « manual » = validation par l'organisateur.
    */

    'default' => env('PAYMENT_GATEWAY', 'manual'),

    'drivers' => [
        'manual' => \App\Services\Payments\ManualGateway::class,
        // 'cinetpay' => \App\Services\Payments\CinetPayGateway::class,
        // 'flexpay'  => \App\Services\Payments\FlexPayGateway::class,
    ],

];
