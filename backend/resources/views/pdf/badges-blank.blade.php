<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 14px; }
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; margin: 0; color: #1f2937; }

        /* Grille compacte : 4 badges par ligne, optimisée pour l'impression */
        .card {
            display: inline-block;
            width: 168px;
            height: 188px;
            margin: 5px;
            border: 1px dashed #c9ced6; /* pointillés = guide de découpe */
            border-radius: 12px;
            overflow: hidden;
            vertical-align: top;
            text-align: center;
            page-break-inside: avoid;
            background: #ffffff;
        }
        .bar { height: 4px; background: linear-gradient(90deg, #1e3a5f 0%, #2f4f78 55%, #c9742b 100%); }
        .org {
            font-size: 7px;
            font-weight: bold;
            color: #1e3a5f;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 6px;
        }
        .qr { width: 142px; height: 142px; margin-top: 4px; }
        .foot { font-size: 6px; color: #b8bec7; letter-spacing: 1px; text-transform: uppercase; margin-top: 3px; }
    </style>
</head>
<body>
    @foreach ($badges as $b)
        <div class="card">
            <div class="bar"></div>
            <div class="org">{{ $organization->name }}</div>
            <img class="qr" src="data:image/svg+xml;base64,{{ $b['qr'] }}" alt="QR">
            <div class="foot">Scanner à l'entrée</div>
        </div>
    @endforeach
</body>
</html>
