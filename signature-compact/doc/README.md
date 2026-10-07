# Signature Compact

Version **1.4.3**. ID YAML : **`signature_compact`**. [Distribution complète à importer](../dist/signature-compact.yaml).

Lignes compactes de 56 px : informations, switches, volets, thermostats et commandes numériques. Les lecteurs multimédias reçoivent le même habillage de thème en conservant leurs dimensions natives.

## Installation et exemple

Importer la distribution dans **Modules** de l’éditeur Bubble, puis sélectionner **Signature Compact**. Les réglages sont en français. Les options restent directement sous `signature_compact` ; il n’y a pas de sélecteur `layout`. Remplacer les entités de l’exemple par celles de votre installation.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.living_room_temperature
name: Température
icon: mdi:thermometer
card_layout: large
modules:
  - signature_compact
signature_compact:
  color: orange
  compact_mode: value
```

## Compatibilité et comportement

Cartes `button` hors `slider`, ainsi que `cover`, `climate` et `media-player`. Les commandes natives restent intactes. `compact_mode: value` concerne les boutons État, ou Nom avec une option `state` personnalisée. Une configuration incompatible ne reçoit aucun style de ce module.

`value_style: button` avec `compact_mode: value` présente la mesure dans une petite pastille cliquable : hauteur 36 px, valeur 14 px, unité 12 px, surface neutre et rayon concentrique de 12 px par défaut (`max(0px, rayon de carte − 10px)`). Elle ouvre les détails de l’entité principale et précède les sous-boutons. Les interrupteurs visuels sont placés en dernier dans leur groupe natif. Avec trois sous-boutons ou plus, le groupe passe sous la mesure sur les cartes de 480 px ou moins, avec hauteur automatique et retour à la ligne ; ce comportement fonctionne aussi sans `fill`. `value_background: false` retire la pastille autour de la valeur et réduit son padding horizontal à 4 px ; la cible cliquable garde une hauteur de 36 px. Le remplissage de la carte reste visible derrière la puissance. Le nœud d’état, ses actions et son formatage restent natifs. `value_style: text` conserve la grande valeur de 20 px. Les commandes numériques − / valeur / + ignorent cette option.

`controls: number` ajoute − / valeur / + pour un bouton État lié à `number` ou `input_number`. Les limites et le pas viennent de l’entité. Les pressions attendent un changement de valeur ou cinq secondes avant de reprendre ; les états invalides désactivent les commandes. Un clic sur la valeur ouvre les détails. `sub_buttons_position: end` place les sous-boutons après les commandes natives.

Les valeurs conservent le format numérique Home Assistant et leur unité. `state` personnalise l’état affiché avec du texte ou Jinja. `secondary` accepte du texte, une entité directe ou Jinja ; l’entité directe fournit l’unité. La première référence d’entité détectée dans un template définit la cible des détails, sans analyser quelle branche Jinja est affichée. `secondary_bold: true` autorise `**texte**`, sans interpréter du HTML.

Les pastilles natives de 36 px partagent ce rayon concentrique et un retrait extérieur de 10 px à droite, égal aux retraits verticaux de la carte de 56 px. Les variables de thème restent résolues en CSS, y compris pendant un changement de thème sans réexécution. Les switches visuels et les contrôles de géométrie propre conservent leur forme.

Les sous-boutons gardent les entités, conditions et actions Bubble. `sub_button_styles` est un objet indexé par classe CSS ou numéro natif. Les switches visuels sont disponibles en square/compact, avec des actions toggle compatibles ou des actions lock/unlock explicites ; ils ne créent pas de commande supplémentaire.

### Lecteur multimédia

Sur `media-player`, le module applique les surfaces, les arrondis, l’ombre, la couleur d’icône et la typographie Signature. La pochette, le titre, l’artiste, le volume, les contrôles et les actions restent gérés par Bubble. Aucune grille de tuile ni hauteur de 56 px n’est imposée ; aucun observateur ou contrôle numérique Signature n’est créé.

Seules les options `color` et `color_background` s’appliquent et apparaissent dans le formulaire. Les autres options compactes sont ignorées pour ce type de carte ; les réglages natifs Bubble restent disponibles. Les variables CSS du thème suivent ses changements sans réexécuter le module.

```yaml
type: custom:bubble-card
card_type: media-player
entity: media_player.living_room
modules:
  - signature_compact
signature_compact:
  color: blue
  color_background: false
```

Voir aussi l’[exemple média](../examples/media.yaml).

## Couleurs du fond d’icône selon la valeur

`color_thresholds.values` applique une teinte discrète à 16 % au fond du carré et la couleur interpolée du graphe à l’icône. Le même principe s’applique aux badges via `sub_button_styles`. Les fonds suivent la surface claire/sombre du thème ; l’icône conserve toujours la couleur exacte du graphe, sans gestion du contraste. Le texte des badges garde le thème. Avec des seuils actifs, `icon_color` n’écrase pas la couleur numérique ; hors seuils, son comportement reste inchangé. Voir le [guide commun et les exemples graphique/humidité](../../signature-shared/doc/COLOR_THRESHOLDS.md).

## Remplissage proportionnel

`fill` décore le fond natif d’un bouton État numérique. Il est désactivé tant qu’aucune `reference_entity` ni limite `max` n’est configurée. `enabled: false` permet de le désactiver sans perdre ses réglages. Les volets, thermostats, lecteurs, boutons Nom/Switch/Slider et les contrôles `controls: number` ignorent cette option.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.pump_power
name: Pompe de relevage
icon: mdi:water-pump
grid_options:
  columns: full
  rows: 1
card_layout: large
modules:
  - signature_compact
signature_compact:
  color: blue
  compact_mode: value
  value_style: button
  value_background: false
  fill:
    reference_entity: sensor.house_power
```

La jauge affiche `100 × valeur / total`. Une échelle fixe se configure avec `fill: {max: 20}` pour un débit de 0 à 20 dans l’unité de l’entité, ou `fill: {max: 100}` pour une batterie. Une référence configurée est prioritaire sur `max` ; une référence invalide ne revient pas à une autre échelle. Les deux entités doivent avoir la même unité, sans conversion implicite W/kW. Les valeurs visuelles sont bornées à 0–100 % ; la mesure affichée et sa précision ne sont pas modifiées.

Zéro reste une mesure valide. Une source absente, vide, non numérique, un total nul/négatif ou une différence d’unité masque le remplissage (`data-dp-fill="unavailable"`), sans inventer une mesure à zéro. Si seule la référence manque, la mesure principale reste affichée. Aucun pourcentage ni texte secondaire n’est ajouté automatiquement. Une part de puissance peut augmenter lorsque d’autres appareils s’arrêtent ; elle n’indique pas une hausse de la puissance de cet appareil.

Le fond conserve la surface Signature native ; un accent transparent à 16 % la recouvre seulement sur la largeur calculée. `--signature-fill-tint`, valeur CSS facultative de 0 % à 100 %, permet d’ajuster cette intensité dans le thème. La transition de largeur dure 1,5 s et disparaît avec `prefers-reduced-motion: reduce`. Le texte conserve les couleurs du thème, l’icône et les badges leurs réglages propres. Les seuils d’icône ne recolorent pas la jauge, qui reprend `color`.

Les sous-boutons restent natifs : mêmes nœuds, états, actions, conditions, switches et listes déroulantes. Aucune réduction de police, de padding ou de flèche n’est appliquée. Avec `compact_mode: value` et au moins trois sous-boutons configurés, une carte de 480 px ou moins place le groupe sous la mesure et laisse ses boutons se répartir sur plusieurs lignes ; la hauteur devient automatique. Au-dessus, la disposition compacte habituelle est conservée. Les cartes avec zéro, un ou deux sous-boutons restent à 56 px. Les sous-boutons masqués restent masqués ; le seuil de trois compte les boutons configurés, même lorsqu’une condition en masque certains.

Alert Manager continue d’ajouter son badge au-dessus de l’icône, sans changement de son module. Le remplissage n’ajoute aucun nœud, action, abonnement, observateur ou polling : les deux états sont lus à chaque passage pour être suivis par Bubble, les styles statiques sont mis en cache et le thème reste résolu en CSS.

## Options

| Option | Défaut | Usage |
|---|---|---|
| `color` | `blue` | Couleur de la palette, couleur CSS ou template Jinja. Valeurs : `blue`, `light-blue`, `teal`, `cyan`, `green`, `orange`, `amber`, `yellow`, `red`, `pink`, `indigo`, `purple`, `grey`. |
| `secondary` | Aucun | Texte secondaire (entité, texte ou template) |
| `compact_mode` | `default` | Valeur compacte Valeurs : `default`, `value`. |
| `value_style` | `text` | `button` : petite valeur cliquable avant les commandes, switches visuels en dernier dans leur groupe ; avec `compact_mode: value` |
| `value_background` | `true` | Avec `value_style: button`, `false` affiche la petite valeur cliquable sans pastille |
| `state` | Aucun | Valeur principale personnalisée (texte ou template) |
| `fill` | Aucun | Objet YAML `reference_entity` ou `max`, avec `enabled: false` facultatif ; remplissage proportionnel doux |
| `secondary_bold` | `false` | Interpréter **texte** en gras dans le texte secondaire |
| `multiline` | `false` | Autoriser les textes sur plusieurs lignes |
| `controls` | `native` | Commandes Valeurs : `native`, `number`. |
| `sub_buttons_position` | `default` | Position des sous-boutons en compacte Valeurs : `default`, `end`. |
| `sub_button_styles` | `{}` | Objet YAML indexé par css_class ou numéro de sous-bouton ; les clés personnalisées restent compatibles. |
| `color_background` | `false` | false par défaut. Saisir true/false ou un template Jinja entre guillemets. |
| `icon_color` | Aucun | Couleur manuelle de l’icône, remplacée si des seuils sont actifs |
| `color_thresholds` | Aucun | Objet YAML `enabled`, `transition`, `values` ; facultativement `entity` et `attribute`. Icône et fond doux du carré sur les cartes bouton. |
| `icon_opacity` | Comportement natif / aucun | Opacité native par défaut. Saisir de 0 à 1, null ou un template Jinja entre guillemets. |
| `border_color` | Aucun | Couleur de la bordure de la carte |
| `icon_border_color` | Aucun | Couleur de la bordure du fond de l’icône |

## Thème et coexistence

Le [thème Signature](../../themes/README.md) centralise l’apparence via les variables `--signature-*`. Le navigateur résout ces variables, y compris dans le CSS mis en cache, sans lecture JavaScript du thème. Les valeurs de secours reproduisent le rendu actuel en l’absence du thème. Les grilles, les placements et les comportements appartiennent au module. Aucune dépendance entre modules n’est à installer et aucun `card-mod` n’est nécessaire.

Utiliser **un seul module de présentation par carte**. `alert_manager` peut être ajouté après celui-ci ; les alertes restent signalées par leur badge. Les lecteurs multimédias utilisent Compact.

Pour migrer : remplacer `signature` dans `modules` par `signature_compact`, déplacer les options sous cette nouvelle clé et retirer `layout`. Conserver les entités, actions et sous-boutons natifs. Voir le [guide de migration](../../signature-shared/doc/MIGRATION.md). Importer un module ne migre pas les dashboards existants.

## Maintenance et validation

Les styles communs sont définis dans [shared/src/styles](../../shared/src/styles/README.md) et inclus au build. Les dispositions restent propres au module ; la distribution demeure autonome et minifiée.

Modifier les fichiers `src` du module et les [fonctions partagées](../../signature-shared/README.md), puis exécuter `npm run build:modules` et `npm run check:modules`. Les distributions sont autonomes et ne chargent aucun fichier partagé dans Home Assistant. Voir le [guide de build commun](../../shared/README.md). Respecter le [contrat de style](../../STYLE_GUIDE.md).

Le formulaire réutilise le pont de Signature et les helpers d’objet Bubble ; la référence actuelle est Bubble Card 3.4.1. Les contrôles automatiques comparent les distributions à Signature, leurs actions et leur nettoyage, ainsi que les styles calculés dans des fixtures Chromium. Ils ne constituent pas une validation dans Home Assistant ou Safari/iOS.

## Notes de version

### 1.4.3 — 7 octobre 2026

Espacement de 8 px entre les valeurs, badges et groupes de commandes, quel que soit leur emplacement natif : une mesure finale comme l’humidité garde le même dégagement qu’une puissance suivie d’un switch. Les paddings internes des pastilles, l’écart de 4 px entre une valeur et son unité et les géométries propres aux commandes restent inchangés.

### 1.4.2 — 6 octobre 2026

- Les pastilles et valeurs avec fond suivent le rayon de la carte moins 10 px : 12 px avec le rayon de carte par défaut de 22 px.
- Retrait extérieur de 10 px à droite comme en haut, en bas et à gauche ; les grandes valeurs sans fond restent alignées sur ce bord.
- Les switches visuels, commandes numériques, volets, thermostats et lecteurs conservent leurs formes propres. Aucun calcul ni observateur ajouté.

### 1.4.1 — 6 octobre 2026

- Option `value_background: false` pour conserver une petite valeur cliquable sans pastille, avec un padding horizontal réduit à 4 px.
- Typographie, cible de 36 px, placement avant les commandes, interrupteurs en dernier et remplissage de carte conservés.
- Rendu et clics vérifiés sur fixtures Chromium ; aucune validation Home Assistant réel ou Safari/iOS.

### 1.4.0 — 6 octobre 2026

- Option `value_style: button` : pastille cliquable de 36 px, valeur 14 px et unité 12 px, placée avant les commandes natives.
- Interrupteurs visuels en dernier dans leur groupe ; tailles et actions des switches et selects conservées.
- Groupes de trois commandes sous la valeur sur carte étroite, avec ou sans jauge, y compris sans icône et avec un texte secondaire.
- Vérifications sur fixtures Chromium, clair/sombre, clics et selects ; aucune validation Home Assistant réel ou Safari/iOS.

### 1.3.0 — 6 octobre 2026

- Remplissage proportionnel facultatif à partir d’une entité de total ou d’une limite fixe, avec une teinte de 16 % héritant du thème.
- Données invalides distinguées du zéro réel ; largeur visuelle bornée sans modifier la mesure.
- Interrupteurs, selects, sous-boutons groupés et badges Alert Manager préservés ; groupe de trois commandes placé sous la valeur à 480 px ou moins.
- Styles statiques mis en cache, lectures d’entités suivies et mouvement réduit respecté, sans nouvel observateur ni abonnement.
- Vérifications sur DOM simulé et fixtures Chromium ; aucune validation Home Assistant réel ou Safari/iOS.


### 1.2.6 — 5 octobre 2026

- Couche de survol native ancrée sur les quatre bords, y compris avec marges, grille et hauteur automatique.
- Les boîtes de contenu laissent passer le pointeur ; icône, valeurs et commandes gardent leurs actions distinctes.
- Halo des interrupteurs limité à leur piste de 48 × 28 px ; cible native conservée à 52 × 34 px.
- Régression vérifiée sur fixtures Chromium en clair/sombre, avec/sans thème ; aucune nouvelle écoute ni modification de configuration.

### 1.2.5 — 5 octobre 2026

- Fonds à seuils adoucis : mélange 16 % dans la surface du thème, comme Pluie/Vent, au lieu d’une couleur pleine.
- Icônes exactement accordées au RGB du graphe, sans gestion du contraste ; libellés du thème. Les seuils actifs remplacent aussi `icon_color`.
- Clair/sombre et changements de thème suivis en CSS sans observateur. Même configuration des seuils, mêmes dimensions et actions.

### 1.2.4 — 5 octobre 2026

- Invalidation du runtime et des caches lors du remplacement d’une distribution, y compris depuis une version sans marqueur interne. La version est injectée au build depuis `src/module.yaml`.
- Les anciens contrôles numériques, délais et observateurs sont nettoyés avant leur remplacement ; une réponse de service tardive ne touche pas les nouvelles commandes.
- Les mises à jour ordinaires réutilisent les caches et continuent à lire les états et templates ; les variables de thème restent dans le CSS.

- **1.2.3** : Correction des seuils : fond du carré/badge, et non couleur de l’icône. Couleur du thème conservée si lisible, adaptation de contraste en CSS sans lecture de styles ni observateur ; mêmes seuils YAML et couleurs de graphes.

### 1.2.2 — 5 octobre 2026

- Définitions des champs communs assemblées au build depuis `shared/src/editor-fields/presentation.yaml`.
- Libellés, choix, groupes, valeurs par défaut, ordre et conditions de visibilité conservés ; les descriptions particulières restent locales. Aucun changement de configuration ni de code exécuté dans les cartes.

- **1.2.0** : Seuils numériques génériques, interpolation RGB compatible avec le graphique et coloration indépendante des icônes de sous-boutons ; configuration et exemples dans le guide commun.

- **1.1.4** : Règles CSS communes assemblées au build depuis `shared/src/styles` ; styles calculés, configuration et actions conservés.

- **1.1.3** : Distribution minifiée au build : variables JavaScript raccourcies, CSS et métadonnées YAML compactés ; configuration et comportement conservés.

- **1.1.2** : Build depuis les sources du module et les fonctions communes ; distribution autonome, configuration et rendu conservés.

- **1.1.0** : prise en charge de `media-player`, avec le rendu historique Signature et les dimensions, contrôles et actions natifs Bubble. Formulaire limité aux deux options de couleur ; variables de thème conservées dans le CSS.
- **1.0.0** : première distribution autonome de la présentation compacte.

### 1.1.2 — 5 octobre 2026

- Retrait du module historique `signature` ; métadonnées et guides actualisés, rendu et options inchangés.

## Notes de version

### 1.2.1 — 5 October 2026

- Mutualise le socle de l’éditeur, la palette et la validation des couleurs, les sources de templates et les helpers de locale/précision.
- Conserve les options YAML, les actions et la géométrie propres à cette présentation ; la précision native explicite reste prioritaire.
