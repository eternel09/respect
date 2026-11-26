<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adresse de l'événement, saisie à part du nom de la salle (« Lieu ») :
 * affichée sous la salle sur l'invitation et utilisée pour l'itinéraire.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->string('address', 255)->nullable()->after('location');
        });
    }

    public function down(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->dropColumn('address');
        });
    }
};
