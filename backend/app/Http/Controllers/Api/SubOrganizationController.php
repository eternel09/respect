<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrganizationRequest;
use App\Mail\OrganizationAdminWelcome;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Provisionnement des sous-organisations par l'admin d'une organisation mère.
 *
 * L'admin de l'église crée les sous-organisations ET leur premier admin ; ces
 * admins gèrent ensuite leur présence en toute indépendance. Hiérarchie limitée
 * à deux niveaux : une sous-organisation ne peut pas en créer d'autres.
 */
class SubOrganizationController extends Controller
{
    /** Sous-organisations de l'organisation de l'utilisateur. */
    public function index(Request $request): JsonResponse
    {
        $org = $request->user()->organization;
        abort_if($org === null, 404);

        $children = $org->children()
            ->withCount('members')
            ->orderBy('name')
            ->get()
            ->map(function (Organization $child) {
                $admin = $child->users()->where('role', 'admin')->orderBy('id')->first();
                return [
                    'id'            => $child->id,
                    'name'          => $child->name,
                    'members_count' => $child->members_count,
                    'admin_name'    => $admin?->name,
                    'admin_email'   => $admin?->email,
                    'created_at'    => $child->created_at->toDateString(),
                ];
            });

        return response()->json([
            'can_manage' => $org->parent_id === null,
            'data'       => $children,
        ]);
    }

    /** Crée une sous-organisation + son premier admin. */
    public function store(StoreOrganizationRequest $request): JsonResponse
    {
        $parent = $request->user()->organization;
        abort_if($parent === null, 404);

        // Deux niveaux maximum : une sous-organisation ne provisionne pas d'enfants.
        abort_unless(
            $parent->parent_id === null,
            422,
            "Une sous-organisation ne peut pas créer d'autres sous-organisations.",
        );

        $tempPassword = Str::password(10, true, true, false, false);

        [$child, $admin] = DB::transaction(function () use ($request, $parent, $tempPassword) {
            $child = Organization::create([
                'parent_id' => $parent->id,
                'name'      => $request->name,
                'slug'      => $this->uniqueSlug($request->name),
                'plan'      => $parent->plan,
                // Les sous-organisations héritent des modules de la mère.
                'modules'   => $parent->enabledModules(),
            ]);

            $admin = User::create([
                'organization_id' => $child->id,
                'name'            => $request->admin_name,
                'email'           => $request->admin_email,
                'password'        => Hash::make($tempPassword),
                'role'            => 'admin',
            ]);

            return [$child, $admin];
        });

        $emailSent = true;
        try {
            Mail::to($admin->email)->send(new OrganizationAdminWelcome($child, $admin, $tempPassword));
        } catch (\Throwable) {
            $emailSent = false; // l'échec d'email ne bloque pas la création
        }

        return response()->json([
            'message'       => "Sous-organisation « {$child->name} » créée.",
            'organization'  => ['id' => $child->id, 'name' => $child->name],
            'admin'         => ['name' => $admin->name, 'email' => $admin->email],
            'temp_password' => $tempPassword, // affiché une seule fois à l'admin mère
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
