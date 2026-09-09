<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jeton du propriétaire de l'envoi groupé en cours. Chaque exécution pose son
 * propre jeton en même temps que le verrou (invites_sending_at) ; à chaque tour
 * elle vérifie qu'il est toujours le sien. Effacer le jeton (bouton « Stopper »
 * ou reprise d'un verrou périmé) fait donc s'arrêter proprement la boucle juste
 * après l'invitation en cours.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->string('invites_send_token', 64)->nullable()->after('invites_sending_at');
        });
    }

    public function down(): void
    {
        Schema::table('occasions', function (Blueprint $table) {
            $table->dropColumn('invites_send_token');
        });
    }
};
