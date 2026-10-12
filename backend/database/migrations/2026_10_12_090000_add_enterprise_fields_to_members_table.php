<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Champs « entreprise » sur le membre (produit Présence entreprise) : fonction
 * occupée, service/département et matricule interne. Affichés sur la carte de
 * service et exportables. Tous optionnels (rétro-compatible avec l'associatif).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->string('job_title')->nullable()->after('last_name');   // fonction / poste
            $table->string('department')->nullable()->after('job_title');  // service / département
            $table->string('staff_id')->nullable()->after('department');   // matricule interne
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn(['job_title', 'department', 'staff_id']);
        });
    }
};
