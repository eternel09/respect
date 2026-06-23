<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Member;
use Illuminate\Database\Seeder;

class MemberSeeder extends Seeder
{
    public function run(): void
    {
        $members = Member::factory(20)->create();
        $events  = Event::all();

        foreach ($members as $member) {
            foreach ($events->random(rand(1, $events->count())) as $event) {
                Attendance::firstOrCreate(
                    [
                        'member_id'     => $member->id,
                        'event_id'      => $event->id,
                        'attended_date' => $event->date,
                    ],
                    ['organization_id' => $member->organization_id],
                );
            }
        }
    }
}
