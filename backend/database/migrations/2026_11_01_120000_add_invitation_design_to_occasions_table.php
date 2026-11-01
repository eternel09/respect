<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Design de l'invitation en ligne, propre à chaque événement : palette (ou
 * couleur libre), polices, texte du cachet, carte affichée (carte Signiq ou
 * carton du client) et photo de couverture.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->json('invitation_theme')->nullable();
            $table->string('invitation_cover_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->dropColumn(['invitation_theme', 'invitation_cover_path']);
        });
    }
};
