# CLAUDE.md — Famille Respect

## Résumé du projet
Application web de gestion de présence et d'onboarding pour l'organisation "Famille Respect". Les membres s'enregistrent via QR code (onboarding) et pointent leur présence via un second QR code. Les admins gèrent tout depuis un tableau de bord sécurisé avec exports PDF et SMS de confirmation.

## Stack
- **Backend** : Laravel 11, API REST, Sanctum, Eloquent, PostgreSQL
- **Frontend** : React 18, Vite, Tailwind CSS, React Router, Axios
- **Base de données** : PostgreSQL distant (prodevipga.saas.cd:5431)
- **SMS** : Twilio ou Vonage
- **PDF** : barryvdh/laravel-dompdf
- **QR Code** : simplesoftwareio/simple-qrcode

## Structure des dossiers
```
E:/respect/
├── backend/          # Laravel 11
├── frontend/         # React 18 + Vite
├── docs/             # Documentation complète
└── CLAUDE.md         # Ce fichier
```

## Commandes essentielles

### Backend (depuis /backend)
```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve                    # Lance sur http://localhost:8000
php artisan test                     # Tests PHPUnit
php artisan make:model NomModel -mf  # Model + migration + factory
php artisan make:controller NomController --api
php artisan make:seeder NomSeeder
```

### Frontend (depuis /frontend)
```bash
npm install
cp .env.example .env
npm run dev         # Lance sur http://localhost:5173
npm run build       # Build production
npm run lint        # ESLint
```

## Configuration PostgreSQL
```
DB_CONNECTION=pgsql
DB_HOST=prodevipga.saas.cd
DB_PORT=5431
DB_DATABASE=<nom_base_fourni>
DB_USERNAME=<user_fourni>
DB_PASSWORD=<password_fourni>
```

## Stratégie Git (obligatoire)
- Branches : `feature/<nom>`, `fix/<nom>`, `hotfix/<nom>`
- PR vers `develop`, jamais directement vers `main`
- `main` = production uniquement, protégée
- Voir `/docs/GIT_STRATEGY.md` pour le workflow complet

## État d'avancement
- [x] Documentation créée (CLAUDE.md, /docs/*)
- [ ] Backend Laravel initialisé
- [ ] Migrations et modèles créés
- [ ] API REST implémentée
- [ ] Frontend React initialisé
- [ ] Pages publiques (onboarding, présence)
- [ ] Espace admin
- [ ] Tests
- [ ] Déploiement

_Mis à jour : 2026-06-17_
