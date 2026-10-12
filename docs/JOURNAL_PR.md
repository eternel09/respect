# Journal des Pull Requests — Détachement en produits

Registre des PR liées à l'initiative de détachement (voir
`docs/ROADMAP_DETACHEMENT.md`). Une ligne par PR, la plus récente en haut.

Statuts : 🟩 mergée · 🟦 ouverte · ⬜ brouillon

| PR | Produit · Étape | Titre | Statut | Commit / SHA |
|---|---|---|:--:|---|
| [#71](https://github.com/eternel09/respect/pull/71) | Présence · tests E2E | Correctifs issus du test de bout en bout du Produit 1 : limiteurs de débit isolés (connexion bloquée par le trafic public), n° de ticket dans l'export CSV, bon de livraison allégé, équipe prévenue des demandes in-app, fiche agent lisible | 🟦 | `fix(cards): e2e test findings` |
| [#70](https://github.com/eternel09/respect/pull/70) | Présence · 1.2e | Consolidation du service de cartes : notification client à chaque avancement, tableau de bord, bon de livraison PDF, relance quotidienne | 🟩 | (mergée) |
| [#69](https://github.com/eternel09/respect/pull/69) | Présence · 1.5 | Vocabulaire du membre configurable (membre / agent / employé) appliqué au back-office | 🟩 | (mergée) |
| [#68](https://github.com/eternel09/respect/pull/68) | Présence · 1.2d | Numéro de ticket + suivi public (accusé e-mail, page `/suivi/{token}`) | 🟩 | (mergée) |
| [#67](https://github.com/eternel09/respect/pull/67) | Présence · 1.3 | Champs entreprise du membre (fonction, service, matricule) + logo client uniquement sur les cartes | 🟩 | (mergée) |
| [#66](https://github.com/eternel09/respect/pull/66) | Présence · 1.2 → 1.2c | Livraison des cartes : impression (planche A4 / 1 par page CR80), **service opéré** (portail public sans compte + file multi-canal, prise en charge & affectation), **suivi** (notification e-mail équipe, historique + notes, export CSV) + sécurité + équipe interne | 🟩 | `feat(presence): print-ready cards` … (mergée) |
| [#65](https://github.com/eternel09/respect/pull/65) | Présence · 1.1 | Carte de service : design uploadable | 🟩 | `feat(presence): uploadable service-card design` |

> Note : les PR antérieures à cette initiative (billetterie, séparation par type
> d'événement, sécurité…) ne sont pas listées ici ; ce journal démarre au
> détachement des produits.
