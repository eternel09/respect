<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jeton d'invitation réseau : l'admin d'une organisation mère génère un lien
 * partageable ; chaque responsable de sous-organisation l'ouvre et crée
 * lui-même sa sous-organisation (rattachée à la mère) + son compte admin.
 *
 * Nullable et révocable (régénérer = invalider l'ancien lien).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('organizations', 'network_invite_token')) {
            return;
        }

        Schema::table('organizations', function (Blueprint $table) {
            $table->string('network_invite_token', 64)->nullable()->unique()->after('modules');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('organizations', 'network_invite_token')) {
            return;
        }

        Schema::table('organizations', function (Blueprint $table) {
            $table->dropUnique(['network_invite_token']);
            $table->dropColumn('network_invite_token');
        });
    }
};
