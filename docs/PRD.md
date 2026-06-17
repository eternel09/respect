# PRD — Famille Respect : Gestion de Présence & Onboarding

## Vision du produit
Permettre à l'organisation "Famille Respect" de digitaliser l'enregistrement de ses membres et le suivi des présences à ses événements, via des QR codes auto-servis, sans friction pour le membre et avec une visibilité complète pour les administrateurs.

## Objectifs
1. Éliminer les feuilles de présence papier
2. Centraliser la base de membres dans un système unique
3. Fournir des rapports de présence exportables en PDF
4. Notifier les nouveaux membres par SMS dès leur inscription

---

## Features et priorités

### P0 — MVP indispensable

#### F1 — Onboarding membre
- **Description** : Un membre scanne un QR code et remplit un formulaire pour s'enregistrer
- **Identifiant unique** : numéro de téléphone
- **Champs** : Nom, Prénom, Numéro de téléphone
- **SMS** : envoi automatique à la première inscription
- **Anti-doublon** : si le numéro existe déjà → message "Vous êtes déjà enregistré"

#### F2 — Pointage de présence
- **Description** : Un membre scanne un second QR code, entre son numéro → présence enregistrée
- **Horodatage** : automatique (created_at)
- **Anti-doublon** : une seule présence par membre par jour (calendrier local)
- **Feedback immédiat** : confirmation visuelle ("Présence enregistrée - Bienvenue, Prénom !")

#### F3 — Authentification admin
- **Description** : Connexion sécurisée via email/mot de passe
- **Tech** : Laravel Sanctum (token Bearer)
- **Rôle unique** : admin (pas de rôles multiples en MVP)

#### F4 — Dashboard admin
- **Vue présences du jour** : liste ordonnée par heure + compteur en temps réel
- **Vue membres** : liste paginée de tous les membres inscrits
- **QR codes** : affichage et téléchargement des deux QR codes

#### F5 — Export PDF
- **Par date** : rapport de présence d'un jour donné
- **Par période** : rapport sur une plage de dates
- **Contenu** : liste des présents avec nom, prénom, téléphone, heure

### P1 — Important (post-MVP)

#### F6 — Statistiques avancées
- Taux de présence moyen par membre
- Graphique de fréquentation par semaine/mois
- Top 10 des membres les plus présents

#### F7 — Recherche et filtres membres
- Recherche par nom, prénom, téléphone
- Filtre par date d'inscription

#### F8 — Export CSV
- Export membres (CSV)
- Export présences (CSV)

### P2 — Futur

#### F9 — Notifications SMS de rappel
- SMS de rappel avant un événement
- Envoi groupé à tous les membres

#### F10 — Multi-événements
- Gérer plusieurs événements distincts avec leurs propres QR codes

---

## User Stories

### Acteur : Membre (non authentifié)

| ID | Story | Critères d'acceptation |
|----|-------|------------------------|
| US-01 | En tant que nouveau membre, je scanne le QR d'onboarding pour m'inscrire | Formulaire accessible, validation numéro téléphone, SMS envoyé, confirmation affichée |
| US-02 | En tant que membre déjà inscrit qui tente de s'inscrire à nouveau | Message "Vous êtes déjà enregistré", pas de doublon en BDD |
| US-03 | En tant que membre, je scanne le QR de présence pour pointer | J'entre mon numéro, ma présence est enregistrée, je vois "Bienvenue, Prénom !" |
| US-04 | En tant que membre ayant déjà pointé aujourd'hui | Message "Vous avez déjà pointé aujourd'hui", pas de doublon |
| US-05 | En tant que membre inconnu qui tente de pointer | Message "Numéro non reconnu. Veuillez d'abord vous inscrire." |

### Acteur : Admin

| ID | Story | Critères d'acceptation |
|----|-------|------------------------|
| US-06 | En tant qu'admin, je me connecte avec email/mot de passe | Token Sanctum retourné, accès au dashboard |
| US-07 | En tant qu'admin, je vois les présences du jour | Liste triée par heure, compteur en temps réel via polling |
| US-08 | En tant qu'admin, je consulte la liste de tous les membres | Liste paginée avec stats (nb présences total) |
| US-09 | En tant qu'admin, je génère un PDF des présences par date | PDF téléchargeable avec en-tête "Famille Respect" |
| US-10 | En tant qu'admin, je génère un PDF des présences par période | PDF avec plage de dates personnalisable |
| US-11 | En tant qu'admin, je vois et télécharge les deux QR codes | QR onboarding + QR présence affichés et téléchargeables |

---

## Critères d'acceptation globaux
- L'application est responsive (mobile-first, Tailwind)
- Les pages publiques (/onboarding, /presence) ne nécessitent aucune authentification
- Toutes les routes /admin/* nécessitent un token Sanctum valide
- Les messages d'erreur et de succès sont clairs et en français
- Le temps de réponse de l'API est < 500ms pour 95% des requêtes
