<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Member;
use App\Models\Organization;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Statistiques consolidées d'un réseau (organisation mère + sous-organisations).
 *
 * Toutes les lectures passent par les modèles scopés : les chiffres couvrent
 * donc automatiquement le sous-arbre visible par l'utilisateur connecté.
 * Les regroupements se font en PHP pour rester portables SQLite/PostgreSQL,
 * comme le reste du tableau de bord.
 */
class NetworkStatsService
{
    public function __construct(private Organization $parent) {}

    /** Sous-organisations, dans un ordre stable. */
    public function children(): Collection
    {
        return $this->parent->children()->orderBy('name')->get();
    }

    /** Cartes de tête : totaux du réseau + variation sur 30 jours. */
    public function headline(): array
    {
        $members = Member::count();
        $now     = now();

        $newThisMonth = Member::where('created_at', '>=', $now->copy()->startOfMonth())->count();
        $newPrevMonth = Member::whereBetween('created_at', [
            $now->copy()->subMonthNoOverflow()->startOfMonth(),
            $now->copy()->subMonthNoOverflow()->endOfMonth(),
        ])->count();

        $events30 = Event::whereBetween('date', [
            $now->copy()->subDays(30)->toDateString(),
            $now->toDateString(),
        ])->count();
        $att30 = Attendance::where('attended_date', '>=', $now->copy()->subDays(30))->count();

        return [
            'organizations'    => $this->children()->count(),
            'total_members'    => $members,
            'new_this_month'   => $newThisMonth,
            'new_prev_month'   => $newPrevMonth,
            'growth_pct'       => $this->variation($newThisMonth, $newPrevMonth),
            'attendances_30d'  => $att30,
            'participation'    => ($events30 > 0 && $members > 0)
                ? round($att30 / ($events30 * $members) * 100, 1)
                : null,
        ];
    }

    /**
     * Évolution des membres : nouveaux inscrits par période + effectif cumulé.
     * $unit = 'week' (12 dernières semaines) ou 'month' (12 derniers mois).
     */
    public function growth(string $unit = 'month'): array
    {
        $unit    = in_array($unit, ['week', 'month'], true) ? $unit : 'month';
        $buckets = 12;

        $start = $unit === 'week'
            ? now()->startOfWeek()->subWeeks($buckets - 1)
            : now()->startOfMonth()->subMonths($buckets - 1);

        // Effectif déjà présent avant la fenêtre → base du cumul.
        $cumulative = Member::where('created_at', '<', $start)->count();

        $dates = Member::where('created_at', '>=', $start)->pluck('created_at');

        return collect(range($buckets - 1, 0))->map(function ($i) use ($unit, $dates, &$cumulative) {
            $point = $unit === 'week'
                ? now()->startOfWeek()->subWeeks($i)
                : now()->startOfMonth()->subMonths($i);

            $count = $dates->filter(fn (Carbon $d) => $unit === 'week'
                ? $d->isSameWeek($point)
                : $d->isSameMonth($point)
            )->count();

            $cumulative += $count;

            return [
                'label'      => $unit === 'week'
                    ? 'S' . $point->isoWeek()
                    : ucfirst($point->locale('fr')->isoFormat('MMM')),
                'new'        => $count,
                'cumulative' => $cumulative,
            ];
        })->values()->all();
    }

    /** Comparatif par sous-organisation (le cœur de la vue réseau). */
    public function byOrganization(): array
    {
        $startMonth = now()->startOfMonth();
        $since30    = now()->subDays(30);

        // Une requête par métrique, groupée en PHP puis répartie par organisation.
        $members = Member::get(['id', 'organization_id', 'created_at']);
        $att30   = Attendance::where('attended_date', '>=', $since30)->pluck('organization_id');

        // La mère elle-même compte comme une entrée si elle porte des membres.
        $orgs = $this->children();
        if ($members->where('organization_id', $this->parent->id)->isNotEmpty()) {
            $orgs = collect([$this->parent])->concat($orgs);
        }

        return $orgs->map(function (Organization $org) use ($members, $att30, $startMonth) {
            $own = $members->where('organization_id', $org->id);

            return [
                'id'             => $org->id,
                'name'           => $org->name,
                'is_parent'      => $org->id === $this->parent->id,
                'members'        => $own->count(),
                'new_this_month' => $own->filter(fn ($m) => $m->created_at >= $startMonth)->count(),
                'attendances_30d' => $att30->filter(fn ($id) => $id === $org->id)->count(),
            ];
        })->values()->all();
    }

    /**
     * Nouveaux membres par événement : on privilégie l'événement
     * d'enregistrement, et à défaut (historique) l'événement du premier
     * pointage du membre.
     */
    public function byEvent(int $limit = 8): array
    {
        $events = Event::orderByDesc('date')->limit($limit)->get(['id', 'name', 'date']);
        if ($events->isEmpty()) {
            return [];
        }

        $eventIds = $events->pluck('id');

        // 1) Attribution explicite
        $direct = Member::whereIn('registered_at_event_id', $eventIds)
            ->pluck('registered_at_event_id');

        // 2) Repli : premier pointage des membres sans attribution
        $legacyIds = Member::whereNull('registered_at_event_id')->pluck('id');
        $firstSeen = Attendance::whereIn('member_id', $legacyIds)
            ->orderBy('created_at')
            ->get(['member_id', 'event_id'])
            ->unique('member_id')          // le premier pointage de chaque membre
            ->pluck('event_id');

        return $events->map(fn (Event $e) => [
            'id'      => $e->id,
            'name'    => $e->name,
            'date'    => $e->date->toDateString(),
            'new'     => $direct->filter(fn ($id) => $id === $e->id)->count()
                       + $firstSeen->filter(fn ($id) => $id === $e->id)->count(),
        ])->sortBy('date')->values()->all();
    }

    /** Variation en % entre deux périodes (null si pas de base de comparaison). */
    private function variation(int $current, int $previous): ?float
    {
        if ($previous === 0) {
            return $current > 0 ? 100.0 : null;
        }

        return round(($current - $previous) / $previous * 100, 1);
    }
}
