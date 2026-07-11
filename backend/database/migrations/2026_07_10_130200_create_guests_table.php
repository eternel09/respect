<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Invités d'une occasion. QR = `token` UUID opaque (comme les badges membres).
 * Suivi de l'invitation (statut/erreur), de la confirmation et de l'entrée.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('occasion_id')->constrained()->cascadeOnDelete();
            $table->foreignId('occasion_table_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->uuid('token')->unique();

            // Invitation WhatsApp
            $table->string('invite_status')->default('pending'); // pending|queued|sent|failed
            $table->timestamp('invited_at')->nullable();
            $table->text('invite_error')->nullable();

            // Réponse de l'invité
            $table->timestamp('confirmed_at')->nullable();
            $table->boolean('declined')->default(false);

            // Entrée le jour J
            $table->timestamp('checked_in_at')->nullable();
            $table->foreignId('checked_in_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->index(['occasion_id', 'invite_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guests');
    }
};
