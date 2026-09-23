<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Horodatage de livraison des e-billets (envoi automatique au paiement).
 * Sert de garde d'idempotence : la livraison n'a lieu qu'une fois même si le
 * job est rejoué ou la commande re-marquée payée.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_orders', function (Blueprint $table) {
            $table->timestamp('tickets_delivered_at')->nullable()->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('ticket_orders', function (Blueprint $table) {
            $table->dropColumn('tickets_delivered_at');
        });
    }
};
