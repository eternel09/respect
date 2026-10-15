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

Statuts : ⬜ à faire · 🟨 en cours · ✅ fait · ⏳ plus tard · ✖ sans objet

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
| 1.2d | **Numéro de ticket & suivi public** | À l'envoi, le client reçoit un **numéro de ticket** (réf. lisible `CP-XXXXXX`) à l'écran **et par e-mail** (accusé de réception) avec un **lien de suivi**. Page publique `/suivi/{token}` (jeton non devinable) affichant l'état et l'historique public (création → statut), sans exposer les notes internes. Référence visible aussi dans la file opérateur. | ✅ |
| 1.2e | **Consolidation du service de cartes** | Le client est **prévenu par e-mail à chaque avancement** (en cours / terminée / annulée) avec son lien de suivi ; **tableau de bord opérateur** (demandes ouvertes, cartes à produire, terminées, demandes en souffrance) ; **bon de livraison PDF** par demande ; **relance automatique** : récapitulatif à l'équipe, chaque jour ouvré à 8 h (Kinshasa), des demandes sans avancement depuis 48 h (`CARD_REQUEST_STALE_HOURS`) — nécessite le service `scheduler` (`docker compose --profile scheduler up -d`). Devis/tarification : en attente d'une grille de prix. | ✅ |
| 1.3 | **Champs entreprise sur le membre** | Fonction/poste, service/département, matricule — saisis à la création et **modifiables** (fiche membre), **affichés sur la carte** de service (fonction · service en sous-titre, matricule en n°) et **exportables** (CSV). | ✅ |
| 1.4 | ~~**Image de marque (back-office)**~~ | **Sans objet pour ce produit** : le back-office reste en marque Signiq. Avant contrat, le prospect n'a **pas de compte** (demande par le lien public, suivi par ticket) ; une fois le contrat signé, l'entreprise reçoit son **espace organisation** (tableau de bord de présence, agents, pointages, rapports) — voir 1.7. La marque du client vit sur **les cartes** (logo client uniquement, fait). | ✖ |
| 1.5 | **Vocabulaire & parcours entreprise** | Terme du membre **configurable par organisation** (`member_term` : membre / agent / employé), appliqué au back-office présence : menu latéral, titres, boutons, listes et fiches. Réglage dans Paramètres. | ✅ |
| 1.7 | **Liste du personnel & conversion en client** | Sur le **portail public**, le prospect **joint la liste de son personnel** (Excel/CSV lu dans le navigateur : colonnes **reconnues automatiquement**, sans choix manuel — titre au-dessus de l'entête, Nom/Postnom/Prénom ou nom complet, entêtes anglais, CSV « ; » en UTF-8 ou Windows-1252 ; modèle téléchargeable ; quantité = une carte par personne). L'équipe voit la liste dans la file. Contrat signé → le super-admin clique **« Convertir en client »** : l'organisation et son compte admin sont créés (accès envoyés par e-mail, mot de passe temporaire affiché une fois), le personnel devient ses **agents/employés** avec QR personnel (terme choisi par l'équipe à la conversion, « agents » par défaut ; le champ de choix a été retiré du portail à la demande), la demande est rattachée. L'admin du client **retrouve directement ses employés** dans son espace ; l'équipe télécharge les **cartes PDF** (planche A4 ou 1/page) depuis la demande. Numéro de téléphone déjà pris sur la plateforme → importé sans téléphone (signalé). Vocabulaire appliqué aussi au tableau de bord, aux présences et à la vue réseau. | ✅ |
| 1.6 | **Extraction technique** | **Reporté.** En clair : aujourd'hui tout tourne dans **une seule application** (un seul code, un seul déploiement). « Extraire » = faire du produit présence/cartes une application **séparée** (son propre déploiement, éventuellement sa propre adresse web type `cartes.signiq…`), qui réutiliserait les briques communes (connexion, envoi d'e-mails/WhatsApp, PDF). Intérêt : faire évoluer/vendre le produit indépendamment. Coût : plusieurs semaines d'infra, peu de bénéfice visible tant qu'on a un seul produit actif. À rediscuter quand le besoin commercial existe. | ⏳ |

## Produit 2 — Invitations & RSVP (mariages, événements)

Repositionnement : **service opéré**, comme les cartes. Le couple (ou
l'organisateur) n'a **ni compte ni back-office** : il soumet sa demande via un
portail public, reçoit un ticket et suit l'avancement par un lien. **L'équipe
plateforme** monte le carton, envoie les invitations depuis **ses propres
numéros WhatsApp** et suit les confirmations.

Déjà en place (réutilisé tel quel) : événements typés à modules, invités
(import, tables), plan de salle, carton personnalisé (QR + nom), message,
envoi WhatsApp espacé (anti-blocage, verrou, arrêt), page RSVP + vidéo du
couple, accueil le jour J (agents, scan QR, app mobile), export PDF.

Principe d'architecture (à valider) : les événements des clients vivent dans
**une organisation interne « de production »** exploitée par l'équipe → tout
l'outillage existant sert sans réécriture ; le portail et le suivi publics
s'y branchent.

| # | Étape | Détail | Statut |
|---|---|---|:--:|
| 2.1 | **Numéro WhatsApp réservé à l'équipe** | Une seule session WhatsApp sert toute la plateforme ; jusqu'ici **n'importe quelle organisation** voyait le QR de liaison (la première à le scanner devenait l'expéditeur de tous). → Le QR n'est remis **qu'au super-admin**, quel que soit l'écran ; page **WhatsApp** dans l'espace plateforme (liaison, état, **changement de numéro**) ; les organisations ne voient plus que l'état (« géré par l'équipe Signiq »). | ✅ |
| 2.2 | **Envoi en arrière-plan** | L'envoi en masse tourne dans la requête web (≈ 1 h pour 300 invités). → File d'attente (job) avec suivi de progression ; nécessite le worker en prod. | ⬜ |
| 2.3 | **Portail public « demande d'invitations »** | Le couple décrit son événement (type, date, lieu, nombre d'invités, contact) → ticket + accusé + page de suivi, comme les cartes. | ⬜ |
| 2.4 | **Demande → événement** | L'opérateur transforme la demande en événement pré-rempli dans l'organisation de production. | ⬜ |
| 2.5 | **Suivi du couple** | Lien public : invitations envoyées, confirmés / déclinés / en attente, sans compte. | ⬜ |
| 2.6 | **Relances** | Invités sans réponse relancés ; couple informé des étapes. | ⬜ |

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
