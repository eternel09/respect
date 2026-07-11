<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Module « Événements ponctuels » — table racine `occasions` (mariage, gala,
 * cérémonie…). Séparée du module récurrent (`events`) qu'elle ne touche pas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('occasions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('type')->default('autre'); // mariage|gala|ceremonie|anniversaire|concert|autre
            $table->date('date');
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable(); // renseigné => l'événement expire
            $table->string('location')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('occasions');
    }
};
