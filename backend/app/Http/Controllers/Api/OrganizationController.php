<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrganizationRequest;
use App\Models\Organization;
use App\Services\OrganizationProvisioner;
use Illuminate\Http\JsonResponse;

class OrganizationController extends Controller
{
    /**
     * Liste des organisations (vue super-admin plateforme).
     */
    public function index(): JsonResponse
    {
        $orgs = Organization::withCount('members')
            ->orderBy('name')
            ->paginate(25);

        $orgs->getCollection()->transform(function (Organization $o) {
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

        return response()->json([
            'data' => $orgs->items(),
            'meta' => [
                'total'        => $orgs->total(),
                'last_page'    => $orgs->lastPage(),
                'current_page' => $orgs->currentPage(),
            ],
        ]);
    }

    /**
     * Crée une organisation + son premier compte admin, et envoie un email
     * d'accès à cet admin. Réservé au super-admin.
     */
    public function store(StoreOrganizationRequest $request, OrganizationProvisioner $provisioner): JsonResponse
    {
        [$org, $admin, $tempPassword, $emailSent] = $provisioner->create(
            $request->name, $request->admin_name, $request->admin_email,
        );

        return response()->json([
            'message'       => "Organisation « {$org->name} » créée. Email envoyé à {$admin->email}.",
            'organization'  => ['id' => $org->id, 'name' => $org->name, 'slug' => $org->slug],
            'admin'         => ['name' => $admin->name, 'email' => $admin->email],
            'temp_password' => $tempPassword, // affiché une fois au super-admin
            'email_sent'    => $emailSent,
        ], 201);
    }
}
