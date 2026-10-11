<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0; background:#f6f2ea; font-family: Arial, Helvetica, sans-serif; color:#1f2937;">
    <div style="max-width:520px; margin:0 auto; padding:24px;">
        <div style="background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #eceae6;">
            <div style="height:6px; background:linear-gradient(90deg,#1e3a5f,#2f4f78,#c9742b);"></div>
            <div style="padding:28px;">
                <p style="font-size:12px; font-weight:bold; color:#c9742b; text-transform:uppercase; letter-spacing:1px; margin:0 0 8px;">
                    Nouvelle demande de cartes
                </p>
                <h1 style="font-size:20px; margin:0 0 8px; color:#08060d;">
                    {{ $request->quantity }} carte(s) demandée(s)
                </h1>
                <p style="font-size:14px; line-height:1.6; color:#4b5563; margin:0 0 20px;">
                    Une demande vient d'arriver via
                    <strong>{{ $request->source === 'public' ? 'le portail public' : ($request->source === 'email' ? 'e-mail' : 'un espace client') }}</strong>.
                </p>

                <table style="width:100%; border-collapse:collapse; background:#f6f2ea; border-radius:12px;">
                    @if ($request->organization)
                        <tr><td style="padding:10px 16px; font-size:13px; color:#6b7280;">Organisation</td>
                            <td style="padding:10px 16px; font-size:13px; font-weight:bold; text-align:right;">{{ $request->organization->name }}</td></tr>
                    @endif
                    @if ($request->contact_name)
                        <tr><td style="padding:10px 16px; font-size:13px; color:#6b7280;">Contact</td>
                            <td style="padding:10px 16px; font-size:13px; font-weight:bold; text-align:right;">{{ $request->contact_name }}{{ $request->contact_company ? ' · ' . $request->contact_company : '' }}</td></tr>
                    @endif
                    @if ($request->contact_email)
                        <tr><td style="padding:10px 16px; font-size:13px; color:#6b7280;">Email</td>
                            <td style="padding:10px 16px; font-size:13px; font-weight:bold; text-align:right;">{{ $request->contact_email }}</td></tr>
                    @endif
                    @if ($request->contact_phone)
                        <tr><td style="padding:10px 16px; font-size:13px; color:#6b7280;">Téléphone</td>
                            <td style="padding:10px 16px; font-size:13px; font-weight:bold; text-align:right;">{{ $request->contact_phone }}</td></tr>
                    @endif
                    @if ($request->delivery_address)
                        <tr><td style="padding:10px 16px; font-size:13px; color:#6b7280;">Livraison</td>
                            <td style="padding:10px 16px; font-size:13px; text-align:right;">{{ $request->delivery_address }}</td></tr>
                    @endif
                </table>

                @if ($request->note)
                    <p style="font-size:13px; line-height:1.6; color:#4b5563; margin:16px 0 0; font-style:italic;">« {{ $request->note }} »</p>
                @endif

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
