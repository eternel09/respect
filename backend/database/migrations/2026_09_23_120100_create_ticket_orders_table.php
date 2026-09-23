<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Commande de billets : un achat (ou une vente au guichet) regroupant un ou
 * plusieurs billets. Le paiement passe par une couche générique (driver
 * « manuel » pour l'instant) ; `status` suit le cycle pending → paid → cancelled.
 * `token` sert au suivi public de la commande et au téléchargement des e-billets.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('occasion_id')->constrained()->cascadeOnDelete();
            $table->string('reference')->unique();        // code lisible ex. « CMD-7F3A9K »
            $table->uuid('token')->unique();              // suivi public / e-billets
            $table->string('buyer_name');
            $table->string('buyer_email')->nullable();
            $table->string('buyer_phone')->nullable();
            $table->string('status')->default('pending'); // pending|paid|cancelled
            $table->string('currency', 3)->default('CDF');
            $table->unsignedInteger('total_cents')->default(0);
            $table->string('payment_provider')->nullable(); // manual|cinetpay|…
            $table->string('payment_reference')->nullable(); // id transaction fournisseur
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['occasion_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_orders');
    }
};
