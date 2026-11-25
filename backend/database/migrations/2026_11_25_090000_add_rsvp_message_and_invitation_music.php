<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Invitation en ligne : mot laissé par l'invité aux hôtes avec sa réponse,
 * et musique d'ambiance de l'événement (modèle « heure dorée »).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            $table->text('rsvp_message')->nullable();
        });
        Schema::table('occasions', function (Blueprint $table) {
            $table->string('invitation_music_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            $table->dropColumn('rsvp_message');
        });
        Schema::table('occasions', function (Blueprint $table) {
            $table->dropColumn('invitation_music_path');
        });
    }
};
