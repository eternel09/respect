<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Plan de salle : tables numérotées d'une occasion, avec leur capacité. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('occasion_tables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('occasion_id')->constrained()->cascadeOnDelete();
            $table->string('label');                       // "Honneur", "7", "A3"
            $table->unsignedSmallInteger('seats')->default(8);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('occasion_tables');
    }
};
