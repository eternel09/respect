<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // 1) Colonne nullable
        Schema::table('members', function (Blueprint $table) {
            $table->uuid('check_in_token')->nullable()->after('phone');
        });

        // 2) Génère un jeton unique pour chaque membre existant
        foreach (DB::table('members')->whereNull('check_in_token')->pluck('id') as $id) {
            DB::table('members')->where('id', $id)->update(['check_in_token' => (string) Str::uuid()]);
        }

        // 3) NOT NULL + unique
        Schema::table('members', function (Blueprint $table) {
            $table->uuid('check_in_token')->nullable(false)->change();
            $table->unique('check_in_token');
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropUnique(['check_in_token']);
            $table->dropColumn('check_in_token');
        });
    }
};
