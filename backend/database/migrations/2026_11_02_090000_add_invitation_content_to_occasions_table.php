<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Modèle « faire-part » de l'invitation en ligne : textes (verset, familles,
 * cérémonie, programme, dress code…) et galerie de photos du couple.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->json('invitation_content')->nullable();
            $table->json('invitation_photos')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->dropColumn(['invitation_content', 'invitation_photos']);
        });
    }
};
