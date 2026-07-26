<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hiérarchie d'organisations : une « église mère » regroupe des
 * sous-organisations. Chaque enfant reste totalement indépendant (ses membres,
 * ses événements, ses administrateurs) ; le parent obtient une visibilité en
 * lecture sur l'ensemble de son sous-arbre.
 *
 * parent_id NULL = organisation autonome (cas par défaut, inchangé).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('organizations', 'parent_id')) {
            return;
        }

        Schema::table('organizations', function (Blueprint $table) {
            $table->foreignId('parent_id')
                ->nullable()
                ->after('id')
                ->constrained('organizations')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('organizations', 'parent_id')) {
            return;
        }

        Schema::table('organizations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_id');
        });
    }
};
