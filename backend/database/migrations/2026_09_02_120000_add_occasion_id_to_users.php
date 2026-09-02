<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agents d'événement : un utilisateur peut être rattaché à UNE occasion précise.
 * `occasion_id` NULL  → utilisateur d'organisation classique (admin, secrétaire,
 *                       scanner) — comportement historique inchangé.
 * `occasion_id` défini → agent confiné à cet événement (accueil / gestion des
 *                       invités), quel que soit son rôle.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('occasion_id')
                ->nullable()
                ->after('organization_id')
                ->constrained('occasions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('occasion_id');
        });
    }
};
