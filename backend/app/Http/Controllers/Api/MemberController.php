<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceResource;
use App\Http\Resources\MemberResource;
use App\Models\Member;
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

    public function show(Member $member): array
    {
        $attendances = $member->attendances()->with('event')->orderBy('attended_date', 'desc')->get();

        return [
            'member'      => new MemberResource($member->loadCount('attendances')),
            'attendances' => AttendanceResource::collection($attendances),
        ];
    }
}
