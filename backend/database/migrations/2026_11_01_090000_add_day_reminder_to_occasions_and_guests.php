<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rappel WhatsApp le jour J : activable par événement (désactivé par défaut,
 * l'organisateur choisit), et suivi par invité pour n'envoyer qu'une fois.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->boolean('day_reminder')->default(false);
        });

        Schema::table('guests', function (Blueprint $table) {
            $table->string('reminder_status')->nullable(); // sent | failed
            $table->timestamp('reminded_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            $table->dropColumn(['reminder_status', 'reminded_at']);
        });

        Schema::table('occasions', function (Blueprint $table) {
            $table->dropColumn('day_reminder');
        });
    }
};
