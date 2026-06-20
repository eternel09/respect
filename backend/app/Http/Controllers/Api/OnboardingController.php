<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\OnboardingRequest;
use App\Models\Member;
use App\Models\Organization;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;

class OnboardingController extends Controller
{
    public function store(OnboardingRequest $request, SmsService $sms): JsonResponse
    {
        $existing = Member::where('phone', $request->phone)->first();

        if ($existing) {
            return response()->json([
                'message' => 'Vous êtes déjà enregistré. Bienvenue, ' . $existing->first_name . ' !',
                'already_registered' => true,
            ], 409);
        }

        $member = Member::create([
            ...$request->validated(),
            'organization_id' => Organization::defaultId(),
        ]);

        try {
            $sms->sendWelcome($member);
        } catch (\Throwable) {
            // SMS failure must not block registration
        }

        return response()->json([
            'message' => 'Inscription réussie. Bienvenue dans Famille Respect, ' . $member->first_name . ' !',
            'member'  => [
                'id'         => $member->id,
                'first_name' => $member->first_name,
                'last_name'  => $member->last_name,
                'phone'      => $member->phone,
            ],
        ], 201);
    }
}
