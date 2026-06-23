<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::query()->value('id'),
            'name' => $this->faker->sentence(3),
            'type' => $this->faker->randomElement(['reunion', 'priere', 'autre']),
            'date' => $this->faker->dateTimeBetween('-30 days', '+30 days')->format('Y-m-d'),
            'description' => $this->faker->optional()->sentence(),
        ];
    }
}
