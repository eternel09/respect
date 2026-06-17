# ARCHITECTURE — Famille Respect

## Stack technologique

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Backend | Laravel 11 | Écosystème riche, Sanctum natif, Eloquent mature |
| Auth | Laravel Sanctum | Tokens API légers, parfait pour SPA React |
| BDD | PostgreSQL 15 | Robustesse, support JSON, requis par l'infrastructure |
| SMS | Twilio SDK | API fiable, SDK PHP officiel |
| PDF | barryvdh/laravel-dompdf | Intégration Laravel native, HTML→PDF |
| QR Code | simplesoftwareio/simple-qrcode | Package Laravel dédié, SVG/PNG |
| Frontend | React 18 + Vite | Performance, HMR rapide, écosystème moderne |
| CSS | Tailwind CSS | Mobile-first, utilitaire, pas de CSS custom |
| Routing | React Router v6 | Standard de facto React |
| HTTP | Axios | Intercepteurs, gestion tokens, standard |

---

## Schéma de base de données PostgreSQL

### Table : `users` (admins uniquement)
```sql
id              BIGSERIAL PRIMARY KEY
name            VARCHAR(255) NOT NULL
email           VARCHAR(255) UNIQUE NOT NULL
password        VARCHAR(255) NOT NULL
remember_token  VARCHAR(100)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Table : `members` (membres de l'organisation)
```sql
id              BIGSERIAL PRIMARY KEY
first_name      VARCHAR(100) NOT NULL
last_name       VARCHAR(100) NOT NULL
phone           VARCHAR(20) UNIQUE NOT NULL   -- identifiant unique
sms_sent_at     TIMESTAMP NULL               -- date d'envoi du SMS de bienvenue
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**Index** : `UNIQUE INDEX idx_members_phone ON members(phone)`

### Table : `attendances` (présences)
```sql
id              BIGSERIAL PRIMARY KEY
member_id       BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE
attended_date   DATE NOT NULL                -- date du pointage (sans heure)
created_at      TIMESTAMP                    -- horodatage exact
updated_at      TIMESTAMP

UNIQUE(member_id, attended_date)            -- anti-doublon
```

**Index** : `INDEX idx_attendances_date ON attendances(attended_date)`

### Table : `personal_access_tokens` (Sanctum)
Gérée automatiquement par Laravel Sanctum.

### Relations Eloquent
```
User (Admin)   → aucune relation directe avec membres/présences
Member         → hasMany(Attendance)
Attendance     → belongsTo(Member)
```

### Diagramme ERD (simplifié)
```
users
  id PK
  email UNIQUE

members
  id PK
  phone UNIQUE (identifiant)
  first_name
  last_name
  sms_sent_at

attendances
  id PK
  member_id FK → members.id
  attended_date DATE
  UNIQUE(member_id, attended_date)
```

---

## Architecture API REST Laravel

### Organisation des routes (routes/api.php)
```
/api
├── POST   /onboarding          # Inscription nouveau membre (public)
├── POST   /attendance          # Pointage présence (public)
├── POST   /admin/login         # Connexion admin
└── /admin/* (Sanctum guard)
    ├── POST   /admin/logout
    ├── GET    /admin/me
    ├── GET    /admin/dashboard
    ├── GET    /admin/members
    ├── GET    /admin/members/{id}
    ├── GET    /admin/attendances
    ├── GET    /admin/attendances/today
    ├── GET    /admin/reports/pdf
    └── GET    /admin/qrcodes
```

### Middleware
- `auth:sanctum` — protège toutes les routes `/admin/*` sauf `/admin/login`
- `throttle:60,1` — rate limiting global
- `cors` — autorise les requêtes depuis le frontend React

---

## Flux d'authentification Laravel Sanctum

```
1. Admin → POST /api/admin/login {email, password}
2. Laravel vérifie credentials (Auth::attempt)
3. Succès → génère token Sanctum → retourne {token, user}
4. React stocke le token dans localStorage
5. Axios interceptor ajoute header: Authorization: Bearer <token>
6. Chaque requête /admin/* → middleware auth:sanctum valide le token
7. Logout → POST /api/admin/logout → token supprimé en BDD
```

---

## Flux utilisateur — Onboarding

```
[Membre] → Scan QR Code Onboarding
    → Ouvre /onboarding dans le navigateur
    → Remplit formulaire (Nom, Prénom, Téléphone)
    → Submit → POST /api/onboarding
        → Backend: vérifie si phone existe (Member::where('phone'))
            → EXISTE : retourne 409 "Déjà enregistré"
            → N'EXISTE PAS :
                → Crée Member en BDD
                → SmsService::sendWelcome(phone, first_name)
                → Met à jour sms_sent_at
                → Retourne 201 "Inscription réussie"
    → React affiche message de confirmation
```

## Flux utilisateur — Présence

```
[Membre] → Scan QR Code Présence
    → Ouvre /presence dans le navigateur
    → Saisit son numéro de téléphone
    → Submit → POST /api/attendance {phone}
        → Backend: cherche Member par phone
            → INTROUVABLE : retourne 404 "Numéro non reconnu"
            → TROUVÉ :
                → Vérifie Attendance du jour (attended_date = today())
                    → EXISTE : retourne 409 "Déjà pointé aujourd'hui"
                    → N'EXISTE PAS :
                        → Crée Attendance {member_id, attended_date: today()}
                        → Retourne 201 {member: {first_name, last_name}}
    → React affiche "Bienvenue, [Prénom] !"
```

---

## Structure des dossiers

### Backend Laravel (`/backend`)
```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/
│   │   │   │   └── AdminAuthController.php
│   │   │   ├── OnboardingController.php
│   │   │   ├── AttendanceController.php
│   │   │   ├── MemberController.php
│   │   │   ├── DashboardController.php
│   │   │   ├── ReportController.php
│   │   │   └── QrCodeController.php
│   │   ├── Requests/
│   │   │   ├── OnboardingRequest.php
│   │   │   └── AttendanceRequest.php
│   │   └── Resources/
│   │       ├── MemberResource.php
│   │       └── AttendanceResource.php
│   ├── Models/
│   │   ├── User.php
│   │   ├── Member.php
│   │   └── Attendance.php
│   └── Services/
│       ├── SmsService.php
│       ├── QrCodeService.php
│       └── PdfService.php
├── database/
│   ├── migrations/
│   │   ├── xxxx_create_members_table.php
│   │   └── xxxx_create_attendances_table.php
│   ├── seeders/
│   │   ├── DatabaseSeeder.php
│   │   ├── AdminSeeder.php
│   │   └── MemberSeeder.php
│   └── factories/
│       ├── MemberFactory.php
│       └── AttendanceFactory.php
├── routes/
│   └── api.php
├── config/
│   └── database.php
└── tests/
    ├── Feature/
    │   ├── OnboardingTest.php
    │   ├── AttendanceTest.php
    │   └── AdminTest.php
    └── Unit/
        └── SmsServiceTest.php
```

### Frontend React (`/frontend`)
```
frontend/
├── src/
│   ├── pages/
│   │   ├── public/
│   │   │   ├── OnboardingPage.jsx
│   │   │   └── PresencePage.jsx
│   │   └── admin/
│   │       ├── LoginPage.jsx
│   │       ├── DashboardPage.jsx
│   │       ├── MembersPage.jsx
│   │       └── ReportsPage.jsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   └── Alert.jsx
│   │   ├── admin/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── AttendanceTable.jsx
│   │   │   ├── MemberTable.jsx
│   │   │   └── QrCodeDisplay.jsx
│   │   └── ProtectedRoute.jsx
│   ├── services/
│   │   └── api.js
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── hooks/
│   │   └── useAuth.js
│   ├── App.jsx
│   └── main.jsx
├── public/
├── index.html
├── vite.config.js
├── tailwind.config.js
└── .env.example
```
