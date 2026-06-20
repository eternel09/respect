<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 14px; }
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; margin: 0; color: #1f2937; }

        .card {
            display: inline-block;
            width: 240px;
            height: 150px;
            margin: 6px;
            padding: 10px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            vertical-align: top;
            page-break-inside: avoid;
        }
        .card table { width: 100%; border-collapse: collapse; }
        .org {
            font-size: 9px;
            font-weight: bold;
            color: #1e3a5f;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #e08a3c;
            padding-bottom: 4px;
        }
        .qr { width: 96px; height: 96px; }
        .name { font-size: 13px; font-weight: bold; color: #08060d; }
        .meta { font-size: 9px; color: #9ca3af; }
        .footer { font-size: 8px; color: #9ca3af; }
    </style>
</head>
<body>
    @foreach ($members as $m)
        <div class="card">
            <div class="org">{{ $organization->name }}</div>
            <table>
                <tr>
                    <td style="width:100px; text-align:center;">
                        <img class="qr" src="data:image/svg+xml;base64,{{ $m['qr'] }}" alt="QR">
                    </td>
                    <td style="padding-left:8px; vertical-align: middle;">
                        <div class="name">{{ $m['full_name'] }}</div>
                        <div class="meta">Membre #{{ $m['id'] }}</div>
                        @if (!empty($m['phone']))
                            <div class="meta">{{ $m['phone'] }}</div>
                        @endif
                        <div class="footer" style="margin-top:10px;">Badge de présence · scanner à l'entrée</div>
                    </td>
                </tr>
            </table>
        </div>
    @endforeach
</body>
</html>
