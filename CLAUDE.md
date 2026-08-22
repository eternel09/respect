# CLAUDE.md — Famille Respect

## Résumé du projet
Plateforme SaaS **multi-tenant** de gestion de présence, d'onboarding et
d'événementiel. À l'origine conçue pour l'organisation « Famille Respect »
(pointage par QR code), l'application a évolué en plateforme multi-organisations :
chaque organisation dispose de son espace isolé, active les **modules** qui lui
conviennent (présence, événements), et peut structurer un **réseau**
(organisation mère → sous-organisations). Les membres s'enregistrent et pointent
via QR code ; les admins pilotent tout depuis un back-office sécurisé, avec
badges/cartes PDF, exports (PDF, Excel, PowerPoint), SMS et cartes WhatsApp.

## Stack
- **Backend** : Laravel 12, PHP 8.2, API REST, Sanctum (token Bearer), Eloquent
- **Frontend** : React 18, Vite, Tailwind CSS, React Router, Axios
- **Mobile** : Expo / React Native (app scanner terrain, mode hors-ligne + sync)
- **WhatsApp** : microservice Node (Express + whatsapp-web.js) pour l'envoi de cartes
- **Base de données** : PostgreSQL distant en prod ; **SQLite en local/dev**
- **SMS** : Twilio (`twilio/sdk`)
- **PDF** : `barryvdh/laravel-dompdf`
- **QR Code** : `simplesoftwareio/simple-qrcode`

## Structure des dossiers
```
respect/
├── backend/          # API Laravel 12 (multi-tenant)
├── frontend/         # Back-office React 18 + Vite
├── mobile/           # App scanner Expo/React Native
├── whatsapp/         # Microservice whatsapp-web.js
├── docs/             # Documentation (PRD, ARCHITECTURE, API, DEPLOY, JOURNAL…)
├── .github/workflows # CI (build APK mobile)
├── docker-compose.yml
└── CLAUDE.md         # Ce fichier
```

## Concepts clés
- **Multi-tenant** : le trait `App\Models\Concerns\BelongsToOrganization` pose un
  *global scope* Eloquent qui restreint les **lectures** aux organisations
  visibles par l'utilisateur connecté (la sienne + ses sous-organisations).
  Super-admin et contextes sans user (console, endpoints publics) non restreints.
  `organization_id` reste posé **explicitement à l'écriture** — lire large ≠
  écrire large.
- **Rôles** : `super_admin` (plateforme), `admin` (organisation),
  `secretaire` (back-office), `scanner` (terrain/mobile). Contrôle d'accès via
  le middleware `EnsureUserRole` — usage `->middleware('role:admin,scanner')`.
- **Modules** : chaque organisation active des modules (`presence`, `occasions`).
  Le routage frontend est conditionné aux modules actifs.
- **Réseau** : une organisation « mère » provisionne des sous-organisations
  (`parent_id`), les invite via un lien d'auto-inscription (`network_invite_token`)
  et consulte une vue consolidée (exports Excel/PowerPoint).

## Commandes essentielles

### Backend (depuis /backend)
```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed   # dev : SQLite (voir .env)
php artisan serve                  # http://localhost:8000
php artisan test                   # Suite PHPUnit (tests fonctionnels)
php artisan make:controller NomController --api
```

### Frontend (depuis /frontend)
```bash
npm install
cp .env.example .env
npm run dev         # http://localhost:5173
npm run build       # Build production
npm run lint        # ESLint
```

### Mobile (depuis /mobile)
```bash
npm install
npx expo start                     # dev (Expo Go / émulateur)
# L'APK release est construit en CI : workflow « Build Mobile APK »
# (déclenché manuellement ou par un tag `mobile-v*`).
```

### WhatsApp (depuis /whatsapp)
```bash
npm install
node server.js                     # service local (scan du QR au 1er lancement)
```

## Configuration base de données
En **dev**, l'application tourne sur **SQLite local** (rapide, constant, sans
pics de connexion à froid) — configuré dans `.env` (gitignoré). En **prod**,
PostgreSQL distant :
```
DB_CONNECTION=pgsql
DB_HOST=prodevipga.saas.cd
DB_PORT=5431
DB_DATABASE=<nom_base_fourni>
DB_USERNAME=<user_fourni>
DB_PASSWORD=<password_fourni>
```

## Déploiement
Conteneurisé via `docker-compose.yml` (backend, frontend, whatsapp) sur
**Dokploy**, avec réseaux séparés et volume persistant pour les uploads
(logos d'organisation). Voir `docs/DEPLOY_DOKPLOY.md`.

## Stratégie Git
- Branches de travail : `feature/<nom>`, `fix/<nom>`, `chore/<nom>`, `hotfix/<nom>`
- Chaque changement passe par une **Pull Request** (revue avant merge)
- `main` = branche d'intégration/production, protégée
- Voir `docs/GIT_STRATEGY.md`

## État d'avancement
Plateforme fonctionnelle, déployée. Grandes briques livrées :
- [x] Backend Laravel : API REST complète (25 contrôleurs, 8 modèles, services)
- [x] Multi-tenant (global scope) + rôles + middleware
- [x] Onboarding, pointage de présence, événements, dashboard
- [x] Rapports PDF ; badges & cartes membres PDF
- [x] SMS (Twilio) et cartes WhatsApp (microservice dédié)
- [x] Système de modules par organisation
- [x] Hiérarchie réseau (org mère / sous-orgs, invitation, vue consolidée,
      exports Excel/PowerPoint)
- [x] Frontend React : back-office complet (18 pages)
- [x] App mobile scanner (Expo) + CI de build APK
- [x] Suite de tests fonctionnels backend (~59 tests)
- [x] Déploiement Docker / Dokploy

### Dette connue / à surveiller
- Modules **gelés temporairement** : « occasions » (mariage/événement) retiré ;
  envoi de cartes WhatsApp gelé puis rétabli — statut à trancher.
- **Aucun test automatisé** côté frontend et mobile.
- CI : seul le build APK mobile est automatisé ; `php artisan test` n'est pas
  encore lancé en CI sur les PR.

_Mis à jour : 2026-08-22_
