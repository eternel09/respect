<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Suite de modules par organisation.
 *
 * Chaque organisation active un sous-ensemble d'« applications » (présence,
 * occasions, …). La sidebar et les accès en découlent. Colonne JSON = extensible
 * sans migration à chaque nouveau module.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('organizations', 'modules')) {
            Schema::table('organizations', function (Blueprint $table) {
                $table->json('modules')->nullable()->after('plan');
            });
        }

        // Les organisations déjà en place restent des espaces « présence ».
        DB::table('organizations')
            ->whereNull('modules')
            ->update(['modules' => json_encode(['presence'])]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('organizations', 'modules')) {
            Schema::table('organizations', function (Blueprint $table) {
                $table->dropColumn('modules');
            });
        }
    }
};
