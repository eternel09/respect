<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMemberRequest;
use App\Http\Requests\UpdateMemberRequest;
use App\Http\Resources\AttendanceResource;
use App\Http\Resources\MemberResource;
use App\Models\Member;
use App\Services\QrCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    /** Modification d'un membre (coordonnées + champs entreprise). */
    public function update(Member $member, UpdateMemberRequest $request): JsonResponse
    {
        $member->update($request->validated());

        return response()->json([
            'message' => 'Membre mis à jour.',
            'member'  => new MemberResource($member),
        ]);
    }

    /** Export CSV des membres (mêmes filtres que la liste), champs entreprise inclus. */
    public function export(Request $request): StreamedResponse
    {
        $query = Member::when($request->search, function ($q) use ($request) {
            $q->where(function ($q) use ($request) {
                $q->where('first_name', 'like', "%{$request->search}%")
                  ->orWhere('last_name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%");
            });
        })->orderBy('last_name')->orderBy('first_name');

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="membres.csv"',
        ];

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM UTF-8 pour Excel
            fputcsv($out, ['Nom', 'Prénom', 'Téléphone', 'Fonction', 'Service', 'Matricule', 'Inscrit le']);

            $query->chunk(200, function ($rows) use ($out) {
                foreach ($rows as $m) {
                    fputcsv($out, [
                        $m->last_name, $m->first_name, $m->phone,
                        $m->job_title, $m->department, $m->staff_id,
                        $m->created_at?->toDateString(),
                    ]);
                }
            });

            fclose($out);
        }, 'membres.csv', $headers);
    }

    public function show(Member $member): array
    {
        $attendances = $member->attendances()->with('event')->orderBy('attended_date', 'desc')->get();

        return [
            'member'      => new MemberResource($member->loadCount('attendances')),
            'attendances' => AttendanceResource::collection($attendances),
        ];
    }

    /**
     * QR personnel du membre (SVG base64) pour l'aperçu dans le back-office.
     */
    public function qr(Member $member, Request $request, QrCodeService $qr): JsonResponse
    {
        abort_if($member->organization_id !== $request->user()->organization_id, 404);

        return response()->json(['qr' => $qr->member($member->check_in_token)]);
    }
}
