<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Pool de badges pré-imprimés : un badge est « vierge » tant que
        // member_id est null ; il est lié à un membre au premier scan.
        Schema::create('badges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->uuid('token')->unique();
            $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            $table->string('batch')->index(); // lot d'impression
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('badges');
    }
};
