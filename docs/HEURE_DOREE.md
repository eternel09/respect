# Modèle d'invitation « Heure dorée »

Ce document décrit le modèle d'invitation de mariage électronique « Heure dorée » de Signiq.
- **Direction** : Régence européenne, palais français, luxe discret.
- **Format** : pensé pour mobile (390–430 px), centré sur ordinateur.
- **Accès** : chaque invité ouvre l'invitation par **son lien personnel** (`/confirmer/{token}`), le même lien que pour les autres modèles. Ce lien donne aussi le QR d'accès et la réponse nominative.
- **Contenu** : tout vient d'**un seul objet de configuration**.

## Arborescence

```
frontend/
├── public/invitations/
│   ├── CREDITS.md                      # sources et licences des visuels
│   ├── florals/rose-*.webp             # roses de Redouté détourées (CC0)
│   ├── textures/gold-leaf.webp         # feuille d'or (dorures)
│   ├── textures/paper-ivory.webp       # papier coton ivoire
│   └── heure-doree/                    # ornements et illustrations (remplaçables)
│       ├── hero-illustration.webp
│       ├── column-left.webp  column-right.webp
│       ├── valance.webp  curtain-left.webp  curtain-right.webp
│       ├── frame-arch.webp  frame-corner.webp  chandelier.webp
│       ├── divider.webp  rsvp-ornament.webp  guests-frieze.webp
│       └── og-cover.jpg                # aperçu WhatsApp par défaut
├── src/components/invitation/
│   ├── HeureDoree.jsx                  # pont : événement Signiq → configuration → modèle
│   └── heure-doree/
│       ├── HeureDoreeInvitation.jsx    # composant racine (langue, musique, ouverture)
│       ├── Envelope.jsx                # 1. enveloppe + sceau qui se fissure
│       ├── Hero.jsx                    # 2. prénoms dorés, date, illustration
│       ├── Quote.jsx                   # 3. citation
│       ├── Countdown.jsx               # 4. compte à rebours entre colonnes
│       ├── Gallery.jsx                 # 5. carrousel + visionneuse + cantonnière
│       ├── Story.jsx                   # 6. notre histoire sous rideaux
│       ├── Schedule.jsx                # 7. déroulé de la journée
│       ├── EventDetails.jsx            # 8. cadre baroque, lustre, .ics, itinéraire
│       ├── Rsvp.jsx                    # 9. formulaire de réponse
│       ├── AccessPass.jsx              #    QR d'accès (lien personnel)
│       ├── Footer.jsx                  # 10. monogramme, signature
│       ├── MusicToggle.jsx  LanguageSwitch.jsx  GoldDust.jsx  WaxSeal.jsx
│       ├── config.js                   # schéma, valeurs par défaut, dates, .ics
│       ├── fromOccasion.js             # configuration depuis un événement Signiq
│       ├── i18n.js                     # FR / EN / Lingala
│       ├── hooks.js                    # apparition au défilement, horloge, mouvement réduit
│       ├── heure-doree.css             # palette, typographies, animations
│       └── invitation.config.example.json
└── nginx.conf                          # robots d'aperçu → balises Open Graph

backend/
├── app/Http/Controllers/Api/RsvpController.php   # GET/POST /api/rsvp/{token}, /calendar.ics, /og
└── database/migrations/2026_11_26_090000_add_rsvp_details_to_guests.php
```

## La configuration

Un exemple complet se trouve dans `frontend/src/components/invitation/heure-doree/invitation.config.example.json`.

Tout texte peut être **une chaîne** ou **un objet par langue** : `{ "fr": "…", "en": "…", "ln": "…" }`. Si une langue manque, le français prend le relais.

| Clé | Rôle |
|---|---|
| `kind` | `wedding` (« Nous nous marions », « Message pour les mariés ») ou `event` |
| `lang`, `languages` | langue initiale ; langues proposées dans le sélecteur |
| `title`, `couple.groom`, `couple.bride`, `couple.monogram` | prénoms (affichés dans cet ordre) et initiales du sceau |
| `event.date` (AAAA-MM-JJ), `event.start` / `event.end` (HH:MM) | date et horaires (« Cérémonie à 16 h – fin à 1 h ») ; le compte à rebours part de `date` + `start` |
| `event.ceremony`, `event.venue`, `event.address` | libellé de la cérémonie, lieu (affiché en script), adresse |
| `event.mapsUrl`, `event.calendarUrl` | itinéraire ; agenda. Si `calendarUrl` est vide, le fichier `.ics` est généré dans le navigateur |
| `event.dress` | tenue (titre et texte), facultatif |
| `texts.quote`, `texts.quoteBy`, `texts.rsvpIntro`, `texts.closing` | citation, sa source, mot de réponse, mot de la fin |
| `hero.image`, `hero.alt` | illustration ou photo d'ouverture |
| `gallery[]` | `{ src, alt }`, photos du carrousel |
| `story[]` | `{ year, title, text }` |
| `schedule[]` | `{ time, title, text }` |
| `rsvp.endpoint` | URL de réponse (POST JSON), par défaut `/api/rsvp/{token}` |
| `rsvp.deadline`, `rsvp.maxGuests` | date limite ; nombre de places par invitation |
| `rsvp.guest` | `{ name, email, phone, status, partySize, message }`, pré-remplissage |
| `pass` | `{ qr, name, label }`, QR d'accès (lien personnel) |
| `music.src`, `video.src` | musique d'ambiance, vidéo du couple (facultatives) |
| `assets.*` | remplace n'importe quel visuel (voir la liste ci-dessous) |
| `app.name`, `app.url` | mention « Créé avec … » |

**Requête de réponse** (`POST rsvp.endpoint`, JSON) :

```json
{ "status": "confirm", "name": "Marie Kalala", "email": "marie@exemple.cd", "phone": "",
  "party_size": 2, "message": "Tous nos vœux !", "lang": "fr" }
```

Le backend la valide :
- `party_size` ne dépasse pas `party_max` ;
- un moyen de contact est obligatoire (e-mail ou téléphone), sauf si l'organisateur connaît déjà le numéro de l'invité ;
- le numéro saisi par l'organisateur n'est jamais remplacé.

En cas d'erreur, le backend répond `422` avec `errors`, et le formulaire affiche le premier message.

### Dans Signiq

Le back-office remplit la configuration automatiquement (`fromOccasion.js`) :

| Champ de la configuration | Source dans Signiq |
|---|---|
| prénoms | nom de l'événement |
| date, heures, lieu | fiche de l'événement |
| citation, histoire, déroulé, tenue, mot de réponse, mot de la fin | éditeur de textes |
| date limite, places par invitation | éditeur de textes (nouveaux champs) |
| photos, musique | téléversement |
| QR, réponse, nombre de personnes, e-mail | invité du lien |

Dans la liste des invités, l'organisateur voit le nombre de personnes, l'e-mail et le mot laissé par chaque invité.

## Images à fournir

Les fichiers actuels sont des **visuels provisoires**, déjà dorés à la feuille. Pour les remplacer, il suffit de déposer un fichier du même nom ou de surcharger `assets` dans la configuration.

Formats attendus :
- WebP transparent (sauf mention contraire) ;
- dimensions ci-dessous, en 2× pour les écrans Retina ;
- moins de 150 Ko par fichier si possible.

| Fichier | Dimensions | Rôle |
|---|---|---|
| `hero-illustration.webp` | 1080 × 1620 (opaque) | Aquarelle : le couple de dos, main dans la main, marchant vers une fontaine baroque dans un jardin de palais à l'heure dorée. Remplacée par la photo de couverture si l'organisateur en téléverse une. |
| `column-left.webp` | 360 × 1400 | Colonne corinthienne dorée ornée de roses blanches, à gauche du compte à rebours |
| `column-right.webp` | 360 × 1400 | Colonne de droite (symétrique ou variante florale) |
| `valance.webp` | 1200 × 360 | Cantonnière de rideau doré drapé avec glands, entre la galerie et « Notre histoire » |
| `curtain-left.webp` | 300 × 1500 | Rideau doré drapé avec embrasse et gland, côté gauche de « Notre histoire » (étiré en hauteur) |
| `curtain-right.webp` | 300 × 1500 | Rideau côté droit |
| `frame-arch.webp` | 1000 × 420 | Fronton en arche du cadre baroque (sans le lustre) |
| `chandelier.webp` | 360 × 300 | Lustre en cristal suspendu sous l'arche ; il se balance (pivot en haut au centre) |
| `frame-corner.webp` | 160 × 160 | Volute d'angle bas du cadre (retournée pour le côté droit) |
| `divider.webp` | 600 × 48 | Filet doré autour de la citation |
| `rsvp-ornament.webp` | 240 × 140 | Petit ornement doré sous « RSVP » (couronne ou lustre) |
| `guests-frieze.webp` | 1200 × 360 | Frise aquarelle d'invités en tenues d'époque (robes Empire pastel, redingotes) |
| `og-cover.jpg` | 1200 × 630 (JPEG) | Image d'aperçu par défaut quand le lien est partagé (sinon, photo de couverture) |
| `../florals/rose-*.webp` | ≤ 1000 px | Roses de l'enveloppe (`assets.envelopeFloralTop` / `envelopeFloralBottom`) |
| `../textures/gold-leaf.webp` | 1024 × 1024, raccordable | Feuille d'or des titres dorés |
| `../textures/paper-ivory.webp` | 1024 × 1024, raccordable | Grain du papier ivoire |

## Comportement

**Enveloppe.** Au toucher, le sceau se fissure, le rabat pivote en 3D (`rotateX`, 0,8 s), la carte glisse vers le haut, puis un fondu laisse place à l'invitation. La musique démarre dans ce même geste.
- Une fois l'invitation ouverte, l'enveloppe ne réapparaît plus sur cet appareil.
- Le lien « Revoir l'ouverture » la réaffiche.

**Animations.**
- Chaque section apparaît au défilement (IntersectionObserver) : fondu et translation de 24 px, 700 ms, éléments décalés de 120 ms.
- Les rideaux s'écartent à l'entrée de « Notre histoire ».
- Le lustre se balance doucement.
- Un reflet passe sur les dorures.
- Une poussière d'or flotte en permanence, dessinée dans un canvas léger : environ 40 particules, en pause quand l'onglet est caché.

**Mouvement réduit.** Avec `prefers-reduced-motion`, tout est coupé : canvas, rideaux, reflets et transitions.

**Langues.** Le bouton rond en haut à droite propose FR, EN et Lingala, et le choix est mémorisé par invitation. La traduction lingala est à **faire relire par un locuteur natif**. Le navigateur ne connaissant pas la locale `ln`, les noms de mois et de jours lingala sont écrits en dur.

**Aperçu WhatsApp.** Les robots d'aperçu qui demandent `/confirmer/{token}` sont servis par `GET /api/rsvp/{token}/og` (règle nginx `link_preview_bot`).
- La page renvoyée contient les balises Open Graph : titre « Ana & Paul · Invitation au mariage », date, lieu, photo de couverture ou `og-cover.jpg`.
- Le nom de l'invité n'y figure jamais.

**Performance.**
- Images en WebP, chargées à la demande (`loading="lazy"`), sauf l'illustration d'ouverture.
- Mesuré sur iPhone simulé : **≈ 400 Ko** de médias et d'API pour la page entière, hors musique et JavaScript.
- Animations limitées à `transform` et `opacity`.

**Accessibilité.**
- Contrastes brun-gris sur ivoire.
- Attributs `alt` sur les images ; les décors sont en `aria-hidden`.
- Formulaire avec libellés, `aria-invalid` et messages reliés aux champs.
- Visionneuse au clavier (Échap, flèches).
- Focus visible.
