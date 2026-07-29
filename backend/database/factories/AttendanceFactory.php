<?php

namespace Database\Factories;

use App\Models\Attendance;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Attendance>
 */
class AttendanceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'member_id'     => \App\Models\Member::factory(),
            'event_id'      => \App\Models\Event::factory(),
            // La présence appartient à l'organisation de son membre (comme le fait
            // AttendanceController::store). Dérivé du member_id résolu pour rester
            // cohérent même quand le test fournit son propre membre.
            'organization_id' => fn (array $attributes) => \App\Models\Member::find($attributes['member_id'])?->organization_id,
            'attended_date' => $this->faker->dateTimeBetween('-30 days', 'now')->format('Y-m-d'),
        ];
    }
}
