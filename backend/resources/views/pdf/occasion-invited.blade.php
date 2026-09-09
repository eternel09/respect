<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #1f2937; font-size: 12px; }
        .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 12px; margin-bottom: 16px; }
        .header h1 { color: #7c3aed; font-size: 20px; margin: 0 0 4px; }
        .header .event { font-size: 15px; font-weight: bold; margin: 2px 0; }
        .header p { color: #6b7280; margin: 0; font-size: 12px; }
        .count { font-weight: bold; margin: 6px 0 12px; }
        .table-block { margin-bottom: 14px; page-break-inside: avoid; }
        .table-title { background: #f3e8ff; color: #6d28d9; font-weight: bold; padding: 6px 10px;
            border-left: 4px solid #7c3aed; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #7c3aed; color: white; padding: 6px 10px; text-align: left; font-size: 11px; }
        td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background: #f9fafb; }
        .num { width: 30px; color: #9ca3af; }
        .conf-yes { color: #059669; font-weight: bold; }
        .conf-no { color: #dc2626; font-weight: bold; }
        .conf-none { color: #9ca3af; }
        .footer { margin-top: 18px; text-align: center; color: #9ca3af; font-size: 10px; }
        .empty { color: #9ca3af; font-style: italic; padding: 20px; text-align: center; }
    </style>
</head>
<body>
    @php
        $tableLabel = fn ($label) => is_numeric($label) ? "Table {$label}" : $label;
        $confCell = function ($g) {
            if ($g->confirmed_at) return '<span class="conf-yes">Confirmé</span>';
            if ($g->declined)     return '<span class="conf-no">Décliné</span>';
            return '<span class="conf-none">—</span>';
        };
        $i = 0;
    @endphp

    <div class="header">
        <h1>{{ $occasion->organization->name }}</h1>
        <p class="event">{{ $occasion->name }}</p>
        <p>{{ $occasion->date->locale('fr')->translatedFormat('l j F Y') }}@if($occasion->location) · {{ $occasion->location }}@endif</p>
        <p>Invités ayant reçu leur invitation</p>
    </div>

    <p class="count">Total : {{ $total }} invité(s) contacté(s)</p>

    @if($total === 0)
        <p class="empty">Aucune invitation n'a encore été envoyée pour cet événement.</p>
    @endif

    @foreach($tabled as $label => $list)
        <div class="table-block">
            <div class="table-title">{{ $tableLabel($label) }} — {{ $list->count() }} invité(s)</div>
            <table>
                <thead>
                    <tr>
                        <th class="num">#</th>
                        <th>Nom</th>
                        <th>Téléphone</th>
                        <th>Confirmation</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($list as $g)
                    <tr>
                        <td class="num">{{ ++$i }}</td>
                        <td>{{ $g->name }}</td>
                        <td>{{ $g->phone ?: '—' }}</td>
                        <td>{!! $confCell($g) !!}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endforeach

    @if($noTable->isNotEmpty())
        <div class="table-block">
            <div class="table-title">Sans table — {{ $noTable->count() }} invité(s)</div>
            <table>
                <thead>
                    <tr>
                        <th class="num">#</th>
                        <th>Nom</th>
                        <th>Téléphone</th>
                        <th>Confirmation</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($noTable as $g)
                    <tr>
                        <td class="num">{{ ++$i }}</td>
                        <td>{{ $g->name }}</td>
                        <td>{{ $g->phone ?: '—' }}</td>
                        <td>{!! $confCell($g) !!}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endif

    <div class="footer">Édité le {{ now()->locale('fr')->translatedFormat('j F Y à H\hi') }} · {{ $occasion->organization->name }}</div>
</body>
</html>
