<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #1f2937; font-size: 13px; }
        .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { color: #7c3aed; font-size: 22px; margin: 0 0 4px; }
        .header p { color: #6b7280; margin: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #7c3aed; color: white; padding: 8px 10px; text-align: left; font-size: 12px; }
        td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background: #f9fafb; }
        .footer { margin-top: 20px; text-align: center; color: #9ca3af; font-size: 11px; }
        .count { font-weight: bold; margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Famille Respect</h1>
        <p>{{ $title }}</p>
    </div>

    <p class="count">Total : {{ $attendances->count() }} présence(s)</p>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Nom complet</th>
                <th>Téléphone</th>
                <th>Événement</th>
                <th>Date</th>
                <th>Heure d'entrée</th>
            </tr>
        </thead>
        <tbody>
            @forelse($attendances as $i => $attendance)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $attendance->member->last_name }} {{ $attendance->member->first_name }}</td>
                <td>{{ $attendance->member->phone }}</td>
                <td>{{ $attendance->event->name }}</td>
                <td>{{ $attendance->attended_date->format('d/m/Y') }}</td>
                <td>{{ $attendance->created_at->format('H:i') }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="6" style="text-align:center; color:#9ca3af;">Aucune présence enregistrée.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Généré le {{ now()->format('d/m/Y à H:i') }} — Famille Respect
    </div>
</body>
</html>
