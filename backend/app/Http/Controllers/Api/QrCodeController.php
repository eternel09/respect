<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Services\QrCodeService;
use Illuminate\Http\JsonResponse;

class QrCodeController extends Controller
{
    public function index(QrCodeService $qr): JsonResponse
    {
        $events = Event::orderBy('date', 'desc')->get();

        $eventQrCodes = $events->map(fn($event) => [
            'event_id'   => $event->id,
            'event_name' => $event->name,
            'event_date' => $event->date->toDateString(),
            'qr_base64'  => $qr->presence($event->id),
        ]);

        return response()->json([
            'onboarding' => $qr->onboarding(),
            'events'     => $eventQrCodes,
        ]);
    }
}
