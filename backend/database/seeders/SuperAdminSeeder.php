<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // Super-admin plateforme (interne) : aucune organisation.
        User::firstOrCreate(
            ['email' => 'super@famillerespect.cd'],
            [
                'name'            => 'Super Admin',
                'password'        => Hash::make('password'),
                'role'            => 'super_admin',
                'organization_id' => null,
            ]
        );
    }
}
