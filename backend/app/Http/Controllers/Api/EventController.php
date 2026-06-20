<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EventController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $events = Event::withCount('attendances')
            ->orderBy('date', 'desc')
            ->paginate(25);

        return EventResource::collection($events);
    }

    public function store(StoreEventRequest $request): JsonResponse
    {
        $event = Event::create([
            ...$request->validated(),
            'organization_id' => $request->user()->organization_id,
        ]);

        return response()->json(new EventResource($event), 201);
    }

    public function show(Event $event): EventResource
    {
        return new EventResource($event->loadCount('attendances'));
    }

    public function destroy(Event $event): JsonResponse
    {
        $event->delete();
        return response()->json(['message' => 'Événement supprimé.']);
    }

    public function public(): AnonymousResourceCollection
    {
        $events = Event::orderBy('date', 'desc')->get();
        return EventResource::collection($events);
    }
}
