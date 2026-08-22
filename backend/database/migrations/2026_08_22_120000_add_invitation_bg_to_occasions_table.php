<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Carton d'invitation personnalisé (option A) : une image de fond par occasion.
 * L'app la consomme et superpose le QR de l'invité + son nom au moment de l'envoi.
 * Même fond pour tous les invités de l'événement.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->string('invitation_bg_path')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->dropColumn('invitation_bg_path');
        });
    }
};
