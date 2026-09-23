<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Visuel de billet personnalisé (image) par événement. Optionnel : sans lui, le
 * e-billet utilise le design standard généré. Avec, l'image coiffe le billet et
 * le QR reste apposé sur une zone blanche en dessous (toujours scannable).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->string('ticket_design_path')->nullable()->after('invitation_bg_path');
        });
    }

    public function down(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->dropColumn('ticket_design_path');
        });
    }
};
