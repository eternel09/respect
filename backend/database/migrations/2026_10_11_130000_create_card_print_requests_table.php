<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Demandes d'impression de cartes de service. Service opéré par l'équipe
 * plateforme : les demandes arrivent par plusieurs canaux (back-office d'un
 * client inscrit, portail public, e-mail) et alimentent une file de travail
 * unique que l'opérateur (super-admin) traite et affecte.
 *
 * Une demande publique peut provenir d'un prospect sans compte : l'organisation
 * est alors nulle et le contact est porté par la demande elle-même.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('card_print_requests', function (Blueprint $table) {
            $table->id();
            // Nullable : une demande publique (prospect) n'a pas encore d'organisation.
            $table->foreignId('organization_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();

            // Canal d'origine : in_app (client connecté) | public (portail) | email.
            $table->string('source')->default('in_app');

            // Contact porté par la demande (prospect public sans compte).
            $table->string('contact_name')->nullable();
            $table->string('contact_company')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();

            $table->unsignedInteger('quantity');                 // nb de cartes demandées
            $table->text('note')->nullable();                    // consignes
            $table->text('delivery_address')->nullable();        // où livrer
            $table->string('design_path')->nullable();           // visuel joint (portail public)

            $table->string('status')->default('pending');        // pending|in_progress|done|cancelled
            // Membre de l'équipe en charge de la demande.
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('handled_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['status', 'source']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('card_print_requests');
    }
};
