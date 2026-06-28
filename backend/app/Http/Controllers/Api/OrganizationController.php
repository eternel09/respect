<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrganizationRequest;
use App\Mail\OrganizationAdminWelcome;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class OrganizationController extends Controller
{
    /**
     * Liste des organisations (vue super-admin plateforme).
     */
    public function index(): JsonResponse
    {
        $orgs = Organization::withCount('members')
            ->orderBy('name')
            ->get()
            ->map(function (Organization $o) {
                $admin = $o->users()->where('role', 'admin')->orderBy('id')->first();
                return [
                    'id'            => $o->id,
                    'name'          => $o->name,
                    'slug'          => $o->slug,
                    'plan'          => $o->plan,
                    'members_count' => $o->members_count,
                    'admin_email'   => $admin?->email,
                    'created_at'    => $o->created_at->toDateString(),
                ];
            });

        return response()->json(['data' => $orgs]);
    }

    /**
     * Crée une organisation + son premier compte admin, et envoie un email
     * d'accès à cet admin. Réservé au super-admin.
     */
    public function store(StoreOrganizationRequest $request): JsonResponse
    {
        $tempPassword = Str::password(10, true, true, false, false);

        [$org, $admin] = DB::transaction(function () use ($request, $tempPassword) {
            $org = Organization::create([
                'name' => $request->name,
                'slug' => $this->uniqueSlug($request->name),
                'plan' => 'free',
            ]);

            $admin = User::create([
                'organization_id' => $org->id,
                'name'            => $request->admin_name,
                'email'           => $request->admin_email,
                'password'        => Hash::make($tempPassword),
                'role'            => 'admin',
            ]);

            return [$org, $admin];
        });

        $emailSent = true;
        try {
            Mail::to($admin->email)->send(new OrganizationAdminWelcome($org, $admin, $tempPassword));
        } catch (\Throwable) {
            $emailSent = false; // l'échec d'email ne doit pas bloquer la création
        }

        return response()->json([
            'message'       => "Organisation « {$org->name} » créée. Email envoyé à {$admin->email}.",
            'organization'  => ['id' => $org->id, 'name' => $org->name, 'slug' => $org->slug],
            'admin'         => ['name' => $admin->name, 'email' => $admin->email],
            'temp_password' => $tempPassword, // affiché une fois au super-admin
            'email_sent'    => $emailSent,
        ], 201);
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
