<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug', 'logo_path', 'theme_color', 'plan'];

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
