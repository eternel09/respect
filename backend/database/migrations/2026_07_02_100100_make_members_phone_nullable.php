<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // L'onboarding terrain (badge vierge scanné à l'entrée) n'a pas
        // toujours le téléphone : la colonne devient optionnelle. L'unicité
        // est conservée (les NULL multiples sont permis).
        Schema::table('members', function (Blueprint $table) {
            $table->string('phone')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->string('phone')->nullable(false)->change();
        });
    }
};
