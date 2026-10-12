<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Vocabulaire du membre, par organisation : « membre » (associatif, défaut),
 * « agent » ou « employé » (entreprise). Pilote les libellés du back-office du
 * module présence, sans toucher au modèle de données.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('member_term')->default('membre')->after('theme_color');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn('member_term');
        });
    }
};
