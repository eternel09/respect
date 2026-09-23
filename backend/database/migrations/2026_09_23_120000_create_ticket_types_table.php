<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catégories de billets d'un événement (VIP, Standard, Gratuit…). Chacune a son
 * prix et, éventuellement, un quota de places. Le prix est en centimes de
 * l'unité monétaire (entier) pour éviter tout arrondi flottant.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('occasion_id')->constrained()->cascadeOnDelete();
            $table->string('name');                       // ex. « VIP »
            $table->text('description')->nullable();
            $table->unsignedInteger('price_cents')->default(0);  // 0 = gratuit
            $table->string('currency', 3)->default('CDF');
            $table->unsignedInteger('quota')->nullable(); // null = illimité
            $table->boolean('is_active')->default(true);  // en vente ?
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['occasion_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_types');
    }
};
