# Guide d'installation locale — Famille Respect

## Prérequis système

| Outil | Version minimale | Vérification |
|-------|-----------------|--------------|
| PHP | 8.2+ | `php -v` |
| Composer | 2.x | `composer -V` |
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Git | 2.x | `git --version` |
| PostgreSQL client (optionnel) | 15 | `psql --version` |

> **Note** : Pas besoin d'installer PostgreSQL localement. La base de données est hébergée sur `prodevipga.saas.cd:5431`.

---

## 1. Cloner le dépôt

```bash
git clone <repo-url> famille-respect
cd famille-respect
```

---

## 2. Installation Backend Laravel

### 2.1 Installer les dépendances PHP
```bash
cd backend
composer install
```

### 2.2 Configurer le fichier .env
```bash
cp .env.example .env
php artisan key:generate
```

Éditer `.env` avec les valeurs suivantes :

```env
APP_NAME="Famille Respect"
APP_ENV=local
APP_KEY=          # généré automatiquement
APP_DEBUG=true
APP_URL=http://localhost:8000

LOG_CHANNEL=stack

# Base de données PostgreSQL distante
DB_CONNECTION=pgsql
DB_HOST=prodevipga.saas.cd
DB_PORT=5431
DB_DATABASE=<nom_base_fourni>
DB_USERNAME=<user_fourni>
DB_PASSWORD=<password_fourni>
DB_SCHEMA=public

# Sanctum
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
SESSION_DRIVER=cookie

# Frontend URL (pour les QR codes)
FRONTEND_URL=http://localhost:5173

# SMS — Twilio
TWILIO_SID=<votre_twilio_sid>
TWILIO_AUTH_TOKEN=<votre_twilio_token>
TWILIO_FROM=<votre_numéro_twilio>

# PDF
DOMPDF_PDF_VERSION=1.7
```

### 2.3 Vérifier la connexion PostgreSQL
```bash
php artisan db:show
# Doit afficher les infos de connexion sans erreur
```

### 2.4 Exécuter les migrations et seeders
```bash
php artisan migrate:fresh --seed
```

Cela crée toutes les tables et insère :
- Admin : `admin@famillerespect.cd` / `password`
- 20 membres de test avec présences

### 2.5 Lancer le serveur backend
```bash
php artisan serve
# Application disponible sur http://localhost:8000
```

**Vérification** : `curl http://localhost:8000/api/` doit retourner `{"message":"API Famille Respect v1.0"}`

---

## 3. Installation Frontend React

### 3.1 Installer les dépendances Node
```bash
cd frontend
npm install
```

### 3.2 Configurer le fichier .env
```bash
cp .env.example .env
```

Éditer `.env` :
```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=Famille Respect
```

### 3.3 Lancer le serveur de développement
```bash
npm run dev
# Application disponible sur http://localhost:5173
```

---

## 4. Vérification complète

### Checklist de fonctionnement

**Backend**
- [ ] `php artisan db:show` → connexion PostgreSQL OK
- [ ] `curl http://localhost:8000/api/` → `{"message":"API Famille Respect v1.0"}`
- [ ] `curl -X POST http://localhost:8000/api/admin/login -H "Content-Type: application/json" -d '{"email":"admin@famillerespect.cd","password":"password"}'` → token retourné

**Frontend**
- [ ] `http://localhost:5173/onboarding` → formulaire d'inscription visible
- [ ] `http://localhost:5173/presence` → champ téléphone visible
- [ ] `http://localhost:5173/admin/login` → formulaire de connexion admin visible

**End-to-end**
- [ ] Inscrire un membre via /onboarding → SMS reçu (ou log Twilio si pas de SMS réel)
- [ ] Pointer via /presence avec le numéro inscrit → "Bienvenue !"
- [ ] Se connecter admin → dashboard affiche la présence enregistrée
- [ ] Télécharger PDF → fichier généré correctement

---

## 5. Procédure de reset de la base de données

```bash
cd backend
php artisan migrate:fresh --seed
```

> **Attention** : Cette commande supprime **toutes les données** et repart de zéro.

Pour réinitialiser uniquement certaines tables :
```bash
php artisan migrate:rollback --step=1   # Annule la dernière migration
php artisan migrate                      # Réapplique
```

---

## 6. Commandes utiles au quotidien

```bash
# Backend
php artisan serve                          # Lancer le serveur
php artisan test                           # Tous les tests
php artisan test --filter OnboardingTest  # Test spécifique
php artisan tinker                         # Console interactive
php artisan route:list                     # Voir toutes les routes
php artisan make:controller NomCtrl --api # Créer un controller

# Frontend
npm run dev          # Mode développement
npm run build        # Build production
npm run lint         # Vérifier le code
npm run preview      # Prévisualiser le build
```

---

## 7. Problèmes fréquents

### Erreur de connexion PostgreSQL
```
SQLSTATE[08006] Connection refused
```
→ Vérifier que `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` sont corrects dans `.env`
→ Vérifier que votre IP est autorisée sur le serveur distant

### Erreur CORS
```
Access to XMLHttpRequest blocked by CORS policy
```
→ Vérifier `config/cors.php` : `allowed_origins` doit inclure `http://localhost:5173`
→ Vérifier `SANCTUM_STATEFUL_DOMAINS=localhost:5173` dans `.env`

### Token Sanctum invalide
```
401 Unauthenticated
```
→ Vérifier que le header `Authorization: Bearer <token>` est bien envoyé
→ Vérifier que le token n'a pas expiré (`php artisan sanctum:prune-expired`)

### SMS non envoyé
→ Vérifier les credentials Twilio dans `.env`
→ En dev, utiliser le log driver : commenter l'envoi réel et logger le message
