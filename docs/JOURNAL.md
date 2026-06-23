# Journal des problèmes & décisions

Suivi des problèmes rencontrés, de leur cause et de leur résolution. Le plus récent en haut.

## 2026-06-23

### Une nouvelle organisation affichait les données de Famille Respect
- **Cause** : dette multi-tenant connue — les endpoints de **lecture** (dashboard, membres, événements…) ne filtraient pas par `organization_id`. Avec une 2ᵉ org, son admin voyait les données de l'org par défaut.
- **Fix** : trait `BelongsToOrganization` (scope global Eloquent filtrant sur l'org de l'utilisateur connecté ; super-admin et contextes sans user non restreints) appliqué à Member/Event/Attendance, + `DashboardController` (SQL brut) scopé explicitement. Isolation vérifiée (`a8c36a6`).

### Lenteur générale (composants longs à charger)
- **Causes** : (1) `DashboardController` lançait 5 requêtes (~1 s/req sur la DB distante ≈ 11 s) ; (2) la page **Membres** appelait `/admin/dashboard` en parallèle → héritait des 11 s ; (3) latence + **pics de connexion à froid** de la base distante (jusqu'à 48 s une fois).
- **Fix** : compteurs du dashboard regroupés en 1 requête (`766a0db`) ; suppression de l'appel dashboard sur Membres + splash réduit 1400→700 ms (`fb04e8d`) ; **bascule du dev sur SQLite local** (`.env`, gitignoré) → ~0,6–1,9 s/req, constant, plus de pics. Seeders/factories rendus multi-tenant pour seeder à neuf (`faf8ae8`).
- **Note** : la base PostgreSQL distante reste pour la prod (config commentée dans `.env`). Le ~0,6 s résiduel = boot PHP par requête de `artisan serve` (mode dev).

## 2026-06-20

### Erreur « CSRF token mismatch » (419) au login navigateur
- **Cause** : `statefulApi()` (Sanctum) dans `bootstrap/app.php` appliquait la protection CSRF/session aux requêtes API venant de `localhost`. L'auth du SPA est en **token Bearer** (localStorage), pas en cookies → CSRF non satisfait. En curl ça passait (pas d'`Origin` navigateur).
- **Fix** : retrait de `statefulApi()` → API stateless. Commit `d0e489c`.

### Latence des requêtes en local (~6 s)
- **Cause** : base **PostgreSQL distante** (`prodevipga.saas.cd`) + `php artisan serve` mono-thread (les requêtes concurrentes se mettent en file).
- **Statut** : non bloquant. Chaque page met quelques secondes. À surveiller pour la prod.

### QR en PNG impossible (extension imagick absente en dev)
- **Cause** : `simple-qrcode` génère le PNG via BaconQrCode→imagick, non installé.
- **Fix** : badges générés avec un **QR en SVG** (pur PHP). Les anciens QR PNG publics (onboarding/événement) ne s'affichent pas en dev mais sont voués à disparaître avec le pivot.

### Outillage PR : `gh` et Python absents
- **Cause** : ni GitHub CLI ni Python sur la machine.
- **Contournement** : PR créées via l'**API GitHub en PHP**, jeton récupéré par `git credential`.

### Branches : retour sur `main` a « effacé » le redesign du working tree
- **Cause** : le redesign frontend n'était que sur `feature/redesign-frontend` ; partir le backend depuis `main` ramenait l'ancien code.
- **Fix** : création de `develop` (= main + redesign) ; les `feature/*` partent de `develop`.

### `organization_id NOT NULL` cassait les créations
- **Cause** : après la migration multi-tenant, onboarding/événement/pointage ne renseignaient pas l'org.
- **Fix** : câblage de `organization_id` (org par défaut pour le public, org de l'utilisateur pour l'admin). Commit `afba499`.

### Front : layout cassé / non responsive
- **Cause** : reste du template Vite dans `index.css` (`#root { width: 1126px; … }`) + dark-mode fantôme.
- **Fix** : nettoyage + thème chaleureux en tokens Tailwind v4. Commit `d975c6e`.

### Front : page « Présences » inaccessible
- **Cause** : la route `/admin/attendance` était un simple `Navigate` vers le dashboard (placeholder MVP).
- **Fix** : vraie `AttendancePage` branchée sur `/admin/attendances`.

## Dettes connues (à traiter)
- Scoping des **lectures** par organisation (endpoints admin renvoient toutes les orgs).
- Pas d'endpoint de **création de comptes staff** (rôles `secretaire`/`scanner` créés en base/seed pour l'instant).
- Page **QR Codes** (ancien modèle événement) à remplacer par les badges.
