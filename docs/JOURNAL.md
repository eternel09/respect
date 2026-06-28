# Journal des problèmes & décisions

Suivi des problèmes rencontrés, de leur cause et de leur résolution. Le plus récent en haut.

## 2026-06-26

### Le badge PDF ne se téléchargeait jamais (204 / « échec de chargement » / 0 octet) — saga
- **Symptômes** : selon les tentatives, fichier 0 octet, « Échec de chargement du document PDF », ou statut **204** dans le navigateur — alors que `curl` recevait toujours un **PDF valide de 1,37 Mo** (structure OK, endpoints 200, pas de service worker, bon code servi).
- **CAUSE RACINE** : **Internet Download Manager (IDM)** installé sur le navigateur. Son extension (« IDM Advanced Integration ») **intercepte les requêtes de fichiers téléchargeables** et renvoie un **204** aux lectures JS (fetch/XHR/blob), produisant des fichiers vides. `curl` n'est pas intercepté → d'où l'écart navigateur/curl, déterministe et trompeur. Révélé par la console : `net::ERR_FAILED 204 (Intercepted by the IDM Advanced Integration)`.
- **Fix** : téléchargement via un **vrai lien `<a download>`** (navigation native, même origine, token en query) — IDM l'intercepte et télécharge normalement le fichier, contrairement à fetch/blob qu'il vide. (`44cc479`)
- **Gains collatéraux** : badge réduit de **1,37 Mo → 29 Ko** via `isFontSubsettingEnabled` (dompdf embarquait les polices DejaVu entières) (`5d61a80`) ; QR du badge en **SVG vectoriel** simple (`5dc48e2`) ; route `/download/badge/{member}` authentifiée par token en query ; catch-all de route pour éviter la page blanche sur URL inconnue (`a9b354c`).
- **Leçon** : devant un écart navigateur-vs-curl déterministe et inexplicable côté serveur, **suspecter une extension/proxy local** (gestionnaire de téléchargement, antivirus, IDM…) tôt — la console l'aurait montré immédiatement.

## 2026-06-23

### QR du badge PDF affiché en blanc (« 0 octet »)
- **Cause** : dompdf encode les PNG en data-URI avec un SMask (alpha) que certains lecteurs PDF rendent en blanc. L'image était bien embarquée (444×444, données non nulles) mais invisible.
- **Fix** : QR du badge généré en **JPEG** (DCTDecode, fond blanc opaque, q92) → rendu fiable dans tous les lecteurs ; l'aperçu web reste en PNG. Même design (dégradé + modules arrondis). (`9f22531`)

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
