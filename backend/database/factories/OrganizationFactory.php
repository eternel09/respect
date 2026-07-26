<?php

namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Organization>
 */
class OrganizationFactory extends Factory
{
    protected $model = Organization::class;

    public function definition(): array
    {
        $name = $this->faker->unique()->company();

        return [
            'name'        => $name,
            'slug'        => Str::slug($name) . '-' . $this->faker->unique()->numberBetween(1000, 9999),
            'theme_color' => '#1e3a5f',
            'plan'        => 'free',
            'modules'     => ['presence'],
        ];
    }

    /** Sous-organisation rattachée à une organisation mère. */
    public function childOf(Organization $parent): static
    {
        return $this->state(fn () => ['parent_id' => $parent->id]);
    }
}
