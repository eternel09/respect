<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Modules activés par événement (liste de clés : guests, tables, couple_video,
 * ticketing). Null pour les événements antérieurs → le modèle retombe sur les
 * valeurs par défaut du type (config/occasions.php), donc aucune régression.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->json('features')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->dropColumn('features');
        });
    }
};
