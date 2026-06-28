<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Les super-admins plateforme ne sont rattachés à aucune organisation.
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable(false)->change();
        });
    }
};
