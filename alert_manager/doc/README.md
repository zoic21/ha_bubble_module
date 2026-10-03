# Bubble Alert Manager module 3.2.0

[Module to import](../dist/alert_manager.yaml), independent of `signature`. It colors only the main icon and its pastel background based on Alert Manager alerts. Thresholds and delays are not duplicated in cards.

Requires the [Home Assistant Alert Manager integration](https://github.com/zoic21/ha_alert_manager).

## Minimal configuration

Simply add the module to the card: **all its entities are monitored**, and **only custom rules are considered**.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.fridge_temperature
modules:
  - signature
  - alert_manager
signature:
  layout: compact
```

Place options under **`alert_manager`, at the card's root**.

The module can also be used on its own with native Bubble cards. With `signature`, either order works; placing `alert_manager` last is still recommended when using other modules.

## Options

| Option | Effect | Default |
|---|---|---|
| `sensors.active/pending` | IDs of the two source sensors | Sensors created by the integration by default |
| `packs.<pack_id>` | Enables a pack and optionally sets its `ignore_pending` and `colors.active/pending` | No packs enabled |
| `ignore_pending` | Hides pending alerts | `false` |
| `colors.active` | Active alert color | Theme red |
| `colors.pending` | Pending alert color | Theme orange |
| `entities.<entity_id>` | Overrides for a card entity, or adds an external entity | No overrides |
| `entities.<entity_id>.exclude` | `true` excludes the entire entity; a list excludes its rules or packs by ID | `[]` |

Each `entities` entry accepts `exclude`, `ignore_pending`, `packs.<pack_id>`, and `colors.active/pending`. Packs use the same configuration object globally and within an entity. Boolean options use only YAML booleans `true` and `false`.

To disable the module on a card, remove `alert_manager` from its `modules` list.

## Source sensors

Without configuration, the module reads the active and pending alert sensors created by the integration by default. If they have been renamed, specify their new IDs:

```yaml
alert_manager:
  sensors:
    active: sensor.my_active_alerts
    pending: sensor.my_pending_alerts
```

Each key is optional: an omitted key keeps its default ID. These options select alert sources; `entities` selects the entities to monitor. Source sensors must retain the counter and compact `alerts` attributes provided by the integration.

## Entity overrides

This card automatically monitors temperature and power. Pending power alerts are ignored; its notification rule is excluded, but its other errors are still considered. The switch is excluded entirely.

```yaml
entity: sensor.fridge_temperature
sub_button:
  main:
    - entity: sensor.fridge_plug_power
    - entity: switch.fridge_plug
modules:
  - signature
  - alert_manager
alert_manager:
  entities:
    sensor.fridge_plug_power:
      ignore_pending: true
      exclude:
        - fridge_notification
    switch.fridge_plug:
      exclude: true
```

`exclude` accepts either `true` to exclude the entire entity, or a list that can mix **custom rule IDs and pack IDs**. An empty list `[]`, `false`, or an omitted option leaves all alerts allowed by the other settings. Exclusions apply to active and pending alerts for that entity only.

Replace the example rule IDs with the actual IDs from your Alert Manager configuration. Filtering uses **IDs**, never display names, messages, or labels. A notification and an actual error on the same device therefore remain independent. If a rule and a pack share the same ID, both are excluded.

To add an entity that does not appear elsewhere in the card, declare it in `entities`, optionally with an empty object:

```yaml
alert_manager:
  entities:
    sensor.cellar_temperature: {}
```

## Enabling packs

Packs are declared by ID in a `packs` object, with no hardcoded list in the module. A future pack following Alert Manager's ID format will be supported immediately. A pack absent from the configuration remains ignored; an empty object `{}` is enough to enable it.

```yaml
alert_manager:
  packs:
    battery: {}
    connectivity: {}
  entities:
    sensor.fridge_plug_power:
      packs:
        flapping: {}
```

Here, `battery` and `connectivity` apply to all monitored entities. `flapping` is added only for the power sensor.

Global and entity packs **are cumulative**. To enable a pack for selected entities only, declare it in their `entities` entries without declaring it globally. A `packs: {}` object within an entity does not cancel global packs.

To exclude a pack for a single entity, add its ID to `exclude`, optionally alongside rule IDs:

```yaml
alert_manager:
  packs:
    battery: {}
    connectivity: {}
  entities:
    sensor.fridge_temperature:
      exclude:
        - battery
        - fridge_notification
```

Here, the temperature sensor ignores the `battery` pack and the `fridge_notification` rule while keeping `connectivity` and its other custom rules. Other entities keep both packs. **An exclusion takes precedence over pack activation**, whether the pack is declared globally or within that same entity.

Exclusions and `ignore_pending` affect only this card's display. They do not disable detection or notifications in Alert Manager.

## Pending alerts per pack

Each pack accepts `ignore_pending`, globally or within an entity, alongside `colors`:

```yaml
alert_manager:
  packs:
    battery:
      ignore_pending: true
      colors:
        active: '#c62828'
  entities:
    sensor.fridge_temperature:
      packs:
        battery:
          ignore_pending: false
```

Here, pending alerts from the `battery` pack are hidden except for the fridge temperature sensor. Active alerts remain visible; other packs and custom rules keep their own settings.

The priority is the same as for colors: **entity pack → entity → global pack → global → `false`**. An omitted option inherits from the next level. An explicit `false` restores pending alert display at its level, even if a less specific level hides it. For custom rules, only the entity setting followed by the global setting applies.

## Customizing colors

Priority, **independently for each state**: **entity pack → entity → global pack → global → red/orange default**.

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
    sensor.fridge_temperature:
      colors:
        active: '#b71c1c'
```

The temperature sensor uses its entity color when an alert is active. For its pending alerts from the `battery` pack, the global pack color applies; for a custom rule, the global color applies.

To customize a pack for a single entity, use exactly the same format under that entity:

```yaml
alert_manager:
  entities:
    sensor.fridge_temperature:
      packs:
        battery:
          colors:
            active: '#c62828'
            pending: '#ffb300'
```

This example enables `battery` only for the temperature sensor and sets its colors. A color defined at this level takes precedence over the entity and global pack colors. Omitted states inherit from the next level; declaring a local pack with `{}` keeps inherited colors according to this priority.

Values accept a valid CSS color: hexadecimal, a name (`red`, `teal`…), `rgb(...)`, or a variable (`var(--my-alert-color)`). An invalid color keeps the color from the lower level. Declaring a pack with its colors is enough to enable it; no separate activation list is needed.

| Situation | Display |
|---|---|
| Matching active alert | `active`, red by default |
| Matching pending alert, with no active alert | `pending`, orange by default |
| No matching alert | The card's own colors, with no added styling |

An active alert takes precedence over a pending alert, regardless of its custom color. At equal severity, the first entity encountered in the card configuration wins; for multiple alerts on that entity, the lexically smallest alert ID determines the color. Reordering data received from the manager therefore does not change the winning color.

Values, switches, other sub-buttons, and the card background retain their appearance. Specific selectors with `!important` give the module priority over `signature` during an alert; a more specific third-party style may still override them.

## Entity discovery and limitations

Discovery covers the main entity and the `entity`, `entity_id`, `entities`, `entity_ids`, and `*_entity` fields, including individual/grouped sub-buttons, action targets, and `secondary_entity`. It also detects quoted literal IDs in Jinja/JavaScript templates and `states.sensor.name` in Jinja. Duplicates are removed. Child cards have their own monitoring scope.

A dynamically constructed ID in a template cannot be inferred: add it to `alert_manager.entities`. An entity referenced by a hidden button is not automatically removed from monitoring; use `exclude: true` if needed.

Availability remains handled by Bubble and the card's design. The module does not read entity states to force a grey color. The `unavailable` pack, like other automatic packs, remains ignored until explicitly added.

## Data and performance

Two sensors are read: by default, `sensor.alert_manager_main_active` and `sensor.alert_manager_main_pending`, or the IDs configured in `sensors`.

Their compact attributes retain stable IDs: `rule:<rule_id>:<entity_id>` for custom rules and `<pack_id>:…` for packs. No translated name or local pack registry is needed. The shared index keeps **a single snapshot per HA connection** and rebuilds when either of these two state objects changes, even if the counter stays the same. Each card then applies its filters and colors to this index. A zero counter skips reading its alert list; entity discovery and options are cached until the configuration is replaced.

No subscriptions, external calls, polling, or timers are added. Both sensor reads remain visible to Bubble's dependency engine on cache hits. With no monitored entity, this feature does not access HA. Without `alert_manager` in `modules`, Bubble does not execute the module.

Only alerts present in the compact attributes can affect colors. If a list is truncated (`alerts_omitted`) or data is missing, the module does not invent alerts or add a grey color; the absence of a color does not prove there are no omitted alerts.

Buttons, covers, thermostats, and media players are supported; separators, popups, and sliders are excluded. Room summaries do not require the module to be added: it remains enabled per card through `modules`.

## Installation

Install Bubble Card and [Bubble Card Tools](https://github.com/Clooos/Bubble-Card-Tools), then import the complete YAML file from the Modules section of a card's editor. Add `alert_manager` to the `modules` list of each relevant card. Options in this version are configured in YAML: the file does not yet declare an `editor` schema.

The [Home Assistant Alert Manager integration](https://github.com/zoic21/ha_alert_manager) is required. Check that the two sensors listed above exist under the IDs you use and expose the compact `alerts` attributes. Adjust `sensors` if their IDs have been renamed. A missing sensor supplies no alerts to the module.

[Signature](../../signature/doc/README.md) is optional: the module also works on native Bubble cards. Import both distributions if an example uses both modules.

After a manual update, import the YAML again and reload the frontend. A commit in this repository does not update your Home Assistant installation. Child cards need their own module activation.

## Validation in Home Assistant

On a test entity, check active and pending custom alerts, an exclusion, and then explicitly enabling a pack. When all matching alerts disappear, the card returns to its normal colors.

YAML/JavaScript syntax checks do not validate rendering or data in a real Home Assistant instance. Check that the compact sensors work and cards respond correctly in your installation.
