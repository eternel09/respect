<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Verrou d'envoi groupé des invitations. Horodatage posé au démarrage d'un
 * envoi et rafraîchi au fil de l'eau (heartbeat) ; remis à null à la fin. Un
 * second envoi lancé pendant qu'un premier tourne est refusé — c'est ce qui
 * empêchait, avec l'espacement, que deux exécutions parallèles contactent les
 * mêmes invités (invitations envoyées deux fois).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->timestamp('invites_sending_at')->nullable()->after('invitation_message');
        });
    }

    public function down(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->dropColumn('invites_sending_at');
        });
    }
};
