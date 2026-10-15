<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Liste du personnel jointe à une demande publique (fichier Excel/CSV lu côté
 * navigateur) et vocabulaire choisi par le client (agent / employé). À la
 * conversion en organisation cliente, la liste devient ses membres.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('card_print_requests', function (Blueprint $table) {
            $table->json('staff')->nullable()->after('delivery_address');
            $table->string('member_term')->nullable()->after('staff');
        });
    }

    public function down(): void
    {
        Schema::table('card_print_requests', function (Blueprint $table) {
            $table->dropColumn(['staff', 'member_term']);
        });
    }
};
