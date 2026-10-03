# Module Bubble Alert Manager 3.0.0

[Module à importer](../dist/alert_manager.yaml), indépendant de `signature`. Il colore uniquement l’icône principale et son fond pastel selon les alertes d’Alert Manager. Il ne recopie ni seuils ni délais dans les cartes.

## Configuration minimale

Ajouter le module à la carte suffit : **toutes ses entités sont surveillées**, et **seules les règles personnalisées sont prises en compte**.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.frigo_temperature
modules:
  - signature
  - alert_manager
signature:
  layout: compact
```

Les options se placent dans **`alert_manager`, à la racine de la carte**. 

Le module peut aussi être utilisé seul avec Bubble natif. Avec `signature`, les deux ordres fonctionnent ; placer `alert_manager` en dernier reste conseillé avec d’autres modules.

## Options

| Option | Effet | Valeur par défaut |
|---|---|---|
| `sensors.active/acknowledge/pending` | Identifiants des trois capteurs sources | Capteurs créés par défaut par l’intégration |
| `packs.<pack_id>` | Active un pack et définit éventuellement ses `colors.active/pending` | Aucun pack activé |
| `exclude_rules` | Liste des ID de règles personnalisées à interdire | `[]` |
| `ignore_pending` | Masquer les alertes à venir | `false` |
| `colors.active` | Couleur des alertes actives ou acquittées | Rouge du thème |
| `colors.pending` | Couleur des alertes à venir | Orange du thème |
| `entities.<entity_id>` | Exceptions pour une entité de la carte, ou ajout d’une entité extérieure | Aucune exception |

Chaque entrée de `entities` accepte `exclude: true`, `ignore_pending`, `packs.<pack_id>`, `exclude_rules` et `colors.active/pending`. Les packs utilisent le même objet de configuration au niveau général et dans une entité. Seuls les booléens YAML `true` et `false` règlent les options booléennes.

Pour désactiver entièrement ce module sur une carte : `alert_manager: false`.

## Capteurs sources

Sans configuration, le module lit les trois capteurs créés par défaut par l’intégration. S’ils ont été renommés, indiquer leurs nouveaux identifiants :

```yaml
alert_manager:
  sensors:
    active: sensor.mes_alertes_actives
    acknowledge: sensor.mes_alertes_acquittees
    pending: sensor.mes_alertes_a_venir
```

Chaque clé est facultative : une clé absente conserve son identifiant par défaut. `acknowledge` correspond aux alertes acquittées, qui restent colorées comme les alertes actives. Ces options choisissent les sources d’alertes ; `entities` choisit les entités à surveiller. Les capteurs sources doivent conserver le compteur et les attributs compacts `alerts` fournis par l’intégration.

## Exceptions par entité

Cette carte surveille automatiquement la température et la puissance. L’orange de puissance est ignoré ; sa règle de notification est exclue, mais ses autres erreurs restent prises en compte. Le switch est entièrement exclu.

```yaml
entity: sensor.frigo_temperature
sub_button:
  main:
    - entity: sensor.prise_frigo_puissance
    - entity: switch.prise_frigo
modules:
  - signature
  - alert_manager
alert_manager:
  entities:
    sensor.prise_frigo_puissance:
      ignore_pending: true
      exclude_rules:
        - notification_frigo
    switch.prise_frigo:
      exclude: true
```

Les ID de règles de cet exemple sont à remplacer par les ID réels de la configuration Alert Manager. Le filtrage porte sur les **identifiants**, jamais les noms affichés, messages ou labels. Une notification et une vraie erreur sur le même appareil restent ainsi indépendantes.

Pour ajouter une entité qui n’apparaît pas ailleurs dans la carte, la déclarer dans `entities`, éventuellement avec un objet vide :

```yaml
alert_manager:
  entities:
    sensor.cave_temperature: {}
```

## Activer des packs

Les packs sont déclarés par leur ID dans un objet `packs`, sans liste codée en dur dans le module. Un futur pack utilisant le contrat d’ID d’Alert Manager sera immédiatement pris en charge. Un pack absent de la configuration reste ignoré ; un objet vide `{}` suffit à l’activer.

```yaml
alert_manager:
  packs:
    battery: {}
    connectivity: {}
  entities:
    sensor.prise_frigo_puissance:
      packs:
        flapping: {}
```

Ici, `battery` et `connectivity` s’appliquent à toutes les entités surveillées. `flapping` s’ajoute uniquement à la puissance.

Les packs généraux et ceux de l’entité **s’additionnent**. Pour activer un pack sur certaines entités seulement, le déclarer dans leurs entrées `entities`, sans le déclarer au niveau général. Un objet `packs: {}` dans une entité n’annule pas les packs généraux.

Les règles personnalisées restent activées ; `exclude_rules` permet d’en retirer certaines. Un ID dans `exclude_rules` n’exclut pas le pack qui porterait le même ID.

Les exclusions et `ignore_pending` modifient uniquement l’affichage de cette carte. Ils ne désactivent pas la détection ni les notifications dans Alert Manager. `ignore_pending: false` sur une entité peut réactiver son orange si l’option générale est `true`.

## Personnaliser les couleurs

Priorité, **séparément pour chaque état** : **pack de l’entité → entité → pack général → général → défaut rouge/orange**.

```yaml
alert_manager:
  packs:
    battery:
      colors:
        active: '#c62828'
        pending: '#ffb300'
  colors:
    active: '#d32f2f'
    pending: '#fb8c00'
  entities:
    sensor.frigo_temperature:
      colors:
        active: '#b71c1c'
```

La température utilise sa couleur d’entité lorsqu’une alerte est active ou acquittée. Pour ses alertes à venir du pack `battery`, la couleur du pack général s’applique ; pour une règle personnalisée, la couleur générale s’applique.

Pour personnaliser un pack sur une seule entité, utiliser exactement le même format sous cette entité :

```yaml
alert_manager:
  entities:
    sensor.frigo_temperature:
      packs:
        battery:
          colors:
            active: '#c62828'
            pending: '#ffb300'
```

Cet exemple active `battery` uniquement pour la température et choisit ses couleurs. Une couleur définie à ce niveau est prioritaire sur les couleurs générales de l’entité et du pack. Les états non renseignés héritent du niveau suivant ; déclarer un pack local avec `{}` conserve les couleurs héritées selon cette priorité.

Les valeurs acceptent une couleur CSS valide : hexadécimal, nom (`red`, `teal`…), `rgb(...)` ou variable (`var(--my-alert-color)`). Une couleur invalide conserve la couleur du niveau inférieur. Déclarer un pack avec ses couleurs suffit à l’activer ; aucune liste d’activation séparée n’est nécessaire.

| Situation | Affichage |
|---|---|
| Alerte active ou acquittée retenue | `active`, rouge par défaut |
| Alerte à venir retenue, sans active/acquittée | `pending`, orange par défaut |
| Aucune alerte retenue | Couleurs propres à la carte, aucun style ajouté |

Une alerte active ou acquittée gagne sur une alerte à venir, quelle que soit sa couleur personnalisée. À gravité égale, la première entité rencontrée dans la configuration de la carte gagne ; pour plusieurs alertes de cette entité, l’ID d’alerte le plus petit dans l’ordre lexical départage les couleurs. Réordonner les données reçues du manager ne change donc pas la couleur gagnante.

Les valeurs, switchs, autres sous-boutons et le fond de la carte conservent leur présentation. Les sélecteurs précis avec `!important` donnent priorité au module sur `signature` en alerte ; un style tiers plus précis peut encore les surcharger.

## Entités détectées et limites

La recherche couvre l’entité principale, les champs `entity`, `entity_id`, `entities`, `entity_ids` et `*_entity`, y compris les sous-boutons simples/groupés, les cibles d’actions et `secondary_entity`. Elle détecte aussi les ID littéraux entre guillemets dans les templates Jinja/JavaScript, ainsi que `states.sensor.nom` dans Jinja. Les doublons sont supprimés. Les cartes enfants ont leur propre périmètre de surveillance.

Un ID construit dynamiquement dans un template ne peut pas être déduit : l’ajouter dans `alert_manager.entities`. La présence d’une entité sous un bouton masqué ne la retire pas automatiquement de la surveillance ; utiliser `exclude: true` si nécessaire.

La disponibilité reste gérée par Bubble et le design de la carte. Le module ne lit pas les états des entités pour imposer du gris. Le pack `unavailable`, comme les autres packs automatiques, reste ignoré tant qu’il n’est pas ajouté explicitement.

## Données et performances

Trois capteurs sont lus : par défaut, `sensor.alert_manager_main_active`, `sensor.alert_manager_main_acknowledge` et `sensor.alert_manager_main_pending`, ou les identifiants configurés dans `sensors`.

Leurs attributs compacts conservent les ID stables : `rule:<rule_id>:<entity_id>` pour les règles personnalisées et `<pack_id>:…` pour les packs. Aucun nom traduit ni registre local de packs n’est nécessaire. L’index partagé conserve **un seul instantané par connexion HA** et se reconstruit quand l’un de ces trois objets d’état change, même à compteur constant. Chaque carte applique ensuite ses filtres et couleurs à cet index. Un compteur nul évite la lecture de sa liste d’alertes ; la découverte des entités et les options sont mises en cache jusqu’au remplacement de la configuration.

Aucun abonnement, appel externe, polling ou temporisateur ajouté. Les trois lectures restent visibles au moteur de dépendances Bubble sur les accès au cache. Sans entité surveillée, ou avec `alert_manager: false`, aucun accès HA pour cette fonctionnalité.

Seules les alertes présentes dans les attributs compacts peuvent être colorées. Si une liste est tronquée (`alerts_omitted`) ou si des données manquent, le module n’invente ni alerte ni couleur grise ; l’absence de couleur ne prouve pas l’absence d’une alerte omise.

Boutons, volets, thermostats et lecteurs multimédias sont pris en charge ; séparateurs, popups et sliders sont exclus. Les résumés de pièces ne nécessitent pas l’ajout du module : il reste activé carte par carte via `modules`.

## Installation

Installer Bubble Card et [Bubble Card Tools](https://github.com/Clooos/Bubble-Card-Tools), puis importer le fichier YAML complet depuis la section Modules de l’éditeur d’une carte. Ajouter `alert_manager` à la liste `modules` de chaque carte concernée. Les options de cette version se configurent en YAML : le fichier ne déclare pas encore de schéma `editor`.

L’intégration [Home Assistant Alert Manager](https://github.com/zoic21/ha_alert_manager) est requise. Vérifier que les trois capteurs mentionnés ci-dessus existent sous les identifiants utilisés et exposent les attributs compacts `alerts`. Adapter `sensors` si leurs identifiants ont été renommés. Un capteur absent ne fournit aucune alerte au module.

[Signature](../../signature/doc/README.md) est facultatif : le module fonctionne aussi sur les cartes Bubble natives. Importer les deux distributions si un exemple utilise les deux modules.

Après une mise à jour manuelle, réimporter le YAML puis recharger le frontend. Un commit dans ce dépôt n’actualise pas l’installation Home Assistant. Les cartes enfants nécessitent leur propre activation du module.

## Vérification dans Home Assistant

Sur une entité de test, vérifier une alerte personnalisée active, acquittée et à venir, une exclusion, puis l’ajout explicite d’un pack. Une alerte acquittée reste colorée en rouge tant qu’elle est présente dans le capteur correspondant. La disparition de toutes les alertes retenues rend ses couleurs ordinaires à la carte.

La vérification syntaxique du YAML/JavaScript ne valide pas le rendu ni les données d’une instance Home Assistant réelle. Vérifier le fonctionnement des capteurs compacts et la réactivité des cartes dans son installation.
