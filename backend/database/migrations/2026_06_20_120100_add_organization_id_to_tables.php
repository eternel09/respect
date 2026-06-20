<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = ['members', 'events', 'users', 'attendances'];

    public function up(): void
    {
        $defaultId = DB::table('organizations')->where('slug', 'famille-respect')->value('id')
            ?? DB::table('organizations')->min('id');

        foreach ($this->tables as $name) {
            // 1) Colonne nullable + clé étrangère
            Schema::table($name, function (Blueprint $table) {
                $table->foreignId('organization_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            });

            // 2) Backfill des lignes existantes vers l'organisation par défaut
            if ($defaultId) {
                DB::table($name)->whereNull('organization_id')->update(['organization_id' => $defaultId]);
            }

            // 3) Passage en NOT NULL
            Schema::table($name, function (Blueprint $table) {
                $table->unsignedBigInteger('organization_id')->nullable(false)->change();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropConstrainedForeignId('organization_id');
            });
        }
    }
};
