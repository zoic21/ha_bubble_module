# Signature — guide du module de design

Version **1.8.26**. [Fichier complet à importer](../dist/signature.yaml).

**Identifiant YAML : `signature` ; nom affiché : Signature.**

Le module fournit cinq dispositions, des surfaces neutres, des icônes colorées, des arrondis et une typographie système commune. Il fonctionne dans Bubble Card sans `card-mod` ni CSS global. Il ne remplace pas les entités, conditions de visibilité et actions natives de la carte.

## Installation et premier exemple

Installer Bubble Card et Bubble Card Tools, puis importer le fichier YAML complet depuis la section Modules de l’éditeur d’une carte. Les options personnalisées de cette version se règlent en YAML : le module ne déclare pas encore de schéma `editor`.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.temperature_salon
name: Salon
icon: mdi:thermometer
card_layout: large
show_state: true
modules:
  - signature
signature:
  layout: compact
  compact_mode: value
  color: orange
```

`signature` se place à la racine de la carte, au même niveau que `entity` et `modules`. Remplacer les entités des exemples par celles de son installation.

## Dispositions et compatibilité

| Disposition | Usage | Conditions |
|---|---|---|
| `compact` | Ligne d’information ou de commande ; hauteur habituelle 56 px | Disposition par défaut |
| `square` | Tuile de mesure, valeur principale et sous-texte | Carte `button`, hors bouton `switch` |
| `room` | Résumé de pièce, mesures et commandes | Carte `button`, hors bouton `switch` |
| `header` | Bandeau de titre avec pastilles | Carte `button`, `button_type: name` |
| `title` | Titre de section sans trait, boutons en fin de ligne | Carte `separator` |

Les cartes `cover`, `climate` et les boutons `switch` utilisent toujours `compact`. Un `header` sur un bouton autre que `name` revient à `compact`. Une carte `media-player` reçoit un habillage dédié : ses commandes, illustrations et dimensions natives sont conservées.

Les boutons `slider`, popups et autres familles non déclarées dans `supported` restent hors du module. `layout: title` sur une carte autre qu’un séparateur ne produit aucun style. L’ancien mode `heading` ne produit aucun style.

La hauteur d’une tuile `square` dépend de la carte et de la grille Home Assistant : le module n’impose pas une hauteur universelle de 252 px. La hauteur compacte dépend de `--row-height`, avec un repli à 56 px.

## Options

| Option | Type / valeurs | Défaut | Effet |
|---|---|---|---|
| `layout` | `compact`, `square`, `room`, `header`, `title` | `compact` | Choisit la disposition, sous réserve de la compatibilité ci-dessus |
| `color` | Couleur CSS, nom de palette ou Jinja | `blue` | Accent et teinte du fond d’icône |
| `color_background` | Booléen ou Jinja donnant `true`/`false` | `false` | Teinte également le fond de la carte |
| `icon_color` | Couleur ou Jinja | Selon le layout et l’état | Remplace la couleur du pictogramme principal |
| `icon_opacity` | Nombre de 0 à 1 ou Jinja | Comportement natif | Opacité du pictogramme principal |
| `border_color` | Couleur ou Jinja | Aucun liseré ajouté | Liseré intérieur de carte de 2 px |
| `icon_border_color` | Couleur ou Jinja | Aucun liseré ajouté | Liseré intérieur du fond d’icône de 2 px |
| `compact_mode` | `value` | Standard | Affiche la valeur à droite sur un bouton `state`, ou un bouton `name` avec un `state` personnalisé |
| `state` | Texte ou Jinja | État natif | Valeur calculée à afficher ; respecter les options natives d’affichage de l’état |
| `secondary` | Texte ou Jinja | Aucun | Texte secondaire supplémentaire |
| `secondary_entity` | Identifiant d’entité | Aucun | Cible du clic sur le secondaire ; ne fournit pas son texte |
| `secondary_bold` | Booléen | `false` | Interprète `**texte**` dans le secondaire |
| `multiline` | Booléen | `false` | Autorise les retours à la ligne de l’état et du secondaire |
| `auto_height` | Booléen | `false` | Hauteur adaptée au contenu, uniquement en `square` |
| `controls` | `measure` ou `number` | Commandes natives | Placement de commandes de mesure en square, ou contrôle numérique en compact |
| `reserve_measure_detail` | Booléen | `false` | Réserve la ligne de détail inférieure en square avec `controls: measure` |
| `sub_buttons_position` | `end` | Placement habituel | Place les sous-boutons après les commandes natives en compact |
| `sub_button_styles` | Objet indexé par classe ou numéro | Aucun | Personnalise les sous-boutons existants |
| `room_auto_colors` | Booléen | `true` | Coloration automatique des commandes actives d’une pièce |
| `room_control_columns` | Nombre de 1 à 6 | `4` | Nombre de colonnes des commandes room, arrondi et borné |
| `room_measures_position` | `header` | Mesures dans le contenu | Place température/humidité dans l’en-tête si aucun état principal ni secondaire n’est affiché |

Les options de tuile ne s’appliquent pas toutes aux branches `title` et `media-player`. Pour `title`, utiliser les options natives des sous-boutons ; pour `media-player`, les options de couleur traitées sont `color` et `color_background`.

## Couleurs et apparence

La surface neutre utilise `--ha-card-background`, puis `--card-background-color`, puis le blanc. Le fond d’icône mélange l’accent à cette surface à 16 %. `color_background: true` applique aussi une teinte à la carte. `icon_color` modifie le pictogramme, sans changer la teinte issue de `color`.

Noms de palette : `blue`, `indigo`, `amber`, `orange`, `green`, `red`, `grey`, `teal`, `purple`, `light-blue`, `cyan`, `pink`, `yellow`. Les variables correspondantes du thème sont prioritaires sur les replis intégrés. Les couleurs CSS valides, comme `#2196f3`, `rgb(...)` et `var(...)`, sont également acceptées.

`color_background` doit produire exactement `true`, sans tenir compte des majuscules et espaces périphériques. `1` n’active pas cette option. Une opacité principale absente ou invalide conserve le comportement natif ; une valeur numérique valide est bornée entre 0 et 1.

| Élément | Présentation actuelle |
|---|---|
| Carte de tuile | Arrondi 22 px, bordure discrète et ombre légère |
| Icône compact / square | Fond 36 × 36 px, arrondi 12 px ; pictogramme 22 px |
| Nom compact / square | 14 px |
| Sous-texte compact / square | 13 px |
| Valeur numérique compact à droite | 20 px ; unité 13 px |
| Valeur textuelle compact à droite | 16 px |
| Valeur square | 28 px ; unité 16 px |
| Room | Base 156 px ; taille supérieure selon le texte et les rangées de commandes |

Le module utilise la police système ; il n’embarque aucune police Apple. Les dimensions compactes sont communes au mobile et au desktop.

## Mesure square et sous-texte

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.humidite_salon
name: Humidité
icon: mdi:water-percent
card_layout: large
rows: 2
show_state: true
modules:
  - signature
signature:
  layout: square
  color: teal
  auto_height: true
  multiline: true
  secondary_bold: true
  secondary_entity: sensor.temperature_salon
  secondary: |-
    {{ states('sensor.temperature_salon') }} °C
    **Confort intérieur**
```

`secondary` n’est pas une entité automatiquement résolue. `secondary_entity` sert uniquement à ouvrir ses détails. Le gras ne prend en charge que les paires `**…**` sur une même ligne, pas le Markdown complet ni du HTML.

`controls: measure` positionne les deux premiers sous-boutons existants : une commande en haut à droite et un détail en bas à droite. `reserve_measure_detail: true` réserve l’espace inférieur même sans deuxième sous-bouton. Le module ne crée pas ces boutons.

## Contrôle numérique

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: input_number.consigne
name: Consigne
icon: mdi:tune
card_layout: large
modules:
  - signature
signature:
  layout: compact
  color: teal
  controls: number
```

Sur `number` et `input_number`, ce mode ajoute − / valeur et unité / +. Il utilise les attributs réels `min`, `max`, `step` et `unit_of_measurement`, puis appelle le service `set_value` du domaine concerné. Un clic sur la valeur ouvre `more-info`.

Les libellés accessibles des commandes et les messages d’échec utilisent les traductions de Home Assistant. Si elles sont indisponibles, le module fournit un repli français pour une langue française, sinon anglais. Les nombres suivent la langue de Home Assistant, puis celle du navigateur si elle n’est pas fournie. Aucun format français n’est imposé aux autres langues.

Après un appui, les autres appuis attendent un changement effectif de valeur ou un délai maximal de cinq secondes. Les attributs manquants ou invalides désactivent les boutons. Les commandes climate et cover restent natives.

## Sous-boutons personnalisés

Les clés de `sub_button_styles` désignent le `css_class` d’un sous-bouton ou son numéro natif, sous forme de chaîne (`'1'`, `'2'`…). Préférer une classe explicite pour les boutons susceptibles d’être réordonnés. Avec les groupes Bubble, la numérotation native peut différer de l’ordre visuel du YAML : le module parcourt les groupes avant les boutons individuels, puis la section inférieure.

| Option du sous-bouton | Effet |
|---|---|
| `color` | Couleur du pictogramme ou de la piste de switch ; Jinja accepté |
| `background` | Fond personnalisé ; Jinja accepté |
| `opacity` | Opacité bornée de 0 à 1 ; Jinja accepté |
| `icon` | Icône fixe ou Jinja ; une valeur vide/invalide restaure l’icône native |
| `type: switch` | Habille une commande compatible comme un interrupteur, en compact/square |
| `type: mode` | Habille un sous-bouton compact de mode en 46 × 44 px |
| `column` | Colonne d’une commande room, bornée au nombre de colonnes configuré |

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.temperature_salon
name: Salon
card_layout: large
show_state: true
sub_button:
  main:
    - entity: switch.ventilation
      css_class: ventilation
      show_icon: true
      tap_action:
        action: toggle
modules:
  - signature
signature:
  layout: compact
  compact_mode: value
  sub_button_styles:
    ventilation:
      type: switch
      color: teal
```

Les switchs visuels ordinaires exigent un sous-bouton natif de type absent ou `default`, une action `toggle` et un domaine `switch`, `input_boolean`, `light`, `automation` ou `humidifier`. Ils conservent l’action native.

Pour `lock`, utiliser deux boutons conditionnels avec les actions explicites `lock.unlock` et `lock.lock`. ON signifie `unlocked`, OFF signifie `locked` ; les états transitoires restent atténués. Le module ne transforme pas une action `toggle` en commande de verrouillage.

## Résumé de pièce

Le layout room reconnaît les classes suivantes dans les sous-boutons :

| `css_class` | Rôle |
|---|---|
| `room-temperature` | Mesure de température, unité séparée |
| `room-humidity` | Humidité |
| `room-status` | Badge de statut |
| `room-control-N` | Commande de pièce, triée par numéro N |
| `room-climate` | Commande de chauffage/climatisation, après les commandes numérotées |

```yaml
type: custom:bubble-card
card_type: button
button_type: name
name: Salon
icon: mdi:sofa
card_layout: large
rows: 3
show_state: false
sub_button:
  main:
    - entity: sensor.temperature_salon
      css_class: room-temperature
      show_state: true
      show_icon: false
    - entity: sensor.humidite_salon
      css_class: room-humidity
      show_state: true
      show_icon: true
    - entity: light.salon
      css_class: room-control-1
      show_icon: true
      tap_action:
        action: toggle
modules:
  - signature
signature:
  layout: room
  room_control_columns: 4
```

Les commandes utilisent quatre colonnes par défaut, configurables de 1 à 6. Chaque rangée supplémentaire réserve de la hauteur ; ajuster aussi la grille Home Assistant. Un état principal affiché masque les rôles température/humidité. Un secondaire peut agrandir la carte.

Avec `room_measures_position: header` et sans état principal ni secondaire, température/humidité se placent à droite du titre. Deux rangées de commandes tiennent alors dans la base de 156 px ; les suivantes ajoutent 48 px. La géométrie de la version 1.8.25 laisse 8 px entre les mesures/l’icône et le trait.

Les commandes actives reçoivent des couleurs automatiques, sauf `room_auto_colors: false` ou couleur explicite. Les boutons masqués conservent leur emplacement logique ; leur masquage ne redistribue pas les autres colonnes.

## Titres et bandeaux

```yaml
type: custom:bubble-card
card_type: separator
name: Climat
icon: mdi:thermometer
modules:
  - signature
signature:
  layout: title
```

Le titre de section mesure 32 px de haut, avec un texte de 18 px. Il masque le trait horizontal et pousse les sous-boutons en fin de ligne. Utiliser leurs options natives `show_background` et `state_background` pour leur fond.

Pour un bandeau, utiliser `card_type: button`, `button_type: name` et `layout: header`. Le fond est transparent ; les sous-boutons deviennent des pastilles. Le titre passe de 38 à 32 px sur un petit conteneur ; les pastilles reviennent sous le titre selon la largeur du conteneur.

## Textes, unités et actions

- Les champs acceptant Jinja utilisent le moteur `renderTemplate` de Bubble. Leur actualisation dépend du rendu et des dépendances suivies par Bubble ; aucun polling propre au module n’est ajouté.
- Les mesures numériques simples respectent la langue et les précisions de Home Assistant. Un état numérique manquant ou indisponible devient `—`, sans unité.
- Une valeur personnalisée doit inclure son unité. Les quantités simples (`500 g`, `50 %`, `−4,5 °C`) et les durées `2 h 52 min` sont séparées visuellement en chiffres et unités sans modifier le calcul.
- `state_content` et les options natives d’attribut/horodatage restent prises en compte. Un état explicitement masqué reste masqué.
- Le clic et l’appui long sur une valeur principale ouvrent `more-info` pour l’entité principale. Le secondaire fait de même si `secondary_entity` est défini. Les sous-boutons conservent leurs actions natives.
- L’icône principale reprend une navigation explicite définie par `tap_action`, ou à défaut `button_action.tap_action`. Le clic sur la carte et le clic sur sa valeur peuvent donc avoir des actions différentes.

## Association avec Alert Manager

```yaml
modules:
  - signature
  - alert_manager
signature:
  layout: compact
  compact_mode: value
```

Le [module Alert Manager](../../alert_manager/doc/README.md) colore l’icône selon les alertes retenues ; il ne nécessite pas Signature. Les deux ordres fonctionnent avec ces versions, mais placer Alert Manager en dernier facilite la lecture de la configuration.

## Limites et vérification

Le module cible le DOM de Bubble Card. Les styles locaux, le thème, les dimensions de grille et les évolutions de Bubble peuvent modifier le rendu. Utiliser une version récente de Bubble ; les templates Jinja et le nettoyage de cycle de vie bénéficient des fonctions `renderTemplate` et `onTeardown` lorsqu’elles sont disponibles. Aucune version minimale spécifique n’est annoncée sans validation sur cette version.

Après importation, vérifier les layouts utilisés sur mobile et desktop, les noms longs, les unités et les commandes numériques dans son installation. Une vérification syntaxique du YAML/JavaScript ne valide pas le rendu ni les commandes d’une instance Home Assistant réelle.
