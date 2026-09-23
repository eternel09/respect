<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #1f2937; font-size: 13px; }
        .ticket { border: 2px solid #7c3aed; border-radius: 10px; padding: 16px 18px;
            margin-bottom: 14px; page-break-inside: avoid; }
        .row { display: table; width: 100%; }
        .left { display: table-cell; vertical-align: top; }
        .right { display: table-cell; vertical-align: top; width: 130px; text-align: right; }
        .org { color: #7c3aed; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
        .event { font-size: 18px; font-weight: bold; margin: 2px 0 6px; }
        .meta { color: #6b7280; font-size: 12px; margin: 1px 0; }
        .cat { display: inline-block; background: #f3e8ff; color: #6d28d9; font-weight: bold;
            padding: 3px 10px; border-radius: 20px; font-size: 13px; margin-top: 8px; }
        .holder { margin-top: 8px; font-size: 14px; }
        .ref { color: #9ca3af; font-size: 11px; margin-top: 8px; }
        .qr { width: 120px; height: 120px; }
        .qrhint { color: #9ca3af; font-size: 10px; text-align: right; }
        .design { width: 100%; max-height: 260px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; display: block; }
    </style>
</head>
<body>
    @php
        $money = fn ($cents, $cur) => number_format($cents / 100, ($cents % 100 === 0 ? 0 : 2), ',', ' ') . ' ' . $cur;
        $design = $design ?? null;
    @endphp

    @foreach($tickets as $t)
    <div class="ticket">
        @if($design)<img class="design" src="{{ $design }}" alt="">@endif
        <div class="row">
            <div class="left">
                <div class="org">{{ $occasion->organization->name }}</div>
                <div class="event">{{ $occasion->name }}</div>
                <div class="meta">📅 {{ $occasion->date->locale('fr')->translatedFormat('l j F Y') }}</div>
                @if($occasion->location)<div class="meta">📍 {{ $occasion->location }}</div>@endif
                <div class="cat">{{ $t['type'] }}</div>
                @if($t['holder'])<div class="holder">👤 {{ $t['holder'] }}</div>@endif
                <div class="ref">Commande {{ $t['reference'] }}</div>
            </div>
            <div class="right">
                <img class="qr" src="{{ $t['qr'] }}" alt="QR">
                <div class="qrhint">À scanner à l'entrée</div>
            </div>
        </div>
    </div>
    @endforeach

    <div style="color:#9ca3af;font-size:10px;text-align:center;margin-top:6px;">
        {{ $tickets->count() }} billet(s) · Total {{ $money($order->total_cents, $order->currency) }} · Édité le {{ now()->locale('fr')->translatedFormat('j F Y') }}
    </div>
</body>
</html>
