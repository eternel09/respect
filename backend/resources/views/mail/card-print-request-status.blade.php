<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0; background:#f6f2ea; font-family: Arial, Helvetica, sans-serif; color:#1f2937;">
    <div style="max-width:520px; margin:0 auto; padding:24px;">
        <div style="background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #eceae6;">
            <div style="height:6px; background:linear-gradient(90deg,#1e3a5f,#2f4f78,#c9742b);"></div>
            <div style="padding:28px;">
                <p style="font-size:12px; font-weight:bold; color:#1e3a5f; text-transform:uppercase; letter-spacing:1px; margin:0 0 8px;">
                    Ticket {{ $request->reference }}
                </p>
                <h1 style="font-size:20px; margin:0 0 8px; color:#08060d;">{{ $headline }}</h1>
                <p style="font-size:14px; line-height:1.6; color:#4b5563; margin:0 0 20px;">
                    Bonjour {{ $request->contact_name ?? '' }},
                    @if ($request->status === 'in_progress')
                        notre équipe a pris en charge votre demande de <strong>{{ $request->quantity }} carte(s)</strong>.
                    @elseif ($request->status === 'done')
                        votre commande de <strong>{{ $request->quantity }} carte(s)</strong> est terminée.
                        @if ($request->delivery_address) Elle sera livrée à : {{ $request->delivery_address }}. @endif
                    @elseif ($request->status === 'cancelled')
                        votre demande de <strong>{{ $request->quantity }} carte(s)</strong> a été annulée. N'hésitez pas à nous recontacter.
                    @endif
                </p>

                <div style="text-align:center; margin:24px 0 8px;">
                    <a href="{{ $trackUrl }}" style="display:inline-block; background:#1e3a5f; color:#ffffff; text-decoration:none; font-weight:bold; font-size:14px; padding:12px 24px; border-radius:12px;">
                        Voir le suivi
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
