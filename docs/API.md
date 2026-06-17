# API Documentation — Famille Respect

Base URL : `http://localhost:8000/api`

---

## Routes publiques (sans authentification)

### POST /onboarding
Inscription d'un nouveau membre.

**Request**
```json
{
  "first_name": "Jean",
  "last_name": "Dupont",
  "phone": "+243812345678"
}
```

**Réponses**

`201 Created` — Inscription réussie
```json
{
  "message": "Inscription réussie. Un SMS de confirmation vous a été envoyé.",
  "data": {
    "id": 1,
    "first_name": "Jean",
    "last_name": "Dupont",
    "phone": "+243812345678",
    "created_at": "2026-06-17T10:30:00Z"
  }
}
```

`409 Conflict` — Numéro déjà enregistré
```json
{
  "message": "Ce numéro de téléphone est déjà enregistré.",
  "data": {
    "first_name": "Jean",
    "last_name": "Dupont"
  }
}
```

`422 Unprocessable Entity` — Validation échouée
```json
{
  "message": "Les données fournies sont invalides.",
  "errors": {
    "phone": ["Le numéro de téléphone est requis."],
    "first_name": ["Le prénom est requis."]
  }
}
```

---

### POST /attendance
Enregistrement d'une présence.

**Request**
```json
{
  "phone": "+243812345678"
}
```

**Réponses**

`201 Created` — Présence enregistrée
```json
{
  "message": "Présence enregistrée avec succès.",
  "data": {
    "member": {
      "first_name": "Jean",
      "last_name": "Dupont"
    },
    "attended_date": "2026-06-17",
    "time": "10:35:22"
  }
}
```

`404 Not Found` — Membre inconnu
```json
{
  "message": "Numéro non reconnu. Veuillez d'abord vous inscrire via le QR code d'onboarding."
}
```

`409 Conflict` — Déjà pointé aujourd'hui
```json
{
  "message": "Vous avez déjà enregistré votre présence aujourd'hui.",
  "data": {
    "attended_date": "2026-06-17"
  }
}
```

`422 Unprocessable Entity` — Validation échouée
```json
{
  "message": "Les données fournies sont invalides.",
  "errors": {
    "phone": ["Le numéro de téléphone est requis."]
  }
}
```

---

## Routes admin (Bearer token Sanctum requis)

Header requis : `Authorization: Bearer <token>`

### POST /admin/login
Connexion administrateur.

**Request**
```json
{
  "email": "admin@famillerespect.cd",
  "password": "password"
}
```

**Réponses**

`200 OK`
```json
{
  "message": "Connexion réussie.",
  "token": "1|abc123def456...",
  "user": {
    "id": 1,
    "name": "Administrateur",
    "email": "admin@famillerespect.cd"
  }
}
```

`401 Unauthorized`
```json
{
  "message": "Email ou mot de passe incorrect."
}
```

---

### POST /admin/logout
Déconnexion (révoque le token courant).

**Réponse** `200 OK`
```json
{
  "message": "Déconnexion réussie."
}
```

---

### GET /admin/me
Infos de l'admin connecté.

**Réponse** `200 OK`
```json
{
  "data": {
    "id": 1,
    "name": "Administrateur",
    "email": "admin@famillerespect.cd"
  }
}
```

---

### GET /admin/dashboard
Statistiques globales du tableau de bord.

**Réponse** `200 OK`
```json
{
  "data": {
    "total_members": 150,
    "today_attendances": 32,
    "today_date": "2026-06-17",
    "this_week_attendances": 187,
    "this_month_attendances": 612
  }
}
```

---

### GET /admin/attendances/today
Liste des présences du jour.

**Query params** : `page=1&per_page=50`

**Réponse** `200 OK`
```json
{
  "data": [
    {
      "id": 45,
      "member": {
        "id": 12,
        "first_name": "Jean",
        "last_name": "Dupont",
        "phone": "+243812345678"
      },
      "attended_date": "2026-06-17",
      "created_at": "2026-06-17T08:15:33Z"
    }
  ],
  "meta": {
    "total": 32,
    "per_page": 50,
    "current_page": 1,
    "last_page": 1
  }
}
```

---

### GET /admin/attendances
Liste de toutes les présences avec filtres.

**Query params** : `date=2026-06-17&member_id=12&page=1&per_page=20`

**Réponse** `200 OK` — même structure que `/attendances/today`

---

### GET /admin/members
Liste de tous les membres.

**Query params** : `search=Jean&page=1&per_page=20`

**Réponse** `200 OK`
```json
{
  "data": [
    {
      "id": 12,
      "first_name": "Jean",
      "last_name": "Dupont",
      "phone": "+243812345678",
      "total_attendances": 14,
      "last_attendance": "2026-06-17",
      "created_at": "2026-05-01T09:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "per_page": 20,
    "current_page": 1,
    "last_page": 8
  }
}
```

---

### GET /admin/members/{id}
Détail d'un membre avec ses présences.

**Réponse** `200 OK`
```json
{
  "data": {
    "id": 12,
    "first_name": "Jean",
    "last_name": "Dupont",
    "phone": "+243812345678",
    "sms_sent_at": "2026-05-01T09:00:00Z",
    "total_attendances": 14,
    "attendances": [
      { "attended_date": "2026-06-17", "created_at": "2026-06-17T08:15:33Z" }
    ]
  }
}
```

---

### GET /admin/reports/pdf
Génère et télécharge un rapport PDF.

**Query params** :
- `date=2026-06-17` — rapport d'un jour précis
- OU `start_date=2026-06-01&end_date=2026-06-17` — rapport sur une période

**Réponse** `200 OK`
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="rapport-presences-2026-06-17.pdf"`

**Erreur** `422 Unprocessable Entity`
```json
{
  "message": "Paramètre date ou période requis.",
  "errors": {
    "date": ["Fournir soit 'date', soit 'start_date' et 'end_date'."]
  }
}
```

---

### GET /admin/qrcodes
Génère et retourne les deux QR codes.

**Réponse** `200 OK`
```json
{
  "data": {
    "onboarding": {
      "url": "http://localhost:5173/onboarding",
      "svg": "<svg>...</svg>",
      "png_base64": "data:image/png;base64,..."
    },
    "attendance": {
      "url": "http://localhost:5173/presence",
      "svg": "<svg>...</svg>",
      "png_base64": "data:image/png;base64,..."
    }
  }
}
```

---

## Codes d'erreur HTTP

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 201 | Ressource créée |
| 401 | Non authentifié (token manquant ou invalide) |
| 403 | Non autorisé (droits insuffisants) |
| 404 | Ressource introuvable |
| 409 | Conflit (doublon détecté) |
| 422 | Données invalides (validation échouée) |
| 429 | Trop de requêtes (rate limit) |
| 500 | Erreur serveur interne |

## Format d'erreur standard
```json
{
  "message": "Description de l'erreur en français.",
  "errors": {
    "champ": ["Message de validation."]
  }
}
```
