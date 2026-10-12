<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Numéro de ticket (référence lisible communiquée au client) et jeton public
 * non devinable (clé de la page de suivi publique) sur les demandes de cartes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('card_print_requests', function (Blueprint $table) {
            $table->string('reference')->nullable()->unique()->after('id');
            $table->uuid('public_token')->nullable()->unique()->after('reference');
        });
    }

    public function down(): void
    {
        Schema::table('card_print_requests', function (Blueprint $table) {
            $table->dropUnique(['reference']);
            $table->dropUnique(['public_token']);
            $table->dropColumn(['reference', 'public_token']);
        });
    }
};
