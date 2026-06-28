<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\Organization;
use Illuminate\Database\Seeder;

class EventSeeder extends Seeder
{
    public function run(): void
    {
        $orgId = Organization::query()->value('id');

        $events = [
            ['name' => 'Réunion du dimanche', 'type' => 'reunion', 'date' => now()->format('Y-m-d')],
            ['name' => 'Séance de prière', 'type' => 'priere', 'date' => now()->subDays(7)->format('Y-m-d')],
            ['name' => 'Réunion mensuelle', 'type' => 'reunion', 'date' => now()->subDays(14)->format('Y-m-d')],
        ];

        foreach ($events as $event) {
            Event::firstOrCreate(
                ['name' => $event['name'], 'date' => $event['date']],
                $event + ['organization_id' => $orgId],
            );
        }
    }
}
