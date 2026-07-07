# Déploiement Signiq sur Dokploy

Signiq = 4 composants : **PostgreSQL**, **backend** (Laravel), **frontend** (React), **whatsapp** (Node/Chromium).
Tous déployés depuis le **même repo GitHub**, branche `main`.

Remplace `tondomaine.cd` par ton vrai domaine partout.

```
app.tondomaine.cd   → frontend
api.tondomaine.cd   → backend
whatsapp            → service interne (pas de domaine public)
```

---

## 0. Prérequis
- Un projet Dokploy (https://dokploy.saas.cd) connecté à GitHub (`eternel09/respect`).
- DNS : deux enregistrements **A** (`app`, `api`) pointant vers l'IP du serveur Dokploy.
- En local, génère la clé Laravel : `php artisan key:generate --show` → garde la valeur `base64:...`.
- Génère une clé WhatsApp : `openssl rand -hex 24`.

## 1. Base de données PostgreSQL
Déjà provisionnée. Récupère : host, port (5432), database, user, password.
> Le host interne Dokploy est le nom du service DB (utilisable par le backend sur le réseau interne).

## 2. Application « whatsapp » (à créer en premier — le backend en dépend)
- **Create Application** → source GitHub `eternel09/respect`, branche `main`.
- **Build Type : Dockerfile**, *Docker Context Path* = `whatsapp` (Dockerfile Path = `whatsapp/Dockerfile`).
- **Environment** : voir `whatsapp/.env.production.example` (`PORT=3001`, `API_KEY=<clé openssl>`).
- **Volumes** : monte un volume persistant sur `/app/.wwebjs_auth` (⚠️ sinon re-scan du QR à chaque déploiement).
- **Pas de domaine** (service interne). Note son nom de service (ex. `whatsapp`) → sert au backend.
- **Deploy**. Au premier boot, logs → « connexion à WhatsApp Web… ». La liaison se fera depuis le back-office (étape 6).

## 3. Application « backend »
- Nouvelle application, même repo/branche `main`.
- **Build Type : Dockerfile**, *Context Path* = `backend`.
- **Environment** : copie `backend/.env.production.example` et renseigne :
  - `APP_KEY=base64:...`
  - `APP_URL=https://api.tondomaine.cd`
  - `DB_*` (étape 1)
  - `CORS_ALLOWED_ORIGINS=https://app.tondomaine.cd`
  - `WHATSAPP_SERVICE_URL=http://whatsapp:3001` (nom de service de l'étape 2)
  - `WHATSAPP_SERVICE_KEY=<même valeur que API_KEY du service whatsapp>`
- **Domaine** : `api.tondomaine.cd`, **port conteneur = 8080**, HTTPS/Let's Encrypt activé.
- **Deploy**. La migration s'exécute automatiquement au démarrage (`AUTORUN_LARAVEL_MIGRATION`).
- **Seed initial** (une seule fois) via le terminal Dokploy du conteneur :
  `php artisan db:seed --force` (crée le super-admin / comptes de départ).

## 4. Application « frontend »
- Nouvelle application, même repo/branche `main`.
- **Build Type : Dockerfile**, *Context Path* = `frontend`.
- **Build Args** (⚠️ au build, pas au runtime) : `VITE_API_URL=https://api.tondomaine.cd`
- **Domaine** : `app.tondomaine.cd`, **port conteneur = 80**, HTTPS activé.
- **Deploy**.

## 5. Vérifications
- `https://api.tondomaine.cd/api/events/public` → renvoie du JSON.
- `https://app.tondomaine.cd` → écran de connexion Signiq.
- Connexion admin → le tableau de bord charge (pas d'erreur CORS dans la console).
- Génère un badge / une carte → le PDF se télécharge.

## 6. Liaison WhatsApp (une fois)
- Back-office → **Réglages** → section WhatsApp → un **QR de liaison** s'affiche.
- Sur le téléphone WhatsApp de l'organisation : Appareils connectés → scanner le QR.
- La pastille passe au vert → l'envoi des cartes/invitations fonctionne.

## 7. Redéploiements
- `git push` sur `main` → Dokploy redéploie (auto-deploy si activé).
- Les migrations passent automatiquement ; la session WhatsApp est conservée (volume).

---

## Dépannage
| Symptôme | Cause probable | Fix |
|---|---|---|
| Front : erreur CORS | `CORS_ALLOWED_ORIGINS` ≠ origine réelle du front | corriger la valeur + redeploy backend |
| Front appelle `/api` en local | `VITE_API_URL` non passé **en build arg** | le mettre dans Build Args (pas Env), rebuild |
| Backend 500 au boot | `APP_KEY` manquante ou DB injoignable | vérifier `APP_KEY` + `DB_*` |
| WhatsApp : re-scan à chaque deploy | volume `/app/.wwebjs_auth` absent | ajouter le volume persistant |
| Cartes : « Chromium » / timeout | Chromium non résolu | vérifier `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` |
| WhatsApp injoignable depuis backend | mauvaise URL interne | `WHATSAPP_SERVICE_URL` = `http://<nom-service>:3001` |

## Note — application mobile (Expo)
L'app scanner ne se déploie pas ici. Pour un APK de prod, builder avec l'URL
`https://api.tondomaine.cd` comme serveur par défaut (EAS Build / config Expo).
