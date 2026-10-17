# Signature Panel

Version **1.0.1**. ID YAML : **`signature_panel`**. [Distribution à importer](../dist/signature-panel.yaml).

Carte illustrée pleine largeur, deux pas de hauteur : **118 px visibles** avec le pas standard de 56 px et l’écart de 8 px. L’illustration de 80 px reste à droite et centrée sur toute la hauteur. Une seule grille place les titres, valeurs, détails et commandes ; aucun CSS par carte n’est nécessaire. Utiliser un seul module de présentation par carte.

## Configuration

Le nom, l’entité et l’état natifs forment la première information. `secondary` lui ajoute un détail. `information` est une liste de **zéro à deux informations supplémentaires** ; chaque entrée accepte les mêmes rôles. Les trois valeurs partagent leur ligne et leur typographie. Quand les entrées supplémentaires n’ont pas de nom, le titre principal occupe toute la largeur de contenu (exemple : Baie informatique).

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.power
name: Baie informatique
show_icon: false
show_state: true
rows: 2
card_layout: large
grid_options:
  columns: full
  rows: 2
modules:
  - signature_panel
signature_panel:
  hover: false
  illustration:
    image: /local/illustrations/infra-rack-v1.webp
  information:
    - entity: sensor.temperature
      icon: mdi:thermometer
      color: orange
      tap_action:
        action: navigate
        navigation_path: "#temperature"
    - entity: sensor.humidity
      icon: mdi:water-percent
      color: teal
```

`information` : `entity`, `name`, `state`, `secondary`, `icon`, `color`, `tap_action`, `statistics`, `secondary_statistics`. `state`, `name`, `secondary`, `icon` et `color` peuvent être des templates Jinja ; `entity` fournit le format numérique HA, l’unité et la cible de détails. `tap_action` remplace seulement l’action de clic de cette information. Une valeur calculée sans entité ne crée pas de cible more-info fictive. `enabled: false` retire une information supplémentaire. Deux entrées au maximum sont rendues ; ne pas utiliser ce format pour plus de trois informations.

Les sous-boutons natifs restent au pied, à gauche de l’illustration : au plus trois visibles. Leurs entités, conditions et actions restent dans `sub_button`. Le rôle `sub_button_styles.<classe-ou-numéro>.type: command` empile icône et libellé dans une cible de 44 px. `active` et `disabled` acceptent booléen ou Jinja. Une désactivation non résolue bloque la commande, y compris une action déjà mémorisée ou un geste commencé avant l’actualisation. Le garde est commun à Room et Panel ; la géométrie est propre à chaque module. Les boutons informatifs conservent leur densité native de 30 px et les lecteurs leurs contrôles/volume natifs.

## Illustrations et Jinja

Les fichiers restent extérieurs au module. `illustration.image` est l’URL de repli, littérale ou Jinja. `image_light` et `image_dark` sont des variantes facultatives selon le mode effectif Home Assistant. Sans variante valide, le module utilise `image`. Aucune liste d’états métier, de véhicules ou d’équipements n’existe dans Panel. Les conditions restent dans la carte :

```yaml
signature_panel:
  illustration:
    image: "{{ '/local/open.webp' if is_state('binary_sensor.door', 'on') else '/local/closed.webp' }}"
    image_light: /local/alarm-day.webp
    image_dark: /local/alarm-night.webp
    columns: 3
    rows: 2
    index: "{{ 0 if is_state(entity, 'disarmed') else 1 }}"
```

Les sprites partagent le lecteur Square/Room : `columns`, `rows`, `index` (base 0), `index_dark`, `offset_x`, `offset_y`, `offset_y_dark`. Les index/cadrages acceptent Jinja ; offsets entre −50 et 50 % d’une case. L’index −1 ou une URL invalide masque le dessin sans déplacer les colonnes. Le mode HA suit les actualisations natives Bubble, sans abonnement ni observateur supplémentaire ; il ne dépend pas du thème du système d’exploitation.

## Statistiques journalières

Une information peut fournir `statistics` au lieu d’une entité : `statistic_ids`, `unit`, `decimals`, `time_zone`, `factor` positif facultatif. `secondary_statistics` affiche le coût sous la consommation avec une requête commune. `subtract_statistic_ids` retire des flux ; `operation: remaining_percentage` et `part_statistic_ids` donnent la part restante, par exemple l’autosuffisance.

```yaml
signature_panel:
  illustration:
    image: /local/network.webp
  information:
    - name: Jour
      statistics:
        statistic_ids: [sensor.energy_hc, sensor.energy_hp]
        unit: kWh
        decimals: 2
        time_zone: Europe/Paris
      secondary_statistics:
        statistic_ids: [sensor.energy_hc_cost, sensor.energy_hp_cost]
        unit: €
        decimals: 2
        time_zone: Europe/Paris
```

Recorder fournit les variations du jour, y compris les remises à zéro. Un résultat incomplet reste `—`, jamais une somme partielle ou le compteur cumulé en direct. L’actualisation native déclenche au plus une requête par minute et par information statistique, sans timer. Changement de jour, de source et teardown invalident les réponses périmées. Les deux informations statistiques éventuelles ont des caches indépendants.

## Style et maintenance

Surfaces, textes, police et rayons utilisent les tokens Signature, y compris sans son thème : carte 22 px, contrôles 14 px, nom 14 px/600, valeur 28 px/500, unité 16 px/400, secondaire 13 px/400. Les états textuels sont limités à 22 px. Avec trois informations, la taille commune s’adapte à la largeur ; avec les commandes nommées, le rôle de valeur est de 20 px. Le texte reste primaire, les unités/détails secondaires ; les icônes gardent leurs accents. Retraits extérieurs des textes : 12 px horizontalement, 10 px verticalement, bordure comprise ; 8 px entre les colonnes. Les commandes de 44 px utilisent un retrait vertical de 8 px pour conserver les deux pas.

`hover: false` supprime le survol, pas les actions ni le retour d’appui. `progress: {value: 0..100, color: ...}` ajoute une piste décorative ; une valeur invalide la masque. L’état principal garde le défilement natif Bubble via `state_content` et `scrolling_effect`.

Les sources sont séparées en présentation, informations, statistiques, commandes et progression. Modifier `src`, puis `npm run build:modules`, `npm run check:modules`, `npm test` et `npm run test:styles`. Le test `panel-native.browser.cjs` charge Bubble **3.4.1** lorsque `BUBBLE_NATIVE_SCRIPT_PATH` pointe vers son script (SHA contrôlé). Cette couverture Chromium avec backend simulé ne valide ni l’installation Home Assistant réelle ni Safari/iOS.

## Migration

Installer Panel avant d’importer les cartes migrées. Remplacer `signature_square` ou `signature_room` dans `modules` et dans la clé d’options par `signature_panel`. `summary` devient `information: [ancien_summary]`. Retirer `activity`, `room_compact`, `room_inline_metrics`, `room_state_centered` et les autres réglages géométriques Room. Conserver `rows: 2` et `grid_options: {columns: full, rows: 2}`. Les Rooms de pièces et les Squares en demi-largeur restent sur leurs modules.

Square **2.0.0** supprime les bandeaux `summary` et `activity`. Room **1.4.0** supprime la géométrie d’équipement double hauteur. Group **1.1.1** sait lire les illustrations Panel des activités pour ses pastilles. Ces mises à jour et la migration des cartes doivent être installées ensemble.


## 1.0.1 — 17 octobre 2026

CSS des commandes et du média limité aux cartes concernées. Suppression des tailles/poids écrasés. Statistiques : pas de double remplacement du DOM ; formateurs et début de journée réutilisés.

Contrôles : tests Node, styles calculés Chromium et comparaison avant/après. Ces fixtures ne valident pas Home Assistant réel ni Safari/iOS. Voir le [bilan de la passe](../../docs/MODULE_OPTIMIZATION_2026_10.md).
