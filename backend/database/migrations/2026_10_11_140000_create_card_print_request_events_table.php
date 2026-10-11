<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Historique d'une demande d'impression : trace « qui a fait quoi » et les
 * notes internes de l'équipe (échanges avec le client, consignes de suivi).
 * Chaque entrée est horodatée et rattachée à son auteur (nul si système/public).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('card_print_request_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_print_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type');              // created | status | assigned | note
            $table->text('message')->nullable(); // libellé lisible ou note libre
            $table->timestamps();

            $table->index(['card_print_request_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('card_print_request_events');
    }
};
