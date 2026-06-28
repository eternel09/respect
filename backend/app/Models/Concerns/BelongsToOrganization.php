<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * Scope global multi-tenant : restreint automatiquement les lectures à
 * l'organisation de l'utilisateur connecté. Le super-admin (sans organisation)
 * et les contextes sans utilisateur (console, endpoints publics) ne sont pas
 * restreints. La colonne organization_id reste posée explicitement à l'écriture.
 */
trait BelongsToOrganization
{
    protected static function bootBelongsToOrganization(): void
    {
        static::addGlobalScope('organization', function (Builder $builder) {
            $user = auth()->user();

            if ($user && $user->organization_id) {
                $builder->where(
                    $builder->getModel()->getTable() . '.organization_id',
                    $user->organization_id,
                );
            }
        });
    }
}
