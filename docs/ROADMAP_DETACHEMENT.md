# Feuille de route — Détachement en produits autonomes

But : séparer, **de façon séquentielle**, les trois produits métier de Signiq en
produits autonomes posés sur un **socle partagé** (identité/SSO, envoi WhatsApp,
génération QR/PDF, paiement), sans régression et par **petites PR testées**.

Ordre retenu : **1) Présence (entreprise) → 2) Invitations/RSVP → 3) Billetterie.**

Principes :
- Chaque étape = une PR dédiée, testée, consignée dans `docs/JOURNAL_PR.md`.
- Rétro-compatibilité : les données existantes continuent de fonctionner.
- Config-driven : les bascules passent par la configuration/l'environnement.
- On ne « casse » rien tant qu'un produit n'est pas prêt à vivre seul.

Statuts : ⬜ à faire · 🟨 en cours · ✅ fait

---

## Produit 1 — Présence « Entreprise »

Repositionnement : de « pointage associatif » vers un **produit entreprise**
(contrôle d'accès du personnel) avec **carte de service** livrable et
**design uploadable**.

| # | Étape | Détail | Statut |
|---|---|---|:--:|
| 1.1 | **Carte de service — design uploadable** | Une organisation téléverse le visuel de sa carte ; le QR + le nom sont apposés dessus (sinon design standard). Stockage, endpoints, réglage UI, transmission au moteur de rendu. | ✅ |
| 1.2 | **Livraison de la carte (impression)** | Sortie **PDF prête à imprimer** avec le design (planche A4 ou **1 carte/page CR80 + repères de coupe**, l'entreprise imprime elle-même) et **demande d'impression** adressée à l'opérateur (suivi des statuts côté plateforme). Pas d'envoi WhatsApp — hors périmètre entreprise. | ✅ |
| 1.2b | **Service opéré — portail public + file de travail** | La carte de service devient un **service géré** : les demandes arrivent par plusieurs **canaux** (client connecté, **portail public** `/cartes-de-service` ouvert aux prospects **sans compte**, e-mail à venir) et alimentent une **file de travail unique**. L'opérateur filtre par canal/statut, voit le **contact** du prospect, **prend en charge** (auto-affectation) et fait avancer le statut. Pas de création d'organisation : une demande reste un bon de travail autonome. | ✅ |
| 1.2c | **Suivi opérationnel** | **Notification e-mail** de l'équipe à chaque demande publique ; **historique** horodaté par demande (création, statuts, affectations) + **notes internes** ; **export CSV** filtrable de la file. | ✅ |
| 1.3 | **Champs entreprise sur le membre** | Fonction/poste, service/département, matricule — affichés sur la carte et exportables. | ⬜ |
| 1.4 | **Image de marque** | Couleurs + logo de l'entreprise appliqués aux cartes et au back-office (une partie existe déjà). | ⬜ |
| 1.5 | **Vocabulaire & parcours entreprise** | « Membre » → « Agent/Employé », écrans adaptés au module présence. | ⬜ |
| 1.6 | **Extraction technique** | Isoler le module (routing, gating, éventuel sous-domaine), brancher sur les services socles. | ⬜ |

## Produit 2 — Invitations & RSVP (événementiel)
À détailler une fois le Produit 1 bien avancé. Briques : `Occasion`, `Guest`,
cartons, RSVP, plan de salle, envoi WhatsApp.

## Produit 3 — Billetterie
À détailler en dernier. Déjà le plus autonome (domaine `ticket_*`, paiement
abstrait, e-billets, contrôle d'entrée). Reste : agrégateur Mobile Money réel,
scan mobile des billets, et extraction.

---

## Services socles partagés (transverses, construits au fil des étapes)
- 🔑 **Identité / multi-tenant** (`Organization`, `User`, Sanctum) — le vrai verrou.
  Durci : throttle anti-bruteforce sur `/admin/login`, tokens de téléchargement
  (`?token=`) soumis à l'expiration par inactivité, plus de mot de passe
  super-admin par défaut en production (`SUPERADMIN_PASSWORD` requis).
  **Équipe plateforme** : deux rôles internes — `super_admin` (pleins pouvoirs)
  et `operator` (demandes d'impression seulement, moindre privilège) — avec une
  page de gestion (création, modification, rôle, réinitialisation de mot de passe).
- 💬 **Envoi WhatsApp** — déjà un micro-service séparé.
- 🪪 **QR / Badges / PDF** — à extraire progressivement en service « credentials ».
- 💳 **Paiement** — interface prête ; driver réel à venir.

_Mis à jour au fil des étapes._
