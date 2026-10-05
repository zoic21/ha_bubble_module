# Icônes colorées et fonds doux selon une valeur numérique

Disponible dans **Signature Compact 1.2.5**, **Square 1.1.5** et les sous-boutons de **Header 1.1.5**, y compris les titres de section. Fonction désactivée sans configuration ; aucun profil ni seuil automatique.

## Icône principale Compact ou Square

Ajouter `color_thresholds` sous les options du module. Le formulaire expose un champ objet YAML « Seuils de couleur de l’icône ». Il utilise l’état numérique brut de l’entité de la carte, avant son arrondi et son formatage ; il ne lit pas le texte affiché.

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

Pour Square, utiliser `signature_square` dans `modules` et comme clé d’options, puis retirer `compact_mode`. Le **fond du carré autour de l’icône** mélange 16 % de la couleur du seuil dans la surface du thème, comme les cartes Pluie/Vent. L’icône porte la couleur brute du graphe, sans correction de contraste. La surface de carte et sa valeur ne changent pas. Commandes et badge Alert Manager conservent leur fonctionnement. Les cartes Compact `climate`, `cover` et `media-player` ne reçoivent pas de seuils sur l’icône principale ; le thermostat garde sa couleur d’activité.

## Sous-boutons et titres

Configurer chaque fond de badge dans `sub_button_styles`, par `css_class` ou numéro natif Bubble. Disponible en Compact, Square, grand en-tête Header et séparateur Header. Le fond de la pilule utilise la même teinte douce à 16 % ; l’icône suit l’accent du graphe. Le libellé garde simplement le premier plan du thème. Le texte affiché, les nœuds et les dimensions sont conservés. Les interrupteurs visuels et les cartes Room ne prennent pas en charge ce mécanisme.

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

Les seuils actifs ont priorité sur le fond natif du carré et sur `background` / `color` / `icon_color` de l’indicateur. La couleur numérique de l’icône reste ainsi accordée au graphe. `icon_color` reprend son rôle lorsque l’échelle est désactivée ou retirée. Sans échelle valide, les styles manuels habituels restent inchangés. Retirer la configuration restitue les couleurs ordinaires. Les seuils ne signalent pas une alerte ; Alert Manager conserve son badge et sa politique indépendants.

## Fond et premier plan

Le fond est `color-mix(in srgb, couleur-du-seuil 16%, surface-du-thème)`. Il reste donc pastel sur une carte claire et sombre sur une carte sombre. Aucun changement du thème YAML n’est nécessaire. Ce mécanisme reprend exactement celui des icônes ordinaires Square / Pluie / Vent : pas de branche nuit, de détection du thème en JavaScript ou d’assombrissement de la palette du graphe.

L’icône conserve **exactement le RGB interpolé des seuils**. La gestion du contraste a été supprimée : aucun repli noir/blanc ni modification automatique de l’icône ou du texte. Le texte du badge conserve `var(--primary-text-color,#212121)`. Comme pour les icônes standard, choisir des couleurs de seuils visibles dans ses thèmes. Les opacités natives / `icon_opacity` restent respectées.

Les variables CSS suivent le thème sur les mêmes nœuds sans nouvelle mesure, lecture de styles, observateur ou réexécution. Les transitions de couleurs sont désactivées uniquement sur les indicateurs à seuils pour garder l’accent en phase avec le graphe. Chromium est couvert par les tests, pas Safari/iOS ou Home Assistant réel.

**Évolution Compact 1.2.5 / Square et Header 1.1.5** : le fond plein des versions précédentes devient une teinte douce à 16 %, et l’icône porte de nouveau l’accent numérique. Aucun renommage de clé, changement des `values` ni réimport de dashboard : mettre à jour les trois modules suffit.

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

La configuration n’est **pas synchronisée automatiquement** entre cartes : modifier l’échelle aux deux endroits. L’icône instantanée et un point historique moyenné peuvent avoir des valeurs différentes ; à valeur égale, leur couleur RGB de référence est identique. Le fond du carré/badge est volontairement plus doux que le trait. Les options Signature `entity` et `attribute` définissent uniquement sa source ; dans le graphique, configurer la source dans l’entité du graphique.

## Sources et vérification

Le calcul portable est maintenu une seule fois dans [shared/src/color-thresholds.js](../../shared/src/color-thresholds.js). L’adaptation aux sources HA et aux icônes/fonds doux est dans [signature-shared/src/color-thresholds.js](../src/color-thresholds.js). Le build intègre ces fonctions aux trois distributions ; aucune dépendance sur le graphique, lecture de styles, requête d’historique, temporisation, observateur ou abonnement supplémentaire.

Les tests vérifient les couleurs de référence du graphique (commit `505b86aff381dc1c876e48b46924538ce121864b`), les extrémités, la plage constante, les données invalides, les priorités des seuils sur les couleurs manuelles et le cache. Les fixtures Chromium couvrent clair/sombre, avec/sans thème, couleurs calculées, conservation de la surface de carte, des dimensions, nœuds et actions, ainsi que l’absence de correction de contraste et les changements de thème sans réexécution. Elles ne constituent pas une validation dans Home Assistant ou Safari/iOS ni une mesure des performances de l’installation.
