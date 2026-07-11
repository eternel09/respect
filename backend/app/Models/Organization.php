<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug', 'logo_path', 'theme_color', 'plan', 'modules'];

    protected $casts = [
        'modules' => 'array',
    ];

    /** Modules (applications) activés, avec repli sur les défauts du catalogue. */
    public function enabledModules(): array
    {
        $modules = $this->modules;

        if (empty($modules)) {
            return config('modules.defaults', []);
        }

        // On ne garde que les clés encore présentes au catalogue.
        return array_values(array_intersect($modules, array_keys(config('modules.catalog', []))));
    }

    public function hasModule(string $key): bool
    {
        return in_array($key, $this->enabledModules(), true);
    }

    /**
     * Organisation par défaut (tenant n°1) — utilisée par les flux publics
     * tant que la résolution multi-tenant complète n'est pas en place.
     */
    public static function defaultId(): int
    {
        return static::query()->oldest('id')->value('id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(Member::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
