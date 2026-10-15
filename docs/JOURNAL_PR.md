# Journal des Pull Requests — Détachement en produits

Registre des PR liées à l'initiative de détachement (voir
`docs/ROADMAP_DETACHEMENT.md`). Une ligne par PR, la plus récente en haut.

Statuts : 🟩 mergée · 🟦 ouverte · ⬜ brouillon

| PR | Produit · Étape | Titre | Statut | Commit / SHA |
|---|---|---|:--:|---|
| [#76](https://github.com/eternel09/respect/pull/76) | Socle · équipe | Comptes : changer son mot de passe (imposé après mot de passe temporaire), mot de passe oublié par e-mail, désactivation, dernière connexion ; file : recherche, « Mes demandes » / « Non attribuées », attribution à un collègue ; `FRONTEND_URL` + SMTP transmis au backend | 🟦 | `feat(team): real account management + team tools on the request queue` |
| [#75](https://github.com/eternel09/respect/pull/75) | Présence · 1.7 (retouche) | Liste du personnel : colonnes **reconnues automatiquement** (plus de choix manuel) ; détection renforcée (titre au-dessus, Nom/Postnom/Prénom, nom complet, anglais, CSV « ; » / Windows-1252, entêtes répétées) | 🟩 | (mergée) |
| [#74](https://github.com/eternel09/respect/pull/74) | Présence · 1.7 (retouche) | Portail : retrait du champ « Votre personnel s'appelle » ; libellés neutres (« personnel ») ; terme fixé par l'équipe à la conversion (« Agents » par défaut) | 🟩 | (mergée) |
| [#73](https://github.com/eternel09/respect/pull/73) | Présence · 1.7 | Liste du personnel sur le portail public (Excel/CSV, vocabulaire agents/employés) + **conversion de la demande en client** : organisation + admin créés, personnel importé, cartes PDF depuis la demande ; vocabulaire appliqué au tableau de bord, aux présences et au réseau | 🟩 | (mergée) |
| [#72](https://github.com/eternel09/respect/pull/72) | Invitations · 2.1 | Numéro WhatsApp réservé à l'équipe : QR au seul super-admin, page WhatsApp plateforme, changement de numéro ; feuille de route du Produit 2 ; **correctif** : un jeton expiré ne renvoie plus les pages publiques (portail cartes, suivi…) vers la connexion | 🟩 | (mergée) |
| [#71](https://github.com/eternel09/respect/pull/71) | Présence · tests E2E | Correctifs issus du test de bout en bout du Produit 1 : limiteurs de débit isolés (connexion bloquée par le trafic public), n° de ticket dans l'export CSV, bon de livraison allégé, équipe prévenue des demandes in-app, fiche agent lisible | 🟩 | (mergée) |
| [#70](https://github.com/eternel09/respect/pull/70) | Présence · 1.2e | Consolidation du service de cartes : notification client à chaque avancement, tableau de bord, bon de livraison PDF, relance quotidienne | 🟩 | (mergée) |
| [#69](https://github.com/eternel09/respect/pull/69) | Présence · 1.5 | Vocabulaire du membre configurable (membre / agent / employé) appliqué au back-office | 🟩 | (mergée) |
| [#68](https://github.com/eternel09/respect/pull/68) | Présence · 1.2d | Numéro de ticket + suivi public (accusé e-mail, page `/suivi/{token}`) | 🟩 | (mergée) |
| [#67](https://github.com/eternel09/respect/pull/67) | Présence · 1.3 | Champs entreprise du membre (fonction, service, matricule) + logo client uniquement sur les cartes | 🟩 | (mergée) |
| [#66](https://github.com/eternel09/respect/pull/66) | Présence · 1.2 → 1.2c | Livraison des cartes : impression (planche A4 / 1 par page CR80), **service opéré** (portail public sans compte + file multi-canal, prise en charge & affectation), **suivi** (notification e-mail équipe, historique + notes, export CSV) + sécurité + équipe interne | 🟩 | `feat(presence): print-ready cards` … (mergée) |
| [#65](https://github.com/eternel09/respect/pull/65) | Présence · 1.1 | Carte de service : design uploadable | 🟩 | `feat(presence): uploadable service-card design` |

> Note : les PR antérieures à cette initiative (billetterie, séparation par type
> d'événement, sécurité…) ne sont pas listées ici ; ce journal démarre au
> détachement des produits.
