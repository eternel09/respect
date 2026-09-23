<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Billet nominatif = une place. Chaque billet porte un `token` opaque encodé
 * dans son QR, scanné à l'entrée (un billet ne passe qu'une fois : `used`).
 * Le nom de catégorie et le prix sont copiés (snapshot) pour rester justes même
 * si la catégorie est modifiée ou supprimée par la suite.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('occasion_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ticket_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ticket_type_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type_name');                  // snapshot du libellé de catégorie
            $table->unsignedInteger('unit_price_cents')->default(0); // snapshot du prix
            $table->uuid('token')->unique();              // QR e-billet
            $table->string('holder_name')->nullable();    // nom du porteur (optionnel)
            $table->string('status')->default('valid');   // valid|used|void
            $table->timestamp('checked_in_at')->nullable();
            $table->foreignId('checked_in_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['occasion_id', 'status']);
            $table->index(['ticket_type_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
