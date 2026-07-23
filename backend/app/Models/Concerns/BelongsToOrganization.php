<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * Scope global multi-tenant : restreint automatiquement les lectures aux
 * organisations visibles par l'utilisateur connecté — la sienne, plus ses
 * sous-organisations lorsqu'il appartient à une organisation « mère ».
 *
 * Le super-admin (sans organisation) et les contextes sans utilisateur
 * (console, endpoints publics) ne sont pas restreints. La colonne
 * organization_id reste posée explicitement à l'écriture : lire large ne
 * signifie jamais écrire large.
 */
trait BelongsToOrganization
{
    protected static function bootBelongsToOrganization(): void
    {
        static::addGlobalScope('organization', function (Builder $builder) {
            $user = auth()->user();

            if (! $user || ! $user->organization_id) {
                return;
            }

            $builder->whereIn(
                $builder->getModel()->getTable() . '.organization_id',
                $user->visibleOrganizationIds(),
            );
        });
    }
}
