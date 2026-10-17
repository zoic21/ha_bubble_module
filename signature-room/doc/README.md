# Signature Room

Version **1.3.1**. ID YAML : **`signature_room`**. [Distribution complète à importer](../dist/signature-room.yaml).

Résumés des pièces : température, humidité, badge et commandes réparties en colonnes.

## Installation et exemple

Importer la distribution dans **Modules** de l’éditeur Bubble, puis sélectionner **Signature Room**. Les réglages sont en français. Les options restent directement sous `signature_room` ; il n’y a pas de sélecteur `layout`. Remplacer les entités de l’exemple par celles de votre installation.

```yaml
type: custom:bubble-card
card_type: button
button_type: name
name: Séjour
icon: mdi:sofa
card_layout: large
rows: 3
show_state: false
sub_button:
  main:
    - entity: sensor.living_room_temperature
      css_class: room-temperature
      show_state: true
      show_icon: false
    - entity: sensor.living_room_humidity
      css_class: room-humidity
      show_state: true
      show_icon: true
    - entity: light.living_room
      css_class: room-control-1
      tap_action:
        action: toggle
modules:
  - signature_room
signature_room:
  room_control_columns: 4
```

## Pièce illustrée

```yaml
signature_room:
  room_mode: illustrated
  illustration:
    image: /local/illustrations/rooms-day-v1.png?v=1
    image_light: /local/illustrations/rooms-day-v1.png?v=1
    image_dark: /local/illustrations/rooms-night-v1.png?v=1
    columns: 4
    rows: 5
    index: 0
    offset_x: 7
    offset_y: 17.58
```

La variante illustrée place le nom et la température à gauche, le dessin à droite et les commandes natives en bas. Sa hauteur de base est de **148 px**, soit 28 px de moins que la première version illustrée, puis augmente de 48 px par rangée de commandes supplémentaire. Jardin conserve ses deux rangées dans **196 px**. Dans les grilles Sections Home Assistant, utiliser `grid_options.rows: auto` pour que le conteneur suive cette hauteur. Ne pas imposer de hauteur ou ajouter du CSS dans la carte.

La variable de thème **`signature-illustration-size: 80px`** définit la taille cible des dessins pour Room et Square. Sans thème, la même valeur de 80 px est utilisée. Les petites cartes réduisent le dessin pour préserver les textes ; une taille demandée supérieure à 80 px augmente la hauteur pour garder les commandes dégagées. Le changement suit le thème en CSS, sans reconstruire le module. Voir le [thème](../../themes/README.md#shared-module-variables).

L’humidité et l’icône du titre sont masquées par le module ; conserver leurs configurations pour pouvoir revenir au mode classique. Le badge d’état reste en haut à droite. `icon_border_color` entoure le dessin au lieu de l’icône masquée. `border_color` conserve le contour d’alerte et l’ombre Signature. L’image est centrée verticalement entre le haut intérieur de la carte et le séparateur des actions, sur une ou plusieurs rangées. Sans commandes visibles et sans secondaire, elle est centrée dans la carte entière. Le secondaire éventuel conserve son espace à pleine largeur et son bloc d’illustration réservé. Les libellés des commandes nommées restent à droite de leur icône, dans la colonne souple de la grille, quel que soit leur ordre dans le HTML natif. Les noms de Jardin restent complets dès 288 px ; leurs actions restent celles de Bubble.

L’objet `illustration` accepte `image` (URL locale/HTTPS), `image_light` et `image_dark` facultatives sélectionnées selon le mode effectif Home Assistant, ainsi que `columns`, `rows` et `index` (à partir de 0). Les URL et l’index peuvent utiliser Jinja via le moteur Bubble. Une URL ou une case non valide masque la décoration ; aucun code, image embarquée, écouteur ou abonnement supplémentaire n’est chargé. Les dessins sont à installer séparément dans `config/www/illustrations/`. Le même atlas peut servir aux vingt pièces avec des index différents.

Pour conserver un contour de contraste sur une lampe Hue sans CSS, ajouter `icon_outline_color` dans son entrée `sub_button_styles` : couleur CSS, transparente ou Jinja ; le contour de glyphe fait 1,5 px et ne modifie pas la couleur RGB configurée. Les couleurs d’activité et les commandes restent natives.

### Badges à côté du nom

En mode illustré, `sub_button_styles.<classe-ou-numéro>.type: badge` place un
sous-bouton natif iconique immédiatement après le texte du nom, à gauche de
l’illustration. Les icônes de 14 px partagent une capsule neutre haute de
20 px, centrée verticalement sur le texte et située à 6 px du nom. L’ordre
reste celui des sous-boutons natifs. Une capsule mesure 44 px avec deux icônes
et 24 px avec une seule ; l’écart visible entre icônes est de 6 px.
Elle s’ajuste immédiatement aux classes `.hidden` ou à l’attribut `[hidden]`
de Bubble, puis disparaît quand tous les badges sont masqués.

```yaml
sub_button:
  main:
    # Conserver les mesures et commandes existantes dans cette liste.
    - entity: binary_sensor.living_room_motion
      css_class: room-motion
      icon: mdi:walk
      show_name: false
      show_state: false
      show_background: false
      state_background: false
      visibility:
        - condition: state
          entity: binary_sensor.living_room_motion
          state: "on"
      tap_action:
        action: more-info
    - entity: binary_sensor.living_room_window
      css_class: room-status
      icon: mdi:window-open
      show_name: false
      show_state: false
      show_background: false
      state_background: false
      visibility:
        - condition: state
          entity: binary_sensor.living_room_window
          state: "on"
      tap_action:
        action: more-info
signature_room:
  room_mode: illustrated
  sub_button_styles:
    room-motion:
      type: badge
      color: amber
    room-status:
      type: badge
      color: blue
```

Le fond commun réutilise `signature-control-background`, avec un repli à 5 %
du texte primaire dans la surface neutre du thème. Les icônes sont colorées
sans pastille individuelle par défaut. `color` et `background` conservent
leurs overrides par sous-bouton, y compris Jinja ; `background` peut donc
explicitement rétablir un fond individuel. La
visibilité, l’icône, l’entité et les actions sont celles du sous-bouton Bubble ;
les nœuds natifs gardent leurs handlers. Deux conteneurs de présentation
réutilisables regroupent le nom et les badges en flex, sans lecture de dimensions,
observateur, écouteur ou abonnement supplémentaire. Le retrait de l’option, le
retour au mode classique et le teardown restaurent leurs emplacements natifs.
Les boutons nommés, les états textuels, les types spécialisés et les commandes
`room-control-N` / `room-climate` ne sont pas transformés.

L’apparition d’un badge ne modifie ni la taille ni le centrage de l’illustration,
y compris sur mobile. Le titre et la capsule partagent l’espace à gauche du
dessin, avec un nom limité à deux lignes. La réduction responsive ordinaire
et la taille du thème restent applicables ; aucune réduction supplémentaire
à 48 px n’est liée aux badges. La carte conserve sa hauteur, sa température
et ses commandes.
Le mode classique et les badges existants sans `type: badge` restent inchangés.

## Compatibilité et comportement

### Commandes illustrées avec libellé

En mode illustré, `sub_button_styles.<classe-ou-numéro>.type: command`
empile l’icône et le nom d’un sous-bouton natif `default`, nommé et classé
`room-control-N`. Les colonnes et les cibles de 44 px restent celles de Room ;
la carte conserve sa hauteur de 148 px. Le retour de pression suit le rayon
du contrôle. Sans cette option, les commandes des pièces restent inchangées.

```yaml
signature_room:
  room_mode: illustrated
  room_state_as_value: true
  room_control_columns: 3
  sub_button_styles:
    room-control-1:
      type: command
      color: blue
      active: "{{ is_state(entity, 'disarmed') }}"
      disabled: "{{ states(entity) in ['disarmed', 'unknown', 'unavailable'] }}"
```

Configurer l’entité, `show_name: true`, le libellé et les actions dans le
sous-bouton Bubble. `active` et `disabled` acceptent des booléens ou Jinja.
Le mode actif utilise un fond doux ; `color` et `background` explicites restent
prioritaires. Une commande désactivée non active est atténuée. Les commandes
restent visibles et à leur place ; leur visibilité native reste prioritaire.

`disabled` bloque pointeur, toucher, clic clavier et événement `hass-action`
sur le nœud natif. Ce dernier contrôle empêche aussi un geste commencé avant
la désactivation d’envoyer une action mise en cache par Bubble. Les services,
cibles, jeux de données et handlers Bubble ne sont ni réécrits ni remplacés.
Un seul garde délégué local est installé quand des commandes sont présentes ;
aucun timer, observateur ou abonnement n’est ajouté. Les attributs ARIA et le
garde sont restaurés au retrait de l’option, changement de mode et teardown.
Une expression `disabled` en attente ou invalide désactive la commande ; seule
une sortie explicite `false` la réactive. Sans expression, l’action reste native.

`room_state_as_value: true` affiche l’état principal avec le rôle de mesure
(28 px et unité de 13 px par défaut), ou 22 px pour un état sans unité.
Cette option réutilise les nœuds, formatages et actions de valeur existants ;
les états habituels des pièces restent à 17 px sans l’option.

`room_show_divider: false` retire uniquement le trait décoratif au-dessus des
commandes. `room_state_centered: true` centre l’état entre le bas réel du nom
(une ou deux lignes) et le haut des cibles de commandes. Ce centrage concerne
le mode illustré sans secondaire, avec état et commandes visibles ; les autres
cas gardent leur placement habituel. L’illustration, la hauteur et les cibles
de 44 px ne bougent pas. Les deux options sont indépendantes et désactivées
par défaut ; leur retrait restaure le rendu existant, sans nouveau nœud,
mesure JavaScript, écouteur ou observateur.

Cartes `button`, hors boutons `switch` et `slider`. Une carte pièce commence à 156 px et peut grandir avec le texte et les rangées de commandes. Une configuration incompatible ne reçoit aucun style de ce module.

Les classes natives sont `room-temperature`, `room-humidity`, `room-status`, `room-control-N` et `room-climate`. `room_control_columns` va de 1 à 6. `room_auto_colors: false` désactive les couleurs automatiques. `room_measures_position: header` place les mesures dans l’en-tête quand l’état principal et le secondaire ne prennent pas cette place. Un état principal affiché masque les mesures redondantes.

Les valeurs conservent le format numérique Home Assistant et leur unité. `state` personnalise l’état affiché avec du texte ou Jinja. `secondary` accepte du texte, une entité directe ou Jinja ; l’entité directe fournit l’unité. La première référence d’entité détectée dans un template définit la cible des détails, sans analyser quelle branche Jinja est affichée. `secondary_bold: true` autorise `**texte**`, sans interpréter du HTML.

Les sous-boutons gardent les entités, conditions et actions Bubble. `sub_button_styles` est un objet indexé par classe CSS ou numéro natif. Les switches visuels sont disponibles en square/compact, avec des actions toggle compatibles ou des actions lock/unlock explicites ; ils ne créent pas de commande supplémentaire.

### Cadrage d’une planche imparfaite

Les nombres ou templates Jinja **`illustration.offset_x`** et **`offset_y`** déplacent la fenêtre de lecture dans la planche. Unités : pourcentage de la largeur/hauteur **d’une case source**, de −50 à 50 ; 0 par défaut. Une valeur positive lit plus à droite/en bas ; une valeur négative plus à gauche/en haut. La taille de la case, le zoom et la boîte affichée restent identiques. L’axe concerné est ignoré lorsque la planche n’y contient qu’une case ; une valeur invalide revient à 0. Ce cadrage est commun à Square et Room et s’applique aux deux variantes de thème.

Exemple pour la chambre d’Émilie, sur la grille 4 × 5 existante : `offset_x: 7` et `offset_y: 20.97` dans l’objet `illustration`. Le module déplace le cadrage de 19,6 px à droite et 58,8 px vers le bas dans les PNG de 1 122 × 1 402 px, sans redessiner les illustrations. Ce cadrage tient aussi compte des marges transparentes pour centrer la silhouette visible ; vérifier les cases voisines et les deux variantes de thème. Ne pas ajouter de CSS dans la carte.

## Options

| Option | Défaut | Usage |
|---|---|---|
| `color` | `blue` | Couleur de la palette, couleur CSS ou template Jinja. Valeurs : `blue`, `light-blue`, `teal`, `cyan`, `green`, `orange`, `amber`, `yellow`, `red`, `pink`, `indigo`, `purple`, `grey`. |
| `secondary` | Aucun | Texte secondaire (entité, texte ou template) |
| `state` | Aucun | Valeur principale personnalisée (texte ou template) |
| `room_state_as_value` | `false` | État principal au format de mesure ; état textuel de 22 px. |
| `room_state_centered` | `false` | Centre l’état sous le nom et au-dessus des commandes visibles, en mode illustré sans secondaire. |
| `room_show_divider` | `true` | `false` masque seulement le séparateur décoratif des commandes. |
| `secondary_bold` | `false` | Interpréter **texte** en gras dans le texte secondaire |
| `multiline` | `false` | Autoriser les textes sur plusieurs lignes |
| `sub_button_styles` | `{}` | Objet YAML indexé par css_class ou numéro de sous-bouton ; `type: badge` place un bouton iconique près du nom en mode illustré. |
| `room_mode` | `classic` | Présentation `classic` ou `illustrated` ; le mode classique existant reste inchangé. |
| `illustration` | `{}` | Image externe, variantes HA, grille de sprites et index ; active dans le mode illustré. |
| `room_auto_colors` | `true` | true par défaut ; false désactive les couleurs automatiques. |
| `room_control_columns` | `4` | 4 colonnes par défaut, de 1 à 6. |
| `room_measures_position` | `content` | Position des mesures Valeurs : `content`, `header`. |
| `color_background` | `false` | false par défaut. Saisir true/false ou un template Jinja entre guillemets. |
| `icon_color` | Aucun | Couleur personnalisée de l’icône |
| `icon_opacity` | Comportement natif / aucun | Opacité native par défaut. Saisir de 0 à 1, null ou un template Jinja entre guillemets. |
| `border_color` | Aucun | Couleur de la bordure de la carte |
| `icon_border_color` | Aucun | Couleur de la bordure du fond de l’icône |

## Thème et coexistence

Le [thème Signature](../../themes/README.md) centralise l’apparence via les variables `--signature-*`. Le navigateur résout ces variables, y compris dans le CSS mis en cache, sans lecture JavaScript du thème. Les valeurs de secours reproduisent le rendu actuel en l’absence du thème. Les grilles, les placements et les comportements appartiennent au module. Aucune dépendance entre modules n’est à installer et aucun `card-mod` n’est nécessaire.

Utiliser **un seul module de présentation par carte**. `alert_manager` peut être ajouté après celui-ci ; les alertes gardent leurs couleurs prioritaires. Le lecteur multimédia utilise `signature_compact`.

Pour migrer : remplacer `signature` dans `modules` par `signature_room`, déplacer les options sous cette nouvelle clé et retirer `layout`. Conserver les entités, actions et sous-boutons natifs. Voir le [guide de migration](../../signature-shared/doc/MIGRATION.md). Importer un module ne migre pas les dashboards existants.

## Maintenance et validation

Les styles communs sont définis dans [shared/src/styles](../../shared/src/styles/README.md) et inclus au build. Les dispositions restent propres au module ; la distribution demeure autonome et minifiée.

Modifier les fichiers `src` du module et les [fonctions partagées](../../signature-shared/README.md), puis exécuter `npm run build:modules` et `npm run check:modules`. Les distributions sont autonomes et ne chargent aucun fichier partagé dans Home Assistant. Voir le [guide de build commun](../../shared/README.md). Respecter le [contrat de style](../../STYLE_GUIDE.md).

Le formulaire réutilise le pont de Signature et les helpers d’objet Bubble ; la référence actuelle est Bubble Card 3.4.1. Les contrôles automatiques comparent les distributions à Signature, leurs actions et leur nettoyage, ainsi que les styles calculés dans des fixtures Chromium. Ils ne constituent pas une validation dans Home Assistant ou Safari/iOS.

## Notes de version

### 1.3.1 — 17 octobre 2026

- Options `room_show_divider: false` et `room_state_centered: true` pour alléger
  une carte illustrée et centrer son statut entre le titre réel et les commandes.
- Géométrie du dessin, hauteur, commandes et cartes existantes préservées.
  Retrait réversible, conditions natives prioritaires, aucun runtime ajouté.
- Régressions Chromium clair/sombre avec/sans thème, 288–600 px, nom sur une
  ou deux lignes, retrait des options et masquage des commandes.

### 1.3.0 — 17 octobre 2026

- Commandes illustrées facultatives `type: command`, icône au-dessus du libellé,
  trois emplacements stables, cibles de 44 px et hauteur Room conservées.
- `active` et `disabled` pilotables par Jinja ; garde local des actions natives,
  y compris les commandes mises en cache ou les gestes en cours, sans modifier
  les services/cibles. Nettoyage des attributs et du garde au retrait/teardown.
- `room_state_as_value` pour les états d’alarme et mesures d’équipement ;
  les cartes Room existantes gardent leur présentation par défaut.
- Contrôles sur fixtures Chromium en clair/sombre avec/sans thème,
  désarmement/absence/nuit/transitions/indisponibilité, clavier et retrait.
  Aucun essai dans Home Assistant réel ou Safari/iOS.

### 1.2.3 — 17 octobre 2026

- Suppression de la limite de 48 px et du déplacement de l’illustration lorsqu’un badge est visible sur une carte étroite. Taille et centrage suivent désormais les mêmes règles avec zéro, un ou deux badges.
- Le titre et la capsule gardent l’espace réservé à gauche du dessin ; géométrie des commandes et hauteur de carte conservées. Régression Chromium sur les changements de visibilité sans nouvelle exécution du module.

### 1.2.2 — 17 octobre 2026

- Les icônes d’état partagent une capsule neutre de 20 px de haut après le nom, sans fond coloré individuel par défaut. Surface de contrôle commune et thème suivis en CSS.
- Largeur adaptée aux badges visibles : 44 px pour deux, 24 px pour un, disparition complète sans état actif. Même largeur totale à deux icônes que les pastilles précédentes.
- Réutilisation du groupe et des boutons natifs existants, sans nouveau nœud, écouteur ou observateur ; configuration et couleurs des cartes conservées.

### 1.2.1 — 17 octobre 2026

- Pastilles de 20 px, immédiatement après le texte du nom avec 6 px d’écart, centrées verticalement ; le placement suit aussi un changement de nom sans réexécuter le module.
- Regroupement flex des nœuds natifs dans deux conteneurs réutilisables ; ordre, visibilité et handlers conservés, emplacements restaurés au retrait ou au teardown. Aucun CSS à ajouter aux cartes.
- Dessin dégagé des titres longs sur les cartes étroites, sans modifier la hauteur ou les commandes.

### 1.2.0 — 17 octobre 2026

- Badges natifs multiples à côté du nom en mode illustré, via `sub_button_styles.<classe>.type: badge`, avec couleur et fond doux configurables.
- Les badges masqués libèrent leur place en CSS, sans exécution du module ; titre et dessin s’adaptent aux cartes étroites sans changer la hauteur ni les commandes.
- Aucun CSS requis dans les cartes, nouveau nœud, écouteur ou observateur. Modes classique et illustré sans cette option conservés.

### 1.1.6 — 16 octobre 2026

- CSS des badges actifs émis uniquement lorsqu’un sous-bouton est configuré ; le cache suit aussi leur ajout/retrait.
- Sélecteurs de masquage et de texte multiligne regroupés à spécificité identique ; taille d’unité commune redondante retirée, chaque présentation gardant sa taille dédiée.

### 1.1.5 — 16 octobre 2026

- Le helper d’illustration partagé accepte aussi Jinja dans `offset_x` / `offset_y`, afin d’ajuster le cadrage avec un index dynamique. Bornes −50/+50 et repli 0 conservés ; aucun changement des cadrages numériques existants ni des dimensions Room.

### 1.1.4 — 16 octobre 2026

- Illustration centrée verticalement au-dessus du séparateur natif, avec adaptation à la taille responsive et aux rangées de commandes. Sans commandes visibles, centrage dans la carte entière ; le secondaire garde son bloc réservé.
- Placement uniquement CSS, sans déplacer les textes, mesures, commandes ou badges ni changer les hauteurs et la taille cible des dessins.
- Contrôle des coordonnées réelles des pseudo-éléments dans Chromium, y compris après changement de taille et masquage des commandes. Les atlas aux marges inégales peuvent ajuster leur cadrage via `illustration.offset_y`.

### 1.1.3 — 16 octobre 2026

- Correction des noms tronqués des commandes de Jardin : placement explicite de l’icône et du libellé dans leurs colonnes, compatible avec le HTML natif Bubble qui place le texte avant l’icône.
- Le libellé dispose de la largeur restante au lieu des seuls 26/30 px de l’icône. Aucun changement de hauteur, de taille de dessin, d’entité ou d’action ; cibles natives conservées.
- Test navigateur corrigé pour reproduire l’ordre natif ; les deux ordres restent couverts en clair/sombre, avec/sans thème, de 288 à 770 px, avec clics sur le texte et l’icône.

### 1.1.2 — 16 octobre 2026

- Cadrage facultatif `illustration.offset_x` / `offset_y` pour exclure les morceaux des cases voisines d’un atlas imparfait, sans changer la taille de l’illustration ni son zoom.
- Même calcul partagé Room/Square, relu hors cache structurel ; les planches régulières gardent exactement leurs coordonnées par défaut. Aucun nœud, observateur, abonnement ou CSS dans les cartes ajouté.

### 1.1.1 — 16 octobre 2026

- Illustration alignée sur la taille cible de Square via `signature-illustration-size` : 80 px par défaut au lieu de 64 px, adaptation aux cartes étroites.
- Nom et température à gauche du dessin ; hauteur de base ramenée de 176 à 148 px, sans réduire les commandes natives. Jardin à 196 px pour deux rangées.
- Variable héritée en CSS, compatible avec les caches de présentation et les variantes jour/nuit existantes. Un texte secondaire ou une illustration agrandie adapte la hauteur.

### 1.1.0 — 16 octobre 2026

- Mode `room_mode: illustrated`, hauteur 176 px, nom/température et illustration ; humidité et icône principale masquées.
- Configuration d’illustration partagée avec Square au build : URL, sprites, index et variantes HA, sans dépendance entre distributions.
- Badges, anneaux d’alerte/de présence, couleurs RGB, libellés et commandes conservés sans CSS local. Mode classique par défaut inchangé.
- Vérifications fonctionnelles et sur fixtures Chromium ; installation Home Assistant et Safari/iOS à confirmer.


### 1.0.10 — 8 octobre 2026

- Réduit la cible des mesures dans le contenu de 44 à 36 px : le retour de survol reste au-dessus du séparateur, en conservant la position des textes et leurs marges horizontales.
- Mesures empilées d’en-tête : cibles de 26/18 px pour garder un écart au séparateur, même avec deux rangées de commandes.
- Les régressions vérifient désormais la distance au séparateur réel via son pseudo-élément, et pas seulement l’absence de recouvrement avec les autres commandes.
- Tests sur fixtures Chromium clair/sombre, avec/sans thème ; aucun essai Home Assistant réel ou Safari/iOS.

### 1.0.9 — 8 octobre 2026

- Mesures température/humidité avec le dégagement horizontal de 8 px des sous-boutons Compact et une cible de 44 px dans le contenu. Les valeurs gardent leurs ancrages de 12 px et leur alignement vertical. À 180 px de largeur intérieure ou moins, le dégagement passe à 4 px comme les petites valeurs Compact sans fond ; la température réserve la place de l’humidité pour éviter le recouvrement des cibles.
- Mesures empilées dans l’en-tête : surfaces distinctes de 30/24 px sans recouvrement ; température et alignement droit conservés, humidité espacée sous la température.
- Le survol et les actions restent ceux des sous-boutons Bubble. Les masquages, unités, couleurs et commandes restent inchangés.
- Vérifications sur fixtures Chromium clair/sombre, avec/sans thème ; aucun essai Home Assistant réel ou Safari/iOS.

### 1.0.8 — 5 octobre 2026

- Couche de survol native ancrée sur les quatre bords, y compris avec marges, grille et hauteur automatique.
- Les boîtes de contenu laissent passer le pointeur ; icône, valeurs et commandes gardent leurs actions distinctes.
- Régression vérifiée sur fixtures Chromium en clair/sombre, avec/sans thème ; aucune nouvelle écoute ni modification de configuration.

### 1.0.7 — 5 octobre 2026

- Invalidation du runtime et des caches lors du remplacement d’une distribution, y compris depuis une version sans marqueur interne. La version est injectée au build depuis `src/module.yaml`.
- L’ancien observateur de température est arrêté et le texte natif est restauré avant la création du nouveau rendu.
- Les mises à jour ordinaires réutilisent les caches et continuent à lire les états et templates ; les variables de thème restent dans le CSS.

### 1.0.6 — 5 octobre 2026

- Définitions des champs communs assemblées au build depuis `shared/src/editor-fields/presentation.yaml`.
- Libellés, choix, groupes, valeurs par défaut, ordre et conditions de visibilité conservés ; les descriptions particulières restent locales. Aucun changement de configuration ni de code exécuté dans les cartes.

- **1.0.4** : Règles CSS communes assemblées au build depuis `shared/src/styles` ; styles calculés, configuration et actions conservés.

- **1.0.3** : Distribution minifiée au build : variables JavaScript raccourcies, CSS et métadonnées YAML compactés ; configuration et comportement conservés.

- **1.0.2** : Build depuis les sources du module et les fonctions communes ; distribution autonome, configuration et rendu conservés.

### 1.0.2 — 5 octobre 2026

- Retrait du module historique `signature` ; métadonnées et guides actualisés, rendu et options inchangés.

## Notes de version

### 1.0.5 — 5 October 2026

- Mutualise le socle de l’éditeur, la palette et la validation des couleurs, les sources de templates et les helpers de locale/précision.
- Conserve les options YAML, les actions et la géométrie propres à cette présentation ; la précision native explicite reste prioritaire.
