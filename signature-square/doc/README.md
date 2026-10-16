# Signature Square

Version **1.4.1**. ID YAML : **`signature_square`**. [Distribution complète à importer](../dist/signature-square.yaml).

Tuiles carrées avec valeur principale, unité et texte secondaire.

## Installation et exemple

Importer la distribution dans **Modules** de l’éditeur Bubble, puis sélectionner **Signature Square**. Les réglages sont en français. Les options restent directement sous `signature_square` ; il n’y a pas de sélecteur `layout`. Remplacer les entités de l’exemple par celles de votre installation.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.living_room_temperature
name: Température
icon: mdi:thermometer
card_layout: large
rows: 2
modules:
  - signature_square
signature_square:
  color: orange
  secondary: sensor.living_room_humidity
```

## Compatibilité et comportement

Cartes `button`, hors boutons `switch` et `slider`. Les volets et thermostats utilisent Signature Compact. La hauteur dépend du nombre de lignes et de la grille Home Assistant. Une configuration incompatible ne reçoit aucun style de ce module.

`controls: measure` repositionne les deux premiers sous-boutons natifs ; il ne les crée pas. `reserve_measure_detail: true` réserve le détail inférieur. `auto_height` adapte la hauteur au contenu ; `multiline` autorise les retours à la ligne.

Les valeurs conservent le format numérique Home Assistant et leur unité. `state` personnalise l’état affiché avec du texte ou Jinja. `secondary` accepte du texte, une entité directe ou Jinja ; l’entité directe fournit l’unité. La première référence d’entité détectée dans un template définit la cible des détails, sans analyser quelle branche Jinja est affichée. `secondary_bold: true` autorise `**texte**`, sans interpréter du HTML.

Les sous-boutons gardent les entités, conditions et actions Bubble. `sub_button_styles` est un objet indexé par classe CSS ou numéro natif. Les switches visuels sont disponibles en square/compact, avec des actions toggle compatibles ou des actions lock/unlock explicites ; ils ne créent pas de commande supplémentaire.

## Bandeau à une ou deux mesures

Un objet `summary` avec une `entity` valide active un bandeau large : la mesure
principale à gauche, une seconde mesure au centre et l’illustration facultative
à droite. Utiliser `rows: 2`, une largeur complète et `show_icon: false`.
La hauteur reste celle des deux lignes natives Bubble, soit 120 px avec un pas
de 56 px et un écart de 8 px. Le module ne l’augmente pas, même lorsque la taille
d’illustration demandée est supérieure ; le dessin rétrécit pour laisser les
textes lisibles. Sa taille cible reste `signature-illustration-size`, 80 px.

Pour une seule mesure principale, utiliser **`summary: {enabled: true}`**, sans
`entity` dans cet objet. La colonne de la seconde mesure disparaît et aucun
nœud n’est créé pour elle ; la valeur et le secondaire natifs restent à gauche,
avec l’illustration centrée à droite. La valeur conserve sa taille standard de
28 px et l’unité 16 px (variables Signature). `enabled: false` désactive le
bandeau, même si une seconde entité est configurée. Un objet vide reste inactif.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.battery_available_energy
name: Disponible
show_icon: false
card_layout: large
rows: 2
grid_options:
  columns: full
  rows: 2
modules:
  - signature_square
signature_square:
  secondary: sensor.battery_soc
  summary:
    entity: sensor.battery_power
    name: En décharge
    secondary: "{{ states('sensor.battery_remaining_time') }}"
  illustration:
    image: /local/illustrations/battery.png
```

`summary.name` accepte du texte ou Jinja et utilise le nom de l’entité par défaut.
`summary.secondary` accepte du texte, une entité ou Jinja, comme le secondaire
principal. Dans ces templates, `entity` désigne la **seconde** mesure. Les valeurs
conservent la précision et les unités HA ; une valeur manquante affiche `—`.
Chaque valeur et détail lié à une entité ouvre ses propres informations via
le gestionnaire d’actions natif Bubble. Un changement de cible remplace le seul
nœud concerné pour éviter un ancien gestionnaire mis en cache. Aucun nouveau
listener, observateur ou abonnement. Le bandeau est ignoré en `auto_height` ou
`controls: measure` ; les sous-boutons ne sont pas prévus dans ce bandeau.

Les textes peuvent passer sur deux lignes ; les valeurs et unités s’adaptent à
la largeur. Les deux blocs partagent les mêmes lignes de titre/valeur/détail.
Le dessin est centré verticalement sur la carte. Les badges actifs/en attente
d’Alert Manager restent visibles en haut à droite lorsque l’icône est masquée.

## Couleurs du fond d’icône selon la valeur

`color_thresholds.values` applique une teinte discrète à 16 % au fond du carré et la couleur interpolée du graphe à l’icône. Le même principe s’applique aux badges via `sub_button_styles`. Les fonds suivent la surface claire/sombre du thème ; l’icône conserve toujours la couleur exacte du graphe, sans gestion du contraste. Le texte des badges garde le thème. Avec des seuils actifs, `icon_color` n’écrase pas la couleur numérique ; hors seuils, son comportement reste inchangé. Voir le [guide commun et les exemples graphique/humidité](../../signature-shared/doc/COLOR_THRESHOLDS.md).

## Illustration décorative facultative

En mode classique, l’option `illustration` affiche une image en haut à droite de la carte, sans modifier
les unités, le secondaire, les actions ou les dimensions de la carte. Utiliser
`show_icon: false` dans Bubble pour éviter le doublon avec le pictogramme natif.
Sans cette option, le rendu reste inchangé.

```yaml
show_icon: false
signature_square:
  illustration:
    image: /local/illustrations/confort-v1.png
    image_light: /local/illustrations/confort-day-v1.webp?v=1
    image_dark: /local/illustrations/confort-night-v1.webp?v=1
    columns: 4
    rows: 3
    index: 1
```

`image` accepte une URL locale absolue (`/local/...`) ou HTTP(S), éventuellement
Jinja. Une image ordinaire utilise `columns: 1`, `rows: 1`, `index: 0` par défaut.
Pour une planche à cases égales, colonnes/rangées sont bornées à 1–16 ; `index`
compte les cases de gauche à droite puis de haut en bas, à partir de 0. Il accepte
un nombre ou Jinja et est relu à chaque rendu Bubble. Un index négatif, vide,
invalide ou hors planche masque l’image : un capteur indisponible peut utiliser
`-1`, sans inventer une situation « calme » ou « sec ».

`image_light` et `image_dark` sont facultatifs et acceptent les mêmes URLs ou
templates. Le choix suit **le mode effectif de Home Assistant**
(`hass.themes.darkMode`), y compris un thème forcé différent de celui du système.
La variante est relue à chaque rendu natif Bubble : un changement de thème seul
suffit, sans changer de capteur ni reconstruire la disposition. Si la variante
est absente, vide ou incorrecte, ou si le mode HA n’est pas encore connu,
`image` sert de repli. Aucune image n’est affichée sans URL exploitable.
Les deux variantes doivent utiliser la même grille et le même ordre de cases.
Le paramètre de version d’URL reste stable ; l’incrémenter lorsque le fichier
change, sans générer de date ou de valeur aléatoire à chaque rendu.

La planche doit avoir des cases carrées transparentes avec une marge autour de
chaque objet. Elle n’est pas fournie par le module : installer l’image dans
`config/www/illustrations/` pour la servir sous `/local/illustrations/`.
Les images doivent être de confiance et accessibles au navigateur.

Le placement classique utilise seulement CSS : l’image reste ancrée en haut, même lorsque
la carte affiche un secondaire sous sa valeur. Sa taille cible est partagée avec Room via la variable de thème `signature-illustration-size: 80px` (même repli sans thème). Elle rétrécit avant le titre ou la valeur sur une carte étroite, et selon la hauteur disponible au-dessus du secondaire ; sa boîte reste carrée. Le secondaire conserve toute la largeur et son unité. Le réglage suit le thème sans reconstruire le module ; voir le [thème](../../themes/README.md#shared-module-variables). Elle ne
capte pas les clics et ne remplace aucun nœud natif. Aucun abonnement, observateur,
timer ou bibliothèque supplémentaire n’est ajouté.

### Cadrage d’une planche imparfaite

Les nombres ou templates Jinja **`illustration.offset_x`** et **`offset_y`** déplacent la fenêtre de lecture dans la planche. Unités : pourcentage de la largeur/hauteur **d’une case source**, de −50 à 50 ; 0 par défaut. Une valeur positive lit plus à droite/en bas ; une valeur négative plus à gauche/en haut. La taille de la case, le zoom et la boîte affichée restent identiques. L’axe concerné est ignoré lorsque la planche n’y contient qu’une case ; une valeur invalide revient à 0. Ce cadrage est commun à Square et Room et s’applique aux deux variantes de thème.

Exemple de déplacement sur une grille 4 × 5 : `offset_x: 7` et `offset_y: 4` dans l’objet `illustration` déplace le cadrage de 19,6 px à droite et 11,2 px vers le bas dans un PNG de 1 122 × 1 402 px, sans redessiner l’illustration. Pour une suite d’états, les cadrages peuvent être des templates relus en même temps que `index` ; une sortie invalide revient à 0. Ne pas ajouter de CSS dans la carte.

## Options

| Option | Défaut | Usage |
|---|---|---|
| `color` | `blue` | Couleur de la palette, couleur CSS ou template Jinja. Valeurs : `blue`, `light-blue`, `teal`, `cyan`, `green`, `orange`, `amber`, `yellow`, `red`, `pink`, `indigo`, `purple`, `grey`. |
| `secondary` | Aucun | Texte secondaire (entité, texte ou template) |
| `state` | Aucun | Valeur principale personnalisée (texte ou template) |
| `secondary_bold` | `false` | Interpréter **texte** en gras dans le texte secondaire |
| `multiline` | `false` | Autoriser les textes sur plusieurs lignes |
| `controls` | `native` | Commandes Valeurs : `native`, `measure`. |
| `sub_button_styles` | `{}` | Objet YAML indexé par css_class ou numéro de sous-bouton ; les clés personnalisées restent compatibles. |
| `auto_height` | `false` | Adapter la hauteur au contenu |
| `reserve_measure_detail` | `false` | Réserver la ligne de détail avec les commandes de mesure |
| `illustration` | Aucun | Objet `image`, `image_light`, `image_dark`, `columns`, `rows`, `index` ; images externes et sprites facultatifs |
| `summary` | Aucun | Objet `enabled`, `entity`, `name`, `secondary` ; bandeau de deux lignes, une ou deux mesures |
| `color_background` | `false` | false par défaut. Saisir true/false ou un template Jinja entre guillemets. |
| `icon_color` | Aucun | Couleur manuelle de l’icône, remplacée si des seuils sont actifs |
| `color_thresholds` | Aucun | Objet YAML `enabled`, `transition`, `values` ; facultativement `entity` et `attribute`. Icône et fond doux du carré sur les cartes bouton. |
| `icon_opacity` | Comportement natif / aucun | Opacité native par défaut. Saisir de 0 à 1, null ou un template Jinja entre guillemets. |
| `border_color` | Aucun | Couleur de la bordure de la carte |
| `icon_border_color` | Aucun | Couleur de la bordure du fond de l’icône |

## Thème et coexistence

Le [thème Signature](../../themes/README.md) centralise l’apparence via les variables `--signature-*`. Le navigateur résout ces variables, y compris dans le CSS mis en cache, sans lecture JavaScript du thème. Les valeurs de secours reproduisent le rendu actuel en l’absence du thème. Les grilles, les placements et les comportements appartiennent au module. Aucune dépendance entre modules n’est à installer et aucun `card-mod` n’est nécessaire.

Utiliser **un seul module de présentation par carte**. `alert_manager` peut être ajouté après celui-ci ; les alertes gardent leurs couleurs prioritaires. Le lecteur multimédia utilise `signature_compact`.

Pour migrer : remplacer `signature` dans `modules` par `signature_square`, déplacer les options sous cette nouvelle clé et retirer `layout`. Conserver les entités, actions et sous-boutons natifs. Voir le [guide de migration](../../signature-shared/doc/MIGRATION.md). Importer un module ne migre pas les dashboards existants.

## Maintenance et validation

Les styles communs sont définis dans [shared/src/styles](../../shared/src/styles/README.md) et inclus au build. Les dispositions restent propres au module ; la distribution demeure autonome et minifiée.

Modifier les fichiers `src` du module et les [fonctions partagées](../../signature-shared/README.md), puis exécuter `npm run build:modules` et `npm run check:modules`. Les distributions sont autonomes et ne chargent aucun fichier partagé dans Home Assistant. Voir le [guide de build commun](../../shared/README.md). Respecter le [contrat de style](../../STYLE_GUIDE.md).

Le formulaire réutilise le pont de Signature et les helpers d’objet Bubble ; la référence actuelle est Bubble Card 3.4.1. Les contrôles automatiques comparent les distributions à Signature, leurs actions et leur nettoyage, ainsi que les styles calculés dans des fixtures Chromium. Ils ne constituent pas une validation dans Home Assistant ou Safari/iOS.

## Notes de version

### 1.4.1 — 16 octobre 2026

- `summary.enabled: true` sans seconde entité active le même bandeau illustré à une mesure. Valeur et unité standard, aucune colonne vide ni nouveau nœud, hauteur native de deux lignes conservée.
- Passage une/deux mesures et désactivation explicite nettoient les seuls nœuds et actions possédés. Les objets `summary` existants et les cartes classiques conservent leur comportement.

### 1.4.0 — 16 octobre 2026

- Bandeau large facultatif à deux mesures via `summary`, illustration centrée à droite et hauteur native de deux lignes conservée.
- Noms, valeurs/unité et détails alignés, quatre accès more-info indépendants via Bubble ; données et templates relus sans observateur ni listener.
- Nettoyage des nœuds et des actions à la désactivation, au changement de cible ou de version. Badges d’alerte conservés lorsque l’icône est masquée.
- Cadrages `illustration.offset_x` / `offset_y` compatibles Jinja pour centrer chaque état d’une planche animée par capteur ; mêmes bornes et replis que les nombres.

### 1.3.3 — 16 octobre 2026

- Cadrage facultatif `illustration.offset_x` / `offset_y` pour exclure les morceaux des cases voisines d’un atlas imparfait, sans changer la taille de l’illustration ni son zoom.
- Même calcul partagé Room/Square, relu hors cache structurel ; les planches régulières gardent exactement leurs coordonnées par défaut. Aucun nœud, observateur, abonnement ou CSS dans les cartes ajouté.

### 1.3.2 — 16 octobre 2026

- Taille cible des illustrations partagée avec Room via `signature-illustration-size`, 80 px par défaut, sans CSS dans les cartes.
- Adaptation à l’espace horizontal et vertical disponible pour préserver les valeurs et le secondaire à pleine largeur, y compris avec une taille demandée plus grande.
- Variable CSS héritée à chaud ; images, variantes HA, nœuds et actions natifs conservés.

### 1.3.1 — 16 octobre 2026

- Illustrations ancrées en haut à droite sur toutes les cartes illustrées, indépendamment du secondaire.
- Titre et valeur prioritaires sur la largeur de l’image ; rafales et unités conservées sous la vitesse.
- Placement uniquement CSS, sans modification des cartes sans illustration ni des actions.

### 1.3.0 — 15 octobre 2026

- Variantes facultatives `image_light` / `image_dark` selon le mode HA effectif.
- Repli compatible sur `image` si une variante ou le mode manque ; URLs invalides rejetées.
- Bascule sur rendu natif hors cache structurel, sans écouteur, timer ou abonnement ajouté.
- Aucun asset embarqué ; images, valeur, secondaire, grille et actions restent indépendants.

### 1.2.0 — 15 octobre 2026

- Illustration décorative facultative : image locale/HTTP(S), ou planche de sprites avec index numérique/Jinja.
- La valeur reste prioritaire et le secondaire garde toute la largeur ; masquage d’icône natif compatible.
- Données relues hors cache structurel, sans nouveau nœud, listener, timer ou observateur.
- Présentation et actions des cartes sans illustration conservées.

### 1.1.7 — 8 octobre 2026

- Le détail inférieur de `controls: measure` reprend les 8 px de dégagement horizontal des sous-boutons Compact, en conservant son texte à 14 px du bord intérieur et sa hauteur de 24 px.
- Survol et action natifs conservés ; aucun changement des valeurs, switches, seuils ou placements principaux.
- Régression vérifiée sur fixtures Chromium clair/sombre, avec/sans thème ; aucun essai Home Assistant réel ou Safari/iOS.

### 1.1.6 — 5 octobre 2026

- Couche de survol native ancrée sur les quatre bords, y compris avec marges, grille et hauteur automatique.
- Les boîtes de contenu laissent passer le pointeur ; icône, valeurs et commandes gardent leurs actions distinctes.
- Halo des interrupteurs limité à leur piste de 48 × 28 px ; cible native conservée à 52 × 34 px.
- Régression vérifiée sur fixtures Chromium en clair/sombre, avec/sans thème ; aucune nouvelle écoute ni modification de configuration.

### 1.1.5 — 5 octobre 2026

- Fonds à seuils adoucis : mélange 16 % dans la surface du thème, comme Pluie/Vent, au lieu d’une couleur pleine.
- Icônes exactement accordées au RGB du graphe, sans gestion du contraste ; libellés du thème. Les seuils actifs remplacent aussi `icon_color`.
- Clair/sombre et changements de thème suivis en CSS sans observateur. Même configuration des seuils, mêmes dimensions et actions.

### 1.1.4 — 5 octobre 2026

- Invalidation du runtime et des caches lors du remplacement d’une distribution, y compris depuis une version sans marqueur interne. La version est injectée au build depuis `src/module.yaml`.
- Les anciennes actions et lignes secondaires sont nettoyées avant le nouveau rendu, sans duplication de nœuds.
- Les mises à jour ordinaires réutilisent les caches et continuent à lire les états et templates ; les variables de thème restent dans le CSS.

- **1.1.3** : Correction des seuils : fond du carré/badge, et non couleur de l’icône. Couleur du thème conservée si lisible, adaptation de contraste en CSS sans lecture de styles ni observateur ; mêmes seuils YAML et couleurs de graphes.

### 1.1.2 — 5 octobre 2026

- Définitions des champs communs assemblées au build depuis `shared/src/editor-fields/presentation.yaml`.
- Libellés, choix, groupes, valeurs par défaut, ordre et conditions de visibilité conservés ; les descriptions particulières restent locales. Aucun changement de configuration ni de code exécuté dans les cartes.

- **1.1.0** : Seuils numériques génériques, interpolation RGB compatible avec le graphique et coloration indépendante des icônes de sous-boutons ; configuration et exemples dans le guide commun.

- **1.0.4** : Règles CSS communes assemblées au build depuis `shared/src/styles` ; styles calculés, configuration et actions conservés.

- **1.0.3** : Distribution minifiée au build : variables JavaScript raccourcies, CSS et métadonnées YAML compactés ; configuration et comportement conservés.

- **1.0.2** : Build depuis les sources du module et les fonctions communes ; distribution autonome, configuration et rendu conservés.

### 1.0.2 — 5 octobre 2026

- Retrait du module historique `signature` ; métadonnées et guides actualisés, rendu et options inchangés.

## Notes de version

### 1.1.1 — 5 October 2026

- Mutualise le socle de l’éditeur, la palette et la validation des couleurs, les sources de templates et les helpers de locale/précision.
- Conserve les options YAML, les actions et la géométrie propres à cette présentation ; la précision native explicite reste prioritaire.
