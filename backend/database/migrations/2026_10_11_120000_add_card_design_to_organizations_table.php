<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Visuel de carte de service personnalisé par organisation (produit Présence
 * entreprise). Image optionnelle : le QR et le nom sont apposés dessus au rendu.
 * Sans visuel, la carte garde le design standard généré.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('card_design_path')->nullable()->after('logo_path');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn('card_design_path');
        });
    }
};
