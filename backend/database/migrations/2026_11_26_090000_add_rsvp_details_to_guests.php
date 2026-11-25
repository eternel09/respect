<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Réponse détaillée de l'invité (modèle « heure dorée ») : nombre de
 * personnes qui l'accompagnent (lui compris) et e-mail de contact.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            $table->unsignedTinyInteger('party_size')->nullable();
            $table->string('email', 120)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            $table->dropColumn(['party_size', 'email']);
        });
    }
};
