<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mode d'envoi des invitations WhatsApp, choisi par événement :
 *  - pdf  : le carton en pièce jointe (comportement historique, par défaut)
 *  - link : un message avec le lien personnel de l'invité (carton en ligne)
 *  - both : la pièce jointe ET le lien
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->string('invitation_delivery', 10)->default('pdf')->after('invitation_message');
        });
    }

    public function down(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->dropColumn('invitation_delivery');
        });
    }
};
