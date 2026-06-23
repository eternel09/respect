<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMemberRequest;
use App\Http\Resources\AttendanceResource;
use App\Http\Resources\MemberResource;
use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MemberController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $members = Member::withCount('attendances')
            ->when($request->search, function ($q) use ($request) {
                $q->where(function ($q) use ($request) {
                    $q->where('first_name', 'like', "%{$request->search}%")
                      ->orWhere('last_name', 'like', "%{$request->search}%")
                      ->orWhere('phone', 'like', "%{$request->search}%");
                });
            })
            ->orderBy('last_name')
            ->paginate(25);

        return MemberResource::collection($members);
    }

    /**
     * Onboarding back-office : la secrétaire/admin enregistre un membre dans
     * son organisation. Le jeton de check-in (QR personnel) est généré
     * automatiquement par le modèle.
     */
    public function store(StoreMemberRequest $request): JsonResponse
    {
        $member = Member::create([
            ...$request->validated(),
            'organization_id' => $request->user()->organization_id,
        ]);

        return response()->json([
            'message' => $member->first_name . ' a été ajouté(e). Son badge est prêt à imprimer.',
            'member'  => new MemberResource($member),
        ], 201);
    }

    public function show(Member $member): array
    {
        $attendances = $member->attendances()->with('event')->orderBy('attended_date', 'desc')->get();

        return [
            'member'      => new MemberResource($member->loadCount('attendances')),
            'attendances' => AttendanceResource::collection($attendances),
        ];
    }
}
