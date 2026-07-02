<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 14px; }
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; margin: 0; color: #1f2937; }

        .card {
            position: relative;
            display: inline-block;
            width: 250px;
            height: 160px;
            margin: 6px;
            border: 1px solid #e3e6ea;
            border-radius: 14px;
            overflow: hidden;
            vertical-align: top;
            page-break-inside: avoid;
            background: #ffffff;
        }
        /* Liseré dégradé marque → accent */
        .bar { height: 5px; background: linear-gradient(90deg, #1e3a5f 0%, #2f4f78 55%, #c9742b 100%); }
        /* Filigrane */
        .wm {
            position: absolute;
            top: 40px; left: 6px;
            font-size: 46px; font-weight: bold;
            color: #eef2f7;
            letter-spacing: -2px;
            white-space: nowrap;
        }
        .inner { position: relative; padding: 9px 14px; }
        .org { font-size: 8px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; letter-spacing: 1px; }
        .qr { width: 94px; height: 94px; }
        .name { font-size: 14px; font-weight: bold; color: #08060d; }
        .phone { font-size: 9px; color: #9ca3af; margin-top: 2px; }
        .serial { font-family: DejaVu Sans Mono, monospace; font-size: 9px; color: #1e3a5f; margin-top: 8px; letter-spacing: 1px; line-height: 1.5; }
        .serial b { color: #c9742b; }
        .foot {
            position: absolute; bottom: 7px; left: 14px;
            font-size: 7px; color: #b8bec7; letter-spacing: 1px; text-transform: uppercase;
        }
    </style>
</head>
<body>
    @foreach ($members as $m)
        <div class="card">
            <div class="bar"></div>
            <div class="wm">SIGNIQ</div>
            <div class="inner">
                <div class="org">{{ $organization->name }} · Badge membre</div>
                <table style="width:100%; border-collapse:collapse; margin-top:6px;">
                    <tr>
                        <td style="width:100px; vertical-align:top;">
                            <img class="qr" src="data:image/svg+xml;base64,{{ $m['qr'] }}" alt="QR">
                        </td>
                        <td style="padding-left:10px; vertical-align:top;">
                            @if ($m['full_name'])
                                <div class="name">{{ $m['full_name'] }}</div>
                                <div class="phone">{{ $m['phone'] }}</div>
                            @else
                                <div class="phone" style="margin-top:6px;">Nom :</div>
                                <div style="border-bottom:1px solid #b8bec7; height:16px; margin:2px 0 10px;"></div>
                            @endif
                            <div class="serial">
                                N° <b>{{ str_pad($m['id'], 4, '0', STR_PAD_LEFT) }}</b><br>
                                ID {{ $m['serial'] }}
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="foot">Scanner à l'entrée · {{ $organization->name }}</div>
        </div>
    @endforeach
</body>
</html>
