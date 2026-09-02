<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    public const ROLES = ['super_admin', 'admin', 'secretaire', 'scanner'];

    protected $fillable = [
        'organization_id',
        'occasion_id',
        'name',
        'email',
        'password',
        'role',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    /** Occasion à laquelle l'agent est confiné (null = utilisateur d'organisation). */
    public function occasion()
    {
        return $this->belongsTo(Occasion::class);
    }

    /** Agent rattaché à un seul événement (accueil / gestion invités). */
    public function isEventScoped(): bool
    {
        return $this->occasion_id !== null;
    }

    /**
     * Organisations que cet utilisateur peut LIRE.
     *
     * - organisation autonome         → elle seule (comportement historique)
     * - organisation « mère »         → elle + ses sous-organisations
     * - super-admin (sans org)        → [] (aucune restriction appliquée)
     *
     * L'écriture, elle, reste toujours sur `organization_id` : un membre du
     * réseau ne crée jamais de donnée « dans » une fille par inadvertance.
     * Mémoïsé : le scope global est évalué à chaque requête.
     */
    public function visibleOrganizationIds(): array
    {
        if (! $this->organization_id) {
            return [];
        }

        return $this->visibleOrgIds ??= $this->organization
            ? $this->organization->subtreeIds()
            : [$this->organization_id];
    }

    /** Cache par instance (non persisté). */
    protected ?array $visibleOrgIds = null;

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
