<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0; background:#f6f2ea; font-family: Arial, Helvetica, sans-serif; color:#1f2937;">
    <div style="max-width:520px; margin:0 auto; padding:24px;">
        <div style="background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #eceae6;">
            <div style="height:6px; background:linear-gradient(90deg,#1e3a5f,#2f4f78,#c9742b);"></div>
            <div style="padding:28px;">
                <p style="font-size:12px; font-weight:bold; color:#1e3a5f; text-transform:uppercase; letter-spacing:1px; margin:0 0 8px;">
                    {{ $organization->name }}
                </p>
                <h1 style="font-size:20px; margin:0 0 8px; color:#08060d;">Bienvenue, {{ $admin->name }} 👋</h1>
                <p style="font-size:14px; line-height:1.6; color:#4b5563; margin:0 0 20px;">
                    Votre espace d'administration pour <strong>{{ $organization->name }}</strong> a été créé.
                    Voici vos identifiants de connexion :
                </p>

                <table style="width:100%; border-collapse:collapse; background:#f6f2ea; border-radius:12px;">
                    <tr><td style="padding:12px 16px; font-size:13px; color:#6b7280;">Email</td>
                        <td style="padding:12px 16px; font-size:13px; font-weight:bold; text-align:right;">{{ $admin->email }}</td></tr>
                    <tr><td style="padding:12px 16px; font-size:13px; color:#6b7280;">Mot de passe temporaire</td>
                        <td style="padding:12px 16px; font-size:13px; font-weight:bold; text-align:right; font-family:monospace;">{{ $tempPassword }}</td></tr>
                </table>

                <div style="text-align:center; margin:24px 0 8px;">
                    <a href="{{ $loginUrl }}" style="display:inline-block; background:#1e3a5f; color:#ffffff; text-decoration:none; font-weight:bold; font-size:14px; padding:12px 24px; border-radius:12px;">
                        Se connecter
                    </a>
                </div>

                <p style="font-size:12px; color:#9ca3af; margin:16px 0 0; text-align:center;">
                    Pour votre sécurité, changez ce mot de passe après votre première connexion.
                </p>
            </div>
        </div>
        <p style="font-size:11px; color:#b8bec7; text-align:center; margin:16px 0 0;">
            © {{ date('Y') }} Signiq · Family Management Systems
        </p>
    </div>
</body>
</html>
