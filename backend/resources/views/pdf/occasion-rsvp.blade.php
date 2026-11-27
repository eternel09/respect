<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 28px 30px; }
        body { font-family: DejaVu Sans, sans-serif; color: #1f2937; font-size: 10.5px; }
        .header { text-align: center; border-bottom: 2px solid #9C7A3C; padding-bottom: 10px; margin-bottom: 14px; }
        .header h1 { color: #9C7A3C; font-size: 18px; margin: 0 0 3px; }
        .header .event { font-size: 14px; font-weight: bold; margin: 2px 0; }
        .header p { color: #6b7280; margin: 0; font-size: 11px; }
        .stats { width: 100%; border-collapse: separate; border-spacing: 6px 0; margin: 0 -6px 12px; }
        .stats td { background: #faf6ee; border: 1px solid #eadfc8; text-align: center; padding: 7px 4px; width: 20%; }
        .stats b { display: block; font-size: 17px; color: #5B5146; }
        .stats span { color: #8A7F72; font-size: 9.5px; text-transform: uppercase; letter-spacing: .5px; }
        .drinks { margin: 0 0 14px; }
        .drinks h2, .list h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .6px; color: #8A7F72; margin: 0 0 6px; }
        .drink { display: inline-block; border: 1px solid #eadfc8; border-radius: 10px; padding: 3px 9px; margin: 0 4px 5px 0; background: #fff; }
        .drink b { color: #8A6B31; }
        table.list-t { width: 100%; border-collapse: collapse; }
        .list-t th { background: #5B5146; color: #fff; padding: 5px 7px; text-align: left; font-size: 9.5px; }
        .list-t td { padding: 5px 7px; border-bottom: 1px solid #ece7dd; vertical-align: top; }
        .list-t tr:nth-child(even) td { background: #fbf9f5; }
        .num { width: 22px; color: #9ca3af; }
        .confirmed { color: #059669; font-weight: bold; }
        .declined { color: #dc2626; font-weight: bold; }
        .pending { color: #9ca3af; }
        .msg { color: #6b7280; font-style: italic; }
        .muted { color: #c0bab0; }
        .footer { margin-top: 14px; text-align: center; color: #9ca3af; font-size: 9px; }
        .empty { color: #9ca3af; font-style: italic; padding: 20px; text-align: center; }
    </style>
</head>
<body>
    @php($place = $occasion->fullLocation())
    <div class="header">
        <h1>{{ $occasion->organization->name }}</h1>
        <p class="event">{{ $occasion->name }}</p>
        <p>{{ $occasion->date->locale('fr')->translatedFormat('l j F Y') }}@if($place) · {{ $place }}@endif</p>
        <p>Rapport des réponses des invités</p>
    </div>

    <table class="stats">
        <tr>
            <td><b>{{ $summary['total'] }}</b><span>Invitations</span></td>
            <td><b>{{ $summary['confirmed'] }}</b><span>Confirmées</span></td>
            <td><b>{{ $summary['people'] }}</b><span>Personnes attendues</span></td>
            <td><b>{{ $summary['declined'] }}</b><span>Déclinées</span></td>
            <td><b>{{ $summary['pending'] }}</b><span>Sans réponse</span></td>
        </tr>
    </table>

    @if(count($drinks))
        <div class="drinks">
            <h2>Boissons choisies (invitations confirmées)</h2>
            @foreach($drinks as $drink => $n)
                <span class="drink">{{ $drink }} <b>{{ $n }}</b></span>
            @endforeach
        </div>
    @endif

    <div class="list">
        <h2>Invités</h2>
        @if($rows->isEmpty())
            <p class="empty">Aucun invité pour cet événement.</p>
        @else
            <table class="list-t">
                <thead>
                    <tr>
                        <th class="num">#</th>
                        <th>Nom</th>
                        <th>Téléphone</th>
                        <th>Table</th>
                        <th>Réponse</th>
                        <th>Pers.</th>
                        <th>Boissons</th>
                        <th>Mot pour les hôtes</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($rows as $i => $r)
                    <tr>
                        <td class="num">{{ $i + 1 }}</td>
                        <td>{{ $r['name'] }}</td>
                        <td>{{ $r['phone'] ?: '—' }}</td>
                        <td>{!! $r['table'] ? e($r['table']) : '<span class="muted">—</span>' !!}</td>
                        <td class="{{ $r['status'] }}">{{ $r['label'] }}@if($r['answered_at'])<br><span class="muted" style="font-weight:normal">{{ $r['answered_at']->format('d/m H:i') }}</span>@endif</td>
                        <td>{{ $r['people'] ?? '' }}</td>
                        <td>{!! $r['drinks'] ? e(implode(', ', $r['drinks'])) : '<span class="muted">—</span>' !!}</td>
                        <td class="msg">{{ $r['message'] }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </div>

    <div class="footer">Édité le {{ now()->locale('fr')->translatedFormat('j F Y à H\hi') }} · {{ $occasion->organization->name }}</div>
</body>
</html>
