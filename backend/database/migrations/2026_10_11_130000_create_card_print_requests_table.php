<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Demandes d'impression de cartes de service : une entreprise peut demander à
 * l'opérateur (super-admin) de faire imprimer/livrer ses cartes, plutôt que de
 * les imprimer elle-même. L'opérateur suit et traite ces demandes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('card_print_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('quantity');                 // nb de cartes demandées
            $table->text('note')->nullable();                    // consignes
            $table->text('delivery_address')->nullable();        // où livrer
            $table->string('status')->default('pending');        // pending|in_progress|done|cancelled
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('handled_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('card_print_requests');
    }
};
