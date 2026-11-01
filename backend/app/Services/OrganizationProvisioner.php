<?php

namespace App\Services;

use App\Mail\OrganizationAdminWelcome;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Création d'une organisation cliente + son premier compte admin (mot de passe
 * temporaire, e-mail d'accès). Partagé par la création manuelle (super-admin)
 * et la conversion d'une demande de cartes en client.
 */
class OrganizationProvisioner
{
    /**
     * @param  callable|null  $within  travail supplémentaire exécuté dans la même
     *                                 transaction, reçoit (Organization, User)
     * @return array{0: Organization, 1: User, 2: string, 3: bool}
     *               [organisation, admin, mot de passe temporaire, e-mail envoyé]
     */
    public function create(string $name, string $adminName, string $adminEmail, array $attributes = [], ?callable $within = null): array
    {
        $tempPassword = Str::password(10, true, true, false, false);

        [$org, $admin] = DB::transaction(function () use ($name, $adminName, $adminEmail, $attributes, $tempPassword, $within) {
            $org = Organization::create([
                ...$attributes,
                'name' => $name,
                'slug' => $this->uniqueSlug($name),
                'plan' => 'free',
            ]);

            $admin = User::create([
                'organization_id' => $org->id,
                'name'            => $adminName,
                'email'           => $adminEmail,
                'password'        => Hash::make($tempPassword),
                'role'            => 'admin',
                'must_change_password' => true, // mot de passe temporaire à remplacer
            ]);

            if ($within) {
                $within($org, $admin);
            }

            return [$org, $admin];
        });

        $emailSent = true;
        try {
            Mail::to($admin->email)->send(new OrganizationAdminWelcome($org, $admin, $tempPassword));
        } catch (\Throwable) {
            $emailSent = false; // l'échec d'email ne doit pas bloquer la création
        }

        return [$org, $admin, $tempPassword, $emailSent];
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'org';
        $slug = $base;
        $i = 2;
        while (Organization::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }

        return $slug;
    }
}
