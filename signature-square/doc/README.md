# Signature Square

## 2.0.8 — 21 octobre 2026 — centrage facultatif sans sous-texte

Avec `center_value_without_secondary: true`, la valeur et son unité sont
centrées horizontalement et dans la hauteur disponible sous le titre et
l’icône, uniquement lorsque le texte secondaire rendu est vide. Dès qu’un
secondaire apparaît, la disposition habituelle revient. L’option est
désactivée par défaut et s’applique aux tuiles classiques de hauteur fixe,
sans illustration ni `controls: measure`.

```yaml
signature_square:
  center_value_without_secondary: true
```

## 2.0.7 — 20 octobre 2026 — icônes de seuils sans fond

L’option booléenne `color_thresholds.background: false` supprime le fond
d’un indicateur numérique tout en conservant la couleur calculée de son
icône. Elle s’applique aux sous-boutons et, pour Compact/Square, à l’icône
principale. Sans cette option ou avec `true`, le fond doux à 16 % reste actif.
Voir le [guide des seuils](../../signature-shared/doc/COLOR_THRESHOLDS.md).


Version **2.0.8**. ID YAML : **`signature_square`**. [Distribution complète à importer](../dist/signature-square.yaml).

Tuiles carrées avec valeur principale, unité et texte secondaire.

2.0.3 retire les trois conditions d'éditeur encore liées à l'ancien mode
`activity` sur lecteur média. Le formulaire et le runtime acceptent les mêmes
cartes bouton ; les lecteurs gardent Compact ou Panel. Le rappel de hauteur
minimale est affiché dans l'éditeur. Le CSS et le rendu des Squares sont conservés.

Pour une Square de hauteur fixe, indiquer **`rows: 2` au minimum** dans la
configuration native Bubble, comme dans l'exemple. Sans ce réglage, Bubble
peut réserver une seule ligne de 56 px et couper la valeur. La hauteur native
de deux lignes est de 120 px avec le pas standard ; `auto_height` conserve
son adaptation au contenu. Le module ne modifie pas les options de grille HA.

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
| `center_value_without_secondary` | `false` | Centrer valeur et unité sous l’en-tête quand le secondaire rendu est vide (tuile classique fixe) |
| `reserve_measure_detail` | `false` | Réserver la ligne de détail avec les commandes de mesure |
| `illustration` | Aucun | Objet `image`, `image_light`, `image_dark`, `columns`, `rows`, `index` ; images externes et sprites facultatifs |
| `color_background` | `false` | false par défaut. Saisir true/false ou un template Jinja entre guillemets. |
| `icon_color` | Aucun | Couleur manuelle de l’icône, remplacée si des seuils sont actifs |
| `color_thresholds` | Aucun | Objet YAML `enabled`, `transition`, `values` ; facultativement `entity` et `attribute`. Icône et fond doux du carré sur les cartes bouton. |
| `icon_opacity` | Comportement natif / aucun | Opacité native par défaut. Saisir de 0 à 1, null ou un template Jinja entre guillemets. |
| `border_color` | Aucun | Couleur de la bordure de la carte |
| `icon_border_color` | Aucun | Couleur de la bordure du fond de l’icône |

## Thème et coexistence

Avec `show_icon: false`, le titre est ancré en haut : retrait extérieur de
10 px, bordure comprise. Les textes et le dessin ont 12 px de retrait
horizontal, comme Panel. La rangée technique de 36 px reste réservée pour
conserver la position verticale des valeurs et détails sur les tuiles fixes.
Avec une icône visible, le titre reste centré à son côté, avec les retraits
existants de 10 px. Le passage d’un état à l’autre reste natif et réversible.
En hauteur automatique, le contenu sans icône reçoit le même padding ; le
dessin ne doit pas annuler ses retraits et la hauteur suit le contenu.

Les titres partagent le rôle des panneaux boutons Panel 1.2.0 : couleur
primaire, poids moyen 500 et taille de légende augmentée de 1 px, soit 13 px
par défaut. La taille suit `signature-caption-font-size` et le poids suit
`signature-font-weight-medium`, y compris lors d’un changement de thème seul.
Les sous-textes utilisent la légende de 12 px, un poids normal et la couleur
secondaire ; l’écart de rangées vaut 3 px. Les valeurs, icônes, illustrations,
dimensions et actions restent identiques. Le titre global facultatif est propre
à Panel ; Square conserve son titre natif.

Le [thème Signature](../../themes/README.md) centralise l’apparence via les variables `--signature-*`. Le navigateur résout ces variables, y compris dans le CSS mis en cache, sans lecture JavaScript du thème. Les valeurs de secours reproduisent le rendu actuel en l’absence du thème. Les grilles, les placements et les comportements appartiennent au module. Aucune dépendance entre modules n’est à installer et aucun `card-mod` n’est nécessaire.

Utiliser **un seul module de présentation par carte**. `alert_manager` peut être ajouté après celui-ci ; les alertes gardent leurs couleurs prioritaires. Le lecteur multimédia utilise `signature_compact`.

Pour migrer : remplacer `signature` dans `modules` par `signature_square`, déplacer les options sous cette nouvelle clé et retirer `layout`. Conserver les entités, actions et sous-boutons natifs. Voir le [guide de migration](../../signature-shared/doc/MIGRATION.md). Importer un module ne migre pas les dashboards existants.

## Maintenance et validation

Les styles communs sont définis dans [shared/src/styles](../../shared/src/styles/README.md) et inclus au build. Les dispositions restent propres au module ; la distribution demeure autonome et minifiée.

Modifier les fichiers `src` du module et les [fonctions partagées](../../signature-shared/README.md), puis exécuter `npm run build:modules` et `npm run check:modules`. Les distributions sont autonomes et ne chargent aucun fichier partagé dans Home Assistant. Voir le [guide de build commun](../../shared/README.md). Respecter le [contrat de style](../../STYLE_GUIDE.md).

Le formulaire réutilise le pont de Signature et les helpers d’objet Bubble ; la référence actuelle est Bubble Card 3.4.1. Les contrôles automatiques comparent les distributions à Signature, leurs actions et leur nettoyage, ainsi que les styles calculés dans des fixtures Chromium. Ils ne constituent pas une validation dans Home Assistant ou Safari/iOS.

## Notes de version

### 2.0.6 — 18 octobre 2026

Titres des Squares sans icône ancrés au retrait supérieur de 10 px, au lieu
d’être centrés dans la rangée de l’icône. Retrait horizontal de 12 px, comme
Panel. Valeurs et détails des tuiles fixes gardent leur position et leurs
actions ; les icônes visibles gardent leur disposition. La hauteur automatique
préserve aussi les retraits avec une illustration. Aucun nouveau nœud,
observateur, option ni calcul JavaScript de géométrie.

Tests Node et Chromium, avec/sans thème, clair/sombre, différentes largeurs,
icône masquée/rétablie, illustrations, détails et hauteur automatique.
Captures des cartes Confort et du bandeau Maison avec Bubble 3.4.1 et valeurs
simulées ; pas de validation Home Assistant réelle ou Safari/iOS.

### 2.0.5 — 18 octobre 2026

Titres de mesure en couleur primaire et détails de légende de 12 px, avec le
même contraste que Panel 1.2.0. Écart de rangées de 3 px ; tokens et interlignes
suivent les changements du thème sans JavaScript. Pas de changement des valeurs,
entités, actions ou dimensions.

### 2.0.4 — 18 octobre 2026

Titres harmonisés avec les panneaux boutons Panel 1.1.7 : 13 px par défaut,
poids moyen 500, couleur secondaire du thème. Aucun changement des libellés,
valeurs, unités, dimensions ou actions. Le fragment typographique commun garde
les valeurs de secours des autres présentations.

### 1.4.5 — 16 octobre 2026

- CSS des badges actifs émis uniquement lorsqu’un sous-bouton est configuré ; le cache suit aussi leur ajout/retrait.
- Sélecteurs de masquage et de texte multiligne regroupés à spécificité identique ; taille d’unité commune redondante retirée, chaque présentation gardant sa taille dédiée.
- Sélecteurs de géométrie des interrupteurs regroupés avec `:is()` à partir de deux switches ; états et variables restent propres à chaque commande.

### 1.4.4 — 16 octobre 2026

- Un bandeau à une mesure sans secondaire ne réserve plus de ligne vide : titre et valeur reprennent exactement les positions du Square classique, avec deux lignes natives et illustration centrée.
- L’interligne des secondaires suit leur taille effective, y compris une personnalisation du thème sans réexécution du module.

### 1.4.3 — 16 octobre 2026

- Titres des bandeaux énergie alignés verticalement sur les tuiles classiques : rangée de 36 px et même interligne de 20 px, pour une marge supérieure identique en pleine largeur et demi-largeur.
- Hauteur native de deux lignes, illustrations centrées, textes longs, valeurs et actions conservés.

### 1.4.2 — 16 octobre 2026

- `sub_button_styles.<index-ou-classe>.type: badge` place un unique bouton natif iconique au coin inférieur droit d’une tuile classique à hauteur fixe.
- Visibilité, titre et actions conservés, secondaire dégagé seulement lorsque le badge est visible ; aucune hauteur, DOM ou écouteur ajouté.

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

### 1.4.2 — 16 octobre 2026

- `sub_button_styles.<index-ou-classe>.type: badge` place un unique bouton natif iconique au coin inférieur droit d’une tuile classique à hauteur fixe.
- Visibilité, titre et actions conservés, secondaire dégagé seulement lorsque le badge est visible ; aucune hauteur, DOM ou écouteur ajouté.

### 1.1.1 — 5 October 2026

- Mutualise le socle de l’éditeur, la palette et la validation des couleurs, les sources de templates et les helpers de locale/précision.
- Conserve les options YAML, les actions et la géométrie propres à cette présentation ; la précision native explicite reste prioritaire.

## Badge d’état natif dans une tuile

Depuis **1.4.2**, une carte Square classique à hauteur fixe peut afficher un
unique sous-bouton Bubble de type `default`, avec `show_name: false`, dans le
coin inférieur droit. Ajouter `type: badge` à son entrée de
`signature_square.sub_button_styles` (index natif ou `css_class`). Le bouton
reste natif et garde son titre, son entité, ses actions et sa visibilité.

```yaml
signature_square:
  sub_button_styles:
    1:
      type: badge
      color: '#B97918'
```

Le badge mesure 24 px avec une icône de 16 px. Lorsqu’il est visible, il réserve
32 px au bout du secondaire ; masqué par Bubble, il libère cette place. Il
n’ajoute ni ligne ni hauteur et ne déplace pas l’illustration. La présentation
est ignorée avec plusieurs sous-boutons, un nom/état/attribut/date affiché,
un type spécialisé, `auto_height`, `controls: measure` ou un bandeau `summary`.
Aucun nœud, action, abonnement ou écouteur supplémentaire.

### 1.5.0

- Seconde mesure depuis les statistiques du jour, sans helper et sans modifier les dimensions du bandeau.


## Alignement des valeurs — 1.5.3

Les tuiles de hauteur fixe réservent toujours leur troisième ligne, même sans
`secondary`. Ajouter, retirer ou rendre vide le secondaire ne déplace donc ni
la valeur principale ni l’illustration. La règle est commune aux tuiles
classiques, illustrées, aux commandes `measure` sans ancien détail réservé et
aux bandeaux à une mesure. La hauteur native reste inchangée. Les cartes
`auto_height`, les bandeaux à titres/détails multiligne et les anciens détails
de mesure réservés conservent leur dimensionnement propre.



## Migration 2.0.0

Les bandeaux pleine largeur `summary` et `activity`, leurs statistiques et les lecteurs illustrés sont déplacés dans [Signature Panel](../../signature-panel/doc/README.md). Square conserve les tuiles de mesure, leurs illustrations, badges et contrôles. Installer Panel et migrer les cartes concernées avant de mettre à jour Square.


## 2.0.1 — 17 octobre 2026

CSS d’illustration émis seulement pour un dessin valide ; le cache suit les activations/désactivations Jinja. Retrait d’une déclaration de pointeur redondante.

Contrôles : tests Node, styles calculés Chromium et comparaison avant/après. Ces fixtures ne valident pas Home Assistant réel ni Safari/iOS. Voir le [bilan de la passe](../../docs/MODULE_OPTIMIZATION_2026_10.md).

## 2.0.2 — 17 octobre 2026 — cohérence des styles

Unités assemblées depuis leur rôle commun, avec leur couleur secondaire et leur espacement nul. Géométrie des interrupteurs partagée avec Hue. Grille, rayons, illustrations et actions conservés.

Contrôles : tests Node et Chromium, dont les styles calculés et les changements de thème sans nouveau rendu. Voir le [bilan de cohérence](../../docs/STYLE_AUDIT_2026_10.md). Essais Home Assistant réel et Safari/iOS à effectuer après importation.
