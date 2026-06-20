<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('logo_path')->nullable();
            $table->string('theme_color')->nullable();
            $table->string('plan')->default('free');
            $table->timestamps();
        });

        // Organisation par défaut (tenant n°1) pour rattacher les données existantes.
        DB::table('organizations')->insert([
            'name'       => 'Famille Respect',
            'slug'       => 'famille-respect',
            'plan'       => 'free',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
