# Stratégie Git — Famille Respect

## Branches principales

| Branche | Rôle | Protection |
|---------|------|------------|
| `main` | Production uniquement | Protégée — merge via PR uniquement |
| `develop` | Intégration, staging | Merge via PR uniquement |

**Règle absolue** : ne jamais pusher directement sur `main` ou `develop`.

---

## Convention de nommage des branches

```
<type>/<description-courte-en-kebab-case>

Types :
  feature/   → nouvelle fonctionnalité
  fix/       → correction de bug
  hotfix/    → correction urgente en production
  refactor/  → refactoring sans changement de comportement
  test/      → ajout ou correction de tests
  docs/      → documentation uniquement
  chore/     → config, dépendances, CI
```

### Exemples
```
feature/onboarding-form
feature/admin-dashboard
feature/pdf-export
fix/attendance-duplicate-check
fix/cors-config
hotfix/login-token-expiry
refactor/sms-service
test/onboarding-controller
docs/api-endpoints
chore/add-dompdf-package
```

---

## Workflow complet

### 1. Démarrer une nouvelle feature

```bash
# Toujours partir de develop à jour
git checkout develop
git pull origin develop

# Créer et basculer sur la nouvelle branche
git checkout -b feature/mon-feature
```

### 2. Développer

```bash
# Commits atomiques et fréquents
git add <fichiers-spécifiques>
git commit -m "feat: ajouter formulaire onboarding avec validation téléphone"
```

### 3. Format des messages de commit (Conventional Commits)

```
<type>(<scope>): <description courte>

[Corps optionnel — explication du pourquoi]

[Footer optionnel — ex: Closes #12]
```

**Types de commit** :
- `feat` — nouvelle fonctionnalité
- `fix` — correction de bug
- `test` — ajout/modification de tests
- `refactor` — refactoring
- `docs` — documentation
- `chore` — maintenance (deps, config)
- `style` — formatage (pas de changement logique)

**Exemples** :
```
feat(onboarding): ajouter validation format numéro téléphone
fix(attendance): corriger vérification doublon présence du jour
test(admin): ajouter tests authentification Sanctum
chore(deps): installer barryvdh/laravel-dompdf
docs(api): documenter endpoint /attendance
```

### 4. Pousser et ouvrir une Pull Request

```bash
git push origin feature/mon-feature
# Ouvrir une PR sur GitHub : feature/mon-feature → develop
```

**Template de PR** :
```markdown
## Description
[Quoi et pourquoi]

## Changements
- [ ] Backend : ...
- [ ] Frontend : ...
- [ ] Tests : ...

## Tests effectués
- [ ] Tests unitaires passent
- [ ] Test manuel du flux concerné
- [ ] Pas de régression sur les autres flows

## Checklist
- [ ] Code reviewé par soi-même
- [ ] Pas de secrets dans le code
- [ ] Variables d'environnement documentées si nouvelles
```

### 5. Merge vers develop

```bash
# Sur GitHub : Squash and merge (garde l'historique propre)
# OU
git checkout develop
git merge --no-ff feature/mon-feature
git push origin develop
```

### 6. Hotfix (correction urgente en production)

```bash
# Partir de main
git checkout main
git pull origin main
git checkout -b hotfix/description-du-bug

# Corriger, committer
git commit -m "fix: corriger [description]"

# Merger dans main ET develop
git checkout main
git merge --no-ff hotfix/description-du-bug
git tag v1.0.1
git push origin main --tags

git checkout develop
git merge --no-ff hotfix/description-du-bug
git push origin develop

# Supprimer la branche hotfix
git branch -d hotfix/description-du-bug
git push origin --delete hotfix/description-du-bug
```

### 7. Release vers production

```bash
# Créer une branche release depuis develop
git checkout develop
git checkout -b release/v1.1.0

# Tests finaux, corrections mineures si nécessaire
# Puis merger dans main
git checkout main
git merge --no-ff release/v1.1.0
git tag v1.1.0 -m "Release v1.1.0"
git push origin main --tags

# Merger aussi dans develop pour récupérer les corrections
git checkout develop
git merge --no-ff release/v1.1.0
git push origin develop
```

---

## Règles de protection des branches (GitHub)

### main
- Require pull request reviews (1 reviewer minimum)
- Require status checks (tests CI passants)
- Require linear history
- Restrict who can push (admins uniquement)

### develop
- Require pull request reviews (1 reviewer minimum)
- Require status checks
- Pas de force push

---

## Nettoyage des branches

```bash
# Supprimer une branche locale après merge
git branch -d feature/mon-feature

# Supprimer la branche distante
git push origin --delete feature/mon-feature

# Nettoyer les références distantes obsolètes
git remote prune origin
```
