<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 28px 34px; }
        body { font-family: DejaVu Sans, sans-serif; color: #1f2937; font-size: 12px; }
        .bar { height: 6px; background: #1e3a5f; margin-bottom: 18px; }
        h1 { font-size: 20px; margin: 0; color: #08060d; }
        .muted { color: #6b7280; }
        .ref { font-family: DejaVu Sans Mono, monospace; font-size: 16px; font-weight: bold; color: #1e3a5f; }
        table { width: 100%; border-collapse: collapse; }
        .box { border: 1px solid #e5e7eb; padding: 10px 12px; vertical-align: top; }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 4px; }
        .lines th { background: #f6f2ea; text-align: left; padding: 8px 10px; font-size: 11px; color: #6b7280; }
        .lines td { padding: 10px; border-bottom: 1px solid #f0ede8; }
        .sign { height: 70px; border: 1px dashed #cbd5e1; padding: 8px 10px; vertical-align: top; }
        .foot { margin-top: 24px; font-size: 10px; color: #9ca3af; text-align: center; }
    </style>
</head>
<body>
    <div class="bar"></div>

    <table>
        <tr>
            <td style="vertical-align: top;">
                <h1>Bon de livraison</h1>
                <div class="muted">Cartes de service</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
                <div class="label">Ticket</div>
                <div class="ref">{{ $request->reference }}</div>
                <div class="muted">Édité le {{ now()->format('d/m/Y') }}</div>
            </td>
        </tr>
    </table>

    <table style="margin-top: 18px;">
        <tr>
            <td class="box" style="width: 50%;">
                <div class="label">Client</div>
                <strong>{{ $request->organization?->name ?? $request->contact_company ?? $request->contact_name ?? '—' }}</strong><br>
                @if ($request->contact_name && ($request->organization || $request->contact_company)) {{ $request->contact_name }}<br> @endif
                @if ($request->contact_email) {{ $request->contact_email }}<br> @endif
                @if ($request->contact_phone) {{ $request->contact_phone }} @endif
            </td>
            <td class="box" style="width: 50%;">
                <div class="label">Adresse de livraison</div>
                {{ $request->delivery_address ?: 'À préciser' }}
            </td>
        </tr>
    </table>

    <table class="lines" style="margin-top: 18px;">
        <tr>
            <th>Désignation</th>
            <th style="text-align: right; width: 90px;">Quantité</th>
        </tr>
        <tr>
            <td>
                Cartes de service personnalisées — format CR80 (85,6 × 54 mm)
                @if ($request->note)<br><span class="muted">Consignes : {{ $request->note }}</span>@endif
            </td>
            <td style="text-align: right; font-weight: bold;">{{ $request->quantity }}</td>
        </tr>
    </table>

    <table style="margin-top: 28px;">
        <tr>
            <td class="sign" style="width: 50%;">
                <div class="label">Livré par</div>
                Nom, date et signature
            </td>
            <td style="width: 12px;"></td>
            <td class="sign" style="width: 50%;">
                <div class="label">Reçu par le client</div>
                Nom, date et signature
            </td>
        </tr>
    </table>

    <div class="foot">Document généré par Signiq — référence {{ $request->reference }}</div>
</body>
</html>
