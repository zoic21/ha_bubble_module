# Couleurs du fond d’icône selon une valeur numérique

Disponible dans **Signature Compact 1.2.3**, **Square 1.1.3** et les sous-boutons de **Header 1.1.3**, y compris les titres de section. Fonction désactivée sans configuration ; aucun profil ni seuil automatique.

## Icône principale Compact ou Square

Ajouter `color_thresholds` sous les options du module. Le formulaire expose un champ objet YAML « Seuils de couleur du fond de l’icône ». Il utilise l’état numérique brut de l’entité de la carte, avant son arrondi et son formatage ; il ne lit pas le texte affiché.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.living_room_temperature
name: Température
icon: mdi:thermometer
modules:
  - signature_compact
signature_compact:
  compact_mode: value
  color_thresholds:
    enabled: true
    transition: smooth
    values:
      - value: 15
        color: "#2196f3"
      - value: 19
        color: "#4caf50"
      - value: 22
        color: "#4caf50"
      - value: 30
        color: "#ff9800"
```

Pour Square, utiliser `signature_square` dans `modules` et comme clé d’options, puis retirer `compact_mode`. Le **fond du carré autour de l’icône** change de couleur, pas la surface de la carte ni sa valeur. L’icône garde la couleur primaire du thème quand elle est lisible. Commandes et badge Alert Manager conservent leur fonctionnement. Les cartes Compact `climate`, `cover` et `media-player` ne reçoivent pas de seuils sur l’icône principale ; le thermostat garde sa couleur d’activité.

## Sous-boutons et titres

Configurer chaque fond de badge dans `sub_button_styles`, par `css_class` ou numéro natif Bubble. Disponible en Compact, Square, grand en-tête Header et séparateur Header. Le fond de la pilule suit les seuils ; icône et libellé utilisent un premier plan du thème protégé contre le manque de contraste. Le texte affiché, les nœuds et les dimensions sont conservés. Les interrupteurs visuels et les cartes Room ne prennent pas en charge ce mécanisme.

```yaml
type: custom:bubble-card
card_type: button
button_type: name
name: Séjour
modules:
  - signature_header
sub_button:
  main:
    - entity: sensor.living_room_humidity
      css_class: humidity
      icon: mdi:water-percent
      show_state: true
      state_background: false
      tap_action:
        action: more-info
signature_header:
  sub_button_styles:
    humidity:
      color_thresholds:
        enabled: true
        values:
          - {value: 25, color: "#ff9800"}
          - {value: 40, color: "#26a69a"}
          - {value: 60, color: "#26a69a"}
          - {value: 80, color: "#2196f3"}
```

Le même `sub_button_styles` fonctionne avec `card_type: separator` et `signature_header`. Les conditions de visibilité, l’ordre natif des groupes et les actions Bubble sont conservés. Le champ YAML existant des sous-boutons est disponible dans le formulaire du séparateur.

## Règles de l’échelle

| Champ | Comportement |
|---|---|
| `values` | Liste de points numériques `value` / `color`, triée sans modifier la configuration |
| `enabled` | Une liste valide active l’échelle ; `false` la désactive en conservant ses réglages |
| `transition` | `smooth` par défaut ; `hard` reproduit les paliers du graphique |
| `entity` | Option Signature : source différente de l’entité de la carte ou du sous-bouton |
| `attribute` | Option Signature : attribut numérique de la source, par exemple `temperature` |

Les couleurs explicites acceptées sont **`#RGB`, `#RRGGBB` et `rgb(r,g,b)`**, opaques, avec des canaux de 0 à 255. Pour garantir la correspondance numérique, les couleurs du thème, noms de palette, templates, transparences et références à d’autres entités ne sont pas interprétés dans `values`. Les options de couleur manuelle existantes restent compatibles avec les variables CSS et Jinja.

Les points invalides sont ignorés. Une liste vide ou entièrement invalide laisse l’apparence normale. Une source manquante, inconnue, indisponible ou non numérique donne un fond neutre (16 % `secondary-text-color` dans la surface neutre) avec icône du thème, sans modifier l’opacité native. Les valeurs sous le premier point ou au-dessus du dernier gardent la couleur de l’extrémité. Les échelles peuvent contenir des valeurs négatives, décimales et un seul point.

En `smooth`, interpolation linéaire de chaque canal RGB avec `Math.round`, comme le graphique. Deux points de même couleur créent une plage constante : dans l’exemple, 19–22 °C reste vert. En `hard`, le code de référence change de couleur **strictement au-dessus** du seuil : à exactement 19, la première couleur reste appliquée ; à 19,001, la couleur du point 19 s’applique. Cette particularité est conservée pour la compatibilité.

Les seuils actifs ont priorité sur le fond natif du carré et sur `background` / `color` du badge. `icon_color` ne désactive plus l’échelle : il constitue une préférence de premier plan soumise à la même protection de contraste. Sans échelle valide, les styles manuels habituels restent inchangés. Retirer la configuration restitue les couleurs ordinaires. Les seuils ne signalent pas une alerte ; Alert Manager conserve son badge et sa politique indépendants.

## Premier plan et contraste

Par défaut, le premier plan utilise `var(--primary-text-color,#212121)` : sombre dans un thème clair, clair dans un thème sombre. Il est conservé tant que le contraste suffit ; sinon le module choisit noir ou blanc, selon le meilleur contraste avec le fond. Le fond n’est pas altéré pour corriger la lisibilité : il garde sa couleur exacte pour correspondre au graphe.

Le minimum choisi est 3:1 pour une icône seule et 4,5:1 pour un badge affichant un état, un nom ou un attribut. Son libellé utilise aussi le premier plan protégé. Une couleur explicite `icon_color` est conservée si elle est lisible ; sinon elle reçoit le repli. Les opacités natives / `icon_opacity` restent respectées : la protection ne prétend pas compenser une opacité volontairement réduite. Les transitions de fond et de premier plan sont désactivées sur les indicateurs à seuils, pour éviter une perte de contraste entre deux palettes lisibles et conserver la correspondance instantanée avec le graphique.

Les fonctions CSS de couleur relative suivent le thème **sans nouvelle mesure, lecture JavaScript des styles ni observateur**. Les couleurs de premier plan translucides sont composées en sRGB sur le fond opaque avant le calcul du contraste. Dans un moteur sans les fonctions requises, un `@supports` conserve le repli noir/blanc lisible ; la préférence exacte du thème n’y est pas garantie. Les contrôles du dépôt couvrent Chromium, pas Safari/iOS ou Home Assistant réel.

**Correction par rapport à Compact 1.2.0 / Square et Header 1.1.0** : l’échelle porte maintenant sur le fond, et non le pictogramme. Aucun renommage d’option, changement des `values`, réimport de dashboard ou changement du thème n’est nécessaire ; mettre à jour les trois modules suffit.

## Correspondance avec les graphiques

La [Statistics Graph Chart Card](https://github.com/cataseven/Statistics-Graph-Chart-Card#-color-thresholds) conserve son mécanisme natif. Copier les mêmes `values`, `enabled` et `transition` dans la configuration de son entité :

```yaml
type: custom:statistics-graph-chart-card
entities:
  - entity: sensor.living_room_temperature
    color: threshold
    color_thresholds:
      enabled: true
      direction: vertical
      transition: smooth
      values:
        - {value: 15, color: "#2196f3"}
        - {value: 19, color: "#4caf50"}
        - {value: 22, color: "#4caf50"}
        - {value: 30, color: "#ff9800"}
```

`direction: vertical` peint la courbe selon la valeur sur l’axe Y. L’échelle colorée reste fixée par les seuils, indépendamment du cadrage. Ne pas activer simultanément la coloration rise/fall ou la coloration de toute la courbe par sa dernière valeur. Le remplissage sous la courbe peut être atténué : la correspondance porte sur la couleur de la ligne/du point.

La configuration n’est **pas synchronisée automatiquement** entre cartes : modifier l’échelle aux deux endroits. Le carré/badge instantané et un point historique moyenné peuvent avoir des valeurs différentes ; à valeur égale, leur couleur RGB de référence est identique. Les options Signature `entity` et `attribute` définissent uniquement sa source ; dans le graphique, configurer la source dans l’entité du graphique.

## Sources et vérification

Le calcul portable est maintenu une seule fois dans [shared/src/color-thresholds.js](../../shared/src/color-thresholds.js). La protection du contraste est commune dans [shared/src/color-contrast.js](../../shared/src/color-contrast.js). L’adaptation aux sources HA et aux fonds d’icône est dans [signature-shared/src/color-thresholds.js](../src/color-thresholds.js). Le build intègre ces fonctions aux trois distributions ; aucune dépendance sur le graphique, lecture de styles, requête d’historique, temporisation, observateur ou abonnement supplémentaire.

Les tests vérifient les couleurs de référence du graphique (commit `505b86aff381dc1c876e48b46924538ce121864b`), les extrémités, la plage constante, les données invalides, les priorités manuelles et le cache. Les fixtures Chromium couvrent clair/sombre, avec/sans thème, couleurs calculées, conservation de la surface de carte, des dimensions, nœuds et actions, ainsi que le contraste et les changements de thème sans réexécution. Elles ne constituent pas une validation dans Home Assistant ou Safari/iOS ni une mesure des performances de l’installation.
