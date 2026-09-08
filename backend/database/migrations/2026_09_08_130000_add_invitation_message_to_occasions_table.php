<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Message d'accompagnement WhatsApp : un mot personnalisé de l'organisateur,
 * ajouté à la légende automatique de chaque invitation envoyée.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->text('invitation_message')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->dropColumn('invitation_message');
        });
    }
};
