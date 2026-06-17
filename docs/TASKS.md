# TASKS — Plan d'implémentation Famille Respect

## Phase 1 — MVP

### 1.1 Initialisation du projet

- [ ] **T01** — Créer le projet Laravel dans `/backend` (`composer create-project laravel/laravel backend`)
- [ ] **T02** — Configurer `.env` backend (DB PostgreSQL, APP_URL, SANCTUM_STATEFUL_DOMAINS)
- [ ] **T03** — Installer les packages PHP : `sanctum`, `dompdf`, `simple-qrcode`, `twilio/sdk`
- [ ] **T04** — Publier la config Sanctum (`php artisan vendor:publish --provider Sanctum`)
- [ ] **T05** — Configurer CORS dans `config/cors.php` (autoriser localhost:5173)
- [ ] **T06** — Créer le projet React dans `/frontend` (`npm create vite@latest frontend -- --template react`)
- [ ] **T07** — Installer les packages npm : `axios`, `react-router-dom`, `tailwindcss`
- [ ] **T08** — Configurer Tailwind CSS (`tailwind.config.js`, `postcss.config.js`)
- [ ] **T09** — Configurer Axios avec base URL et intercepteur Bearer token

**Dépendances** : T01→T02→T03→T04→T05 (séquentiel) | T06→T07→T08→T09 (séquentiel)

---

### 1.2 Base de données

- [ ] **T10** — Créer migration `create_members_table` (id, first_name, last_name, phone UNIQUE, sms_sent_at)
- [ ] **T11** — Créer migration `create_attendances_table` (id, member_id FK, attended_date DATE, UNIQUE constraint)
- [ ] **T12** — Créer model `Member` avec fillable, relations, casts
- [ ] **T13** — Créer model `Attendance` avec fillable, relations
- [ ] **T14** — Créer `MemberFactory` et `AttendanceFactory` pour les tests
- [ ] **T15** — Créer `AdminSeeder` (user admin@famillerespect.cd / password)
- [ ] **T16** — Créer `MemberSeeder` (20 membres de test avec présences)
- [ ] **T17** — Exécuter `php artisan migrate:fresh --seed` et vérifier la BDD

**Dépendances** : T02→T10→T11→T12→T13→T14→T15→T16→T17

---

### 1.3 Backend — Routes et Controllers publics

- [ ] **T18** — Créer `OnboardingRequest` (validation: first_name, last_name, phone requis + format)
- [ ] **T19** — Créer `OnboardingController@store`
  - Vérifie doublon par phone
  - Crée Member
  - Appelle SmsService::sendWelcome
  - Retourne 201 ou 409
- [ ] **T20** — Créer `SmsService` (injection Twilio, méthode sendWelcome)
- [ ] **T21** — Créer `AttendanceRequest` (validation: phone requis)
- [ ] **T22** — Créer `AttendanceController@store`
  - Cherche Member par phone
  - Vérifie présence du jour
  - Crée Attendance
  - Retourne 201, 404 ou 409
- [ ] **T23** — Enregistrer les routes publiques dans `routes/api.php`
- [ ] **T24** — Tester manuellement avec Postman/curl

**Dépendances** : T12→T18→T19 | T13→T22 | T20 indépendant | T23 après T19+T22

---

### 1.4 Backend — Auth admin

- [ ] **T25** — Créer `AdminAuthController@login` (Auth::attempt → createToken)
- [ ] **T26** — Créer `AdminAuthController@logout` (révoque token courant)
- [ ] **T27** — Créer `AdminAuthController@me` (retourne user connecté)
- [ ] **T28** — Enregistrer routes auth dans `routes/api.php` avec middleware `auth:sanctum`

**Dépendances** : T04→T25→T26→T27→T28

---

### 1.5 Backend — Routes admin protégées

- [ ] **T29** — Créer `MemberResource` (formatage JSON membre)
- [ ] **T30** — Créer `AttendanceResource` (formatage JSON présence + member eager load)
- [ ] **T31** — Créer `MemberController` (index avec pagination + search, show avec historique)
- [ ] **T32** — Créer `DashboardController@index` (stats globales)
- [ ] **T33** — Créer `AttendanceController@today` (présences du jour paginées)
- [ ] **T34** — Créer `AttendanceController@index` (toutes présences avec filtres)
- [ ] **T35** — Créer `PdfService` (génère HTML→PDF via dompdf)
- [ ] **T36** — Créer `ReportController@generate` (parse params date/période → PdfService)
- [ ] **T37** — Créer `QrCodeService` (génère SVG + PNG base64 pour les deux URLs)
- [ ] **T38** — Créer `QrCodeController@index` (retourne les deux QR codes)
- [ ] **T39** — Enregistrer toutes les routes admin dans `routes/api.php`

**Dépendances** : T12→T29 | T13→T30 | T29→T31 | T30→T33→T34 | T35→T36 | T37→T38

---

### 1.6 Frontend — Pages publiques

- [ ] **T40** — Configurer React Router (App.jsx avec routes)
- [ ] **T41** — Créer composants UI réutilisables : `Button`, `Input`, `Card`, `Alert`
- [ ] **T42** — Créer `OnboardingPage` (formulaire Nom/Prénom/Téléphone + submit + feedback)
- [ ] **T43** — Créer `PresencePage` (champ téléphone + submit + feedback "Bienvenue, Prénom !")
- [ ] **T44** — Tester les flux onboarding et présence end-to-end

**Dépendances** : T09→T40→T41→T42→T43→T44 | T23 requis pour T44

---

### 1.7 Frontend — Espace admin

- [ ] **T45** — Créer `AuthContext` + `useAuth` hook (gestion token localStorage)
- [ ] **T46** — Créer `ProtectedRoute` (redirige vers /admin/login si non authentifié)
- [ ] **T47** — Créer `LoginPage` (formulaire email/password, appel /admin/login, stockage token)
- [ ] **T48** — Créer `Sidebar` (navigation admin : Dashboard, Membres, Rapports, QR Codes)
- [ ] **T49** — Créer `DashboardPage` (stats + liste présences aujourd'hui avec polling 30s)
- [ ] **T50** — Créer `AttendanceTable` (tableau présences avec colonnes nom/téléphone/heure)
- [ ] **T51** — Créer `MembersPage` (liste paginée + recherche)
- [ ] **T52** — Créer `MemberTable` (tableau membres avec stats)
- [ ] **T53** — Créer `ReportsPage` (sélecteur date/période + bouton télécharger PDF)
- [ ] **T54** — Créer `QrCodeDisplay` (affiche les 2 QR codes avec bouton télécharger)
- [ ] **T55** — Tester tous les flows admin end-to-end

**Dépendances** : T45→T46→T47 | T48 indépendant | T49→T50 | T51→T52 | T45 requis pour T47+T49+T51+T53+T54

---

### 1.8 Tests

- [ ] **T56** — Créer `OnboardingTest` (happy path, doublon, validation)
- [ ] **T57** — Créer `AttendanceTest` (happy path, membre inconnu, doublon jour, validation)
- [ ] **T58** — Créer `AdminTest` (login valide, login invalide, routes protégées sans token)
- [ ] **T59** — Créer `MemberTest` (index paginé, show avec présences)
- [ ] **T60** — Créer `ReportTest` (génération PDF par date, par période)
- [ ] **T61** — Lancer `php artisan test` — tous les tests verts

**Dépendances** : T22→T56 | T22→T57 | T28→T58 | T31→T59 | T36→T60

---

## Phase 2 — Améliorations post-MVP

- [ ] **T62** — Statistiques avancées (taux présence, graphiques)
- [ ] **T63** — Recherche et filtres avancés membres
- [ ] **T64** — Export CSV (membres + présences)
- [ ] **T65** — SMS de rappel groupé
- [ ] **T66** — Gestion multi-événements

---

## Résumé des dépendances critiques

```
T01-T09 (init) → tout le reste
T10-T17 (BDD)  → T18-T39 (backend)
T18-T39 (API)  → T40-T55 (frontend)
T40-T55 (UI)   → T56-T61 (tests)
```
