<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0; background:#f6f2ea; font-family: Arial, Helvetica, sans-serif; color:#1f2937;">
    <div style="max-width:560px; margin:0 auto; padding:24px;">
        <div style="background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #eceae6;">
            <div style="height:6px; background:linear-gradient(90deg,#1e3a5f,#2f4f78,#c9742b);"></div>
            <div style="padding:28px;">
                <p style="font-size:12px; font-weight:bold; color:#c9742b; text-transform:uppercase; letter-spacing:1px; margin:0 0 8px;">
                    Relance quotidienne
                </p>
                <h1 style="font-size:20px; margin:0 0 8px; color:#08060d;">{{ $requests->count() }} demande(s) sans avancement</h1>
                <p style="font-size:14px; line-height:1.6; color:#4b5563; margin:0 0 20px;">
                    Ces demandes n'ont pas bougé depuis plus de {{ $staleHours }} h.
                </p>

                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <tr style="background:#f6f2ea;">
                        <th style="padding:8px 10px; text-align:left; color:#6b7280;">Ticket</th>
                        <th style="padding:8px 10px; text-align:left; color:#6b7280;">Demandeur</th>
                        <th style="padding:8px 10px; text-align:right; color:#6b7280;">Cartes</th>
                        <th style="padding:8px 10px; text-align:left; color:#6b7280;">Statut</th>
                    </tr>
                    @foreach ($requests as $r)
                        <tr style="border-bottom:1px solid #f0ede8;">
                            <td style="padding:8px 10px; font-family:monospace;">{{ $r->reference }}</td>
                            <td style="padding:8px 10px;">{{ $r->organization?->name ?? $r->contact_company ?? $r->contact_name ?? 'Prospect' }}</td>
                            <td style="padding:8px 10px; text-align:right;">{{ $r->quantity }}</td>
                            <td style="padding:8px 10px;">{{ $r->status === 'in_progress' ? 'En cours' : 'En attente' }}</td>
                        </tr>
                    @endforeach
                </table>

                <div style="text-align:center; margin:24px 0 8px;">
                    <a href="{{ $queueUrl }}" style="display:inline-block; background:#1e3a5f; color:#ffffff; text-decoration:none; font-weight:bold; font-size:14px; padding:12px 24px; border-radius:12px;">
                        Ouvrir la file des demandes
                    </a>
                </div>
            </div>
        </div>
        <p style="font-size:11px; color:#b8bec7; text-align:center; margin:16px 0 0;">
            © {{ date('Y') }} Signiq · Family Management Systems
        </p>
    </div>
</body>
</html>
