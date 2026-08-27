<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Vidéo « short » du couple, montrée à l'invité sur la page de confirmation
 * (RSVP). Une vidéo par occasion, téléversée par l'organisateur.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->string('rsvp_video_path')->nullable()->after('invitation_bg_path');
        });
    }

    public function down(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->dropColumn('rsvp_video_path');
        });
    }
};
