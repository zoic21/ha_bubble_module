# Signature Room

Version **1.0.8**. ID YAML : **`signature_room`**. [Distribution complète à importer](../dist/signature-room.yaml).

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

## Compatibilité et comportement

Cartes `button`, hors boutons `switch` et `slider`. Une carte pièce commence à 156 px et peut grandir avec le texte et les rangées de commandes. Une configuration incompatible ne reçoit aucun style de ce module.

Les classes natives sont `room-temperature`, `room-humidity`, `room-status`, `room-control-N` et `room-climate`. `room_control_columns` va de 1 à 6. `room_auto_colors: false` désactive les couleurs automatiques. `room_measures_position: header` place les mesures dans l’en-tête quand l’état principal et le secondaire ne prennent pas cette place. Un état principal affiché masque les mesures redondantes.

Les valeurs conservent le format numérique Home Assistant et leur unité. `state` personnalise l’état affiché avec du texte ou Jinja. `secondary` accepte du texte, une entité directe ou Jinja ; l’entité directe fournit l’unité. La première référence d’entité détectée dans un template définit la cible des détails, sans analyser quelle branche Jinja est affichée. `secondary_bold: true` autorise `**texte**`, sans interpréter du HTML.

Les sous-boutons gardent les entités, conditions et actions Bubble. `sub_button_styles` est un objet indexé par classe CSS ou numéro natif. Les switches visuels sont disponibles en square/compact, avec des actions toggle compatibles ou des actions lock/unlock explicites ; ils ne créent pas de commande supplémentaire.

## Options

| Option | Défaut | Usage |
|---|---|---|
| `color` | `blue` | Couleur de la palette, couleur CSS ou template Jinja. Valeurs : `blue`, `light-blue`, `teal`, `cyan`, `green`, `orange`, `amber`, `yellow`, `red`, `pink`, `indigo`, `purple`, `grey`. |
| `secondary` | Aucun | Texte secondaire (entité, texte ou template) |
| `state` | Aucun | Valeur principale personnalisée (texte ou template) |
| `secondary_bold` | `false` | Interpréter **texte** en gras dans le texte secondaire |
| `multiline` | `false` | Autoriser les textes sur plusieurs lignes |
| `sub_button_styles` | `{}` | Objet YAML indexé par css_class ou numéro de sous-bouton ; les clés personnalisées restent compatibles. |
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
