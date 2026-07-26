<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rattache un membre à l'événement où il a été enregistré, pour répondre à
 * « combien de nouveaux membres par événement ».
 *
 * Nullable : l'historique antérieur reste vide, et le calcul retombe alors sur
 * l'événement du premier pointage du membre (voir MemberGrowthService).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('members', 'registered_at_event_id')) {
            return;
        }

        Schema::table('members', function (Blueprint $table) {
            $table->foreignId('registered_at_event_id')
                ->nullable()
                ->after('check_in_token')
                ->constrained('events')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('members', 'registered_at_event_id')) {
            return;
        }

        Schema::table('members', function (Blueprint $table) {
            $table->dropConstrainedForeignId('registered_at_event_id');
        });
    }
};
