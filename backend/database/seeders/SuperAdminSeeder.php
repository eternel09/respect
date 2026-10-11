<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email    = env('SUPERADMIN_EMAIL', 'super@famillerespect.cd');
        $password = env('SUPERADMIN_PASSWORD');

        // En production, aucun mot de passe par défaut : il DOIT être fourni
        // explicitement (SUPERADMIN_PASSWORD). Sinon on ne crée aucun compte,
        // pour ne jamais exposer un identifiant connu en ligne.
        if (! $password) {
            if (app()->environment('production')) {
                $this->command?->warn('SUPERADMIN_PASSWORD non défini — super-admin non créé en production.');
                return;
            }
            // Hors production uniquement : mot de passe de confort pour le dev.
            $password = 'password';
        }

        // Super-admin plateforme (interne) : aucune organisation.
        User::firstOrCreate(
            ['email' => $email],
            [
                'name'            => 'Super Admin',
                'password'        => Hash::make($password),
                'role'            => 'super_admin',
                'organization_id' => null,
            ]
        );
    }
}
