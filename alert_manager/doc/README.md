# Bubble Alert Manager module 3.4.2

[Module to import](../dist/alert_manager.yaml), independent of `signature`. It adds a small alert badge at the main icon's upper-right corner, red for active alerts and orange for pending alerts by default. Custom alert colors take precedence. The card retains its own colors unless card tint is enabled; the main device icon and its background are never recolored by this module. Thresholds and delays are not duplicated in cards.

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
| `packs.<pack_id>` | Enables a pack and optionally sets its `ignore_pending`, `colors.active/pending`, and `icons.active/pending` | No packs enabled |
| `ignore_pending` | Hides pending alerts | `false` |
| `show_badge` | Shows a badge for the selected alert; `false` hides it independently of card tint | `true` |
| `color_card` | Tints the card with the selected alert color at 16% | `false` |
| `color_badge` | Uses the selected alert color for the badge icon and outline; `false` keeps it black | `true` |
| `icons.active` | Active badge icon | `mdi:exclamation` |
| `icons.pending` | Pending badge icon | `mdi:clock-outline` |
| `colors.active` | Active alert color | Theme red |
| `colors.pending` | Pending alert color | Theme orange |
| `entities.<entity_id>` | Overrides for a card entity, or adds an external entity | No overrides |
| `entities.<entity_id>.exclude` | `true` excludes the entire entity; a list excludes its rules or packs by ID | `[]` |

Each `entities` entry accepts `exclude`, `ignore_pending`, `packs.<pack_id>`, `colors.active/pending`, and `icons.active/pending`. Packs use the same configuration object globally and within an entity. `show_badge`, `color_card`, and `color_badge` are general card options, not entity or pack overrides. Only the YAML boolean `true` enables card tint. Only the YAML boolean `false` disables badge coloring or hides badges.

To disable the module on a card, remove `alert_manager` from its `modules` list.

## Alert badges

Badges are enabled by default and follow the selected alert:

- **Active:** a small circular badge with `!`, red by default.
- **Pending:** a small clock, orange by default, unless that pending alert is ignored.
- **No matching alert:** no badge or alert tint; the card returns to its normal appearance.

The badge icon and outline use the selected alert color by default, on a white surface with an outer ring matching the theme. Set `color_badge: false` to keep them black. The white surface keeps the symbol readable in light and dark themes. It overlays the main icon without changing the card's layout or intercepting its actions. The device icon and its own background remain unchanged.

To hide badges for all monitored entities and packs on a card, use the general option. An explicitly enabled card tint remains active:

```yaml
alert_manager:
  show_badge: false
```

This option belongs directly under `alert_manager`, alongside `ignore_pending` and `colors`; it is not an entity or pack option. Only the YAML boolean `false` disables badges. Omit it or set `true` to restore them. Like the module's other general options, its scope is the current card, not other cards in the dashboard.

Exclusions, pack activation, source sensor settings, and pending policies apply equally to colors and badges. Acknowledged alerts remain outside this module's monitored sources, and missing or truncated source data does not create an uncertainty badge.

## Card and badge colors

These switches are independent: badge coloring is enabled by default, while card tint is disabled. To also tint the card, enable `color_card`:

```yaml
alert_manager:
  color_card: true
  color_badge: true
```

`color_card: true` tints the card background using the selected alert color at 16%, mixed with the theme's surface. Only the YAML boolean `true` enables it. Badge coloring uses that same alert color for the symbol and outline, keeping its white surface. Omit `color_badge` or set it to `true` to retain this default. Only the YAML boolean `false` disables badge coloring; strings such as `'false'` do not disable it.

To keep badges black while leaving the card's appearance unchanged:

```yaml
alert_manager:
  color_badge: false
```

This also works with `color_card: true` if a tinted card with a black badge is preferred.

The main device icon and its background remain under native Bubble/Signature control in every combination. There is no option to recolor the main icon. Each switch uses the same selected alert and the existing `colors` hierarchy below; neither adds new alert sources.

## Custom badge icons

Configure `icons.active` and `icons.pending` at the same levels as `colors`. Priority, independently for each state: **entity pack → entity → global pack → general → default**.

```yaml
alert_manager:
  icons:
    active: mdi:exclamation
    pending: mdi:clock-outline
  packs:
    battery:
      icons:
        active: mdi:battery-alert
  entities:
    sensor.fridge_temperature:
      icons:
        active: mdi:fridge-alert
      packs:
        battery:
          icons:
            pending: mdi:flash
```

For the fridge temperature sensor, an active alert uses `mdi:fridge-alert`, including an active battery alert. Its pending battery alert uses `mdi:flash`; its pending custom rule uses the general clock icon. Other monitored entities use the battery icon for active battery alerts. As with colors, declaring a pack with `icons` enables that pack at its declared scope.

Use Home Assistant icon names in `namespace:name` format, such as `mdi:flash`. The native `ha-icon` component renders them; the corresponding icon set must exist in Home Assistant. Empty, invalid, or omitted values inherit from the next level independently for each state. Changing badge icons does not change the device icon, filters, or chosen alert.

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

These colors apply to badges by default, unless `color_badge: false` is set, and to the card only when `color_card: true` is set. They never change the device icon.

```yaml
alert_manager:
  color_badge: true
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
  color_badge: true
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
| Matching active alert | `!` badge using `active`, red by default; black with `color_badge: false` |
| Matching pending alert, with no active alert | Clock badge using `pending`, orange by default; black with `color_badge: false` |
| No matching alert | The card's own colors, with no badge or added styling |

An active alert takes precedence over a pending alert, regardless of its custom color. At equal severity, the first entity encountered in the card configuration wins; for multiple alerts on that entity, the lexically smallest alert ID determines the color and badge. Reordering data received from the manager therefore does not change the winning color.

Values, switches, other sub-buttons, and the main icon retain their appearance. The card background changes only with `color_card: true`. Specific selectors with `!important` give the optional card tint priority over `signature`; a more specific third-party style may still override it.

## Entity discovery and limitations

Discovery covers the main entity and the `entity`, `entity_id`, `entities`, `entity_ids`, `primary`, `secondary`, and `*_entity` fields, including individual/grouped sub-buttons, action targets, direct Signature secondary values, and Signature Flow measurements. It also detects quoted literal IDs in Jinja/JavaScript templates and `states.sensor.name` in Jinja. Duplicates are removed. Child cards have their own monitoring scope.

A dynamically constructed ID in a template cannot be inferred: add it to `alert_manager.entities`. An entity referenced by a hidden button is not automatically removed from monitoring; use `exclude: true` if needed.

Availability remains handled by Bubble and the card's design. The module does not read entity states to force a grey color. The `unavailable` pack, like other automatic packs, remains ignored until explicitly added.

## Data and performance

Two sensors are read: by default, `sensor.alert_manager_main_active` and `sensor.alert_manager_main_pending`, or the IDs configured in `sensors`.

Their compact attributes retain stable IDs: `rule:<rule_id>:<entity_id>` for custom rules and `<pack_id>:…` for packs. No translated name or local pack registry is needed. The shared index keeps **one snapshot per HA connection and source sensor pair**, so cards using different sources do not evict each other's index. For sensors exposing `alerts_revision`, the index rebuilds when the revision, counter, or `last_changed` changes; history-only updates reuse it. The timestamp also distinguishes a recreated sensor with the same revision and count. Sources without a revision rebuild when their state object changes. Each card then applies its filters and colors to this index. A zero counter skips reading its alert attributes; entity discovery and options are cached until the configuration is replaced.

No subscriptions, external calls, polling, or timers are added. Both sensor reads remain visible to Bubble's dependency engine on cache hits. With no monitored entity, this feature does not access HA. Without `alert_manager` in `modules`, Bubble does not execute the module.

Only alerts present in the compact attributes can affect colors. If a list is truncated (`alerts_omitted`) or data is missing, the module does not invent alerts or add a grey color; the absence of a color does not prove there are no omitted alerts.

Buttons, covers, thermostats, and media players are supported; separators, popups, and sliders are excluded. Room summaries do not require the module to be added: it remains enabled per card through `modules`.

## Installation

Install Bubble Card and [Bubble Card Tools](https://github.com/Clooos/Bubble-Card-Tools), then import the complete YAML file from the Modules section of a card's editor. Add `alert_manager` to the `modules` list of each relevant card. Options in this version are configured in YAML: the file does not yet declare an `editor` schema.

The [Home Assistant Alert Manager integration](https://github.com/zoic21/ha_alert_manager) is required. Check that the two sensors listed above exist under the IDs you use and expose the compact `alerts` attributes. Adjust `sensors` if their IDs have been renamed. A missing sensor supplies no alerts to the module.

[Signature](../../signature/doc/README.md) is optional: the module also works on native Bubble cards. Import both distributions if an example uses both modules.

After a manual update, import the YAML again and reload the frontend. A commit in this repository does not update your Home Assistant installation. Child cards need their own module activation.

## Validation in Home Assistant

On a test entity, check active and pending custom alerts, an exclusion, and then explicitly enabling a pack. Verify red active and orange pending badges and unchanged card/device colors with no options. Check `color_badge: false` for black badges, then restore the default by removing that option. Enable `color_card` separately, including custom colors and both light and dark themes. Check icon overrides at every level and the fallback for an omitted state. Set `show_badge: false`: the badge should disappear while any enabled card tint remains. When all matching alerts disappear, the tint and badge disappear. Check that the device icon stays unchanged, including its actions and other commands on narrow and wide screens.

YAML/JavaScript syntax checks do not validate rendering or data in a real Home Assistant instance. Check that the compact sensors work and cards respond correctly in your installation.

## Release notes

### 3.4.2 — 4 October 2026

- Discovers direct entity IDs in `primary` and `secondary`, so Signature 2 secondary values and Signature Flow measurements remain monitored without auxiliary entity fields.
- Discovery remains cached per card configuration; alert source reads and filtering are unchanged.

### 3.4.1 — 4 October 2026

- Enables badge coloring by default: red for active alerts and orange for pending alerts, with the existing custom color hierarchy taking precedence.
- Keeps `color_badge: false` as an explicit opt-out for black badge icons and outlines.
- Card tint still requires `color_card: true`; the main device icon and its background remain unchanged. Badge icons, filtering, source sensors, and caching retain their existing behavior.
- Verification: 108 automated repository tests passed. Browser checks with simulated HA data covered 11 configurations and 38 scenarios (418 card/scenario checks), including red/orange defaults and black opt-out in light and dark themes, custom colors, unchanged main icons and card dimensions, native actions, and cleanup. No added template subscriptions or browser errors. Real Home Assistant installation remains to be tested.

### 3.4.0 — 4 October 2026

- Defaults to a black alert badge, preserving the card's own colors.
- Adds independent `color_card` and `color_badge` switches, disabled by default. The main icon and its background are never recolored.
- Adds `icons.active/pending` with the same per-state entity-pack/entity/pack/general priority as colors, using native Home Assistant icons.
- Reuses one badge node per active card and removes it on resolution, exclusion, badge disablement, container replacement, or teardown. A leftover node stays hidden when the module's CSS is removed.
- Migration from 3.3.0: opt into `color_card` and/or `color_badge` when desired. Defining colors alone no longer changes the display. The previous automatic main-icon coloring is removed.
- Verification: 108 automated repository tests passed. Browser checks with simulated HA data covered 11 configurations and 32 scenarios (352 card/scenario checks), independent color switches, icon overrides and fallback, both module orders, light/desktop and dark/narrow screens, unchanged main icons and dimensions, native actions, resolution, module removal, and cleanup. No added template subscriptions or browser errors. Real Home Assistant installation remains to be tested.

### 3.3.0 — 4 October 2026

- Adds active (`!`) and pending (clock) badges, enabled by default, with the selected alert's custom color.
- Adds the general `show_badge: false` option to retain alert colors without badges on a card.
- Preserves source sensors, exclusions, pending masks, shared caching, native commands, and card dimensions.
- Verification: 98 automated repository tests passed. Browser checks with simulated HA data covered 11 configurations and 19 scenarios (209 card/scenario checks), both module orders, custom colors, light/desktop and dark/narrow screens, option changes without new sensor data, resolution, module removal, cleanup, and native actions. No added template subscriptions or browser errors. Real Home Assistant installation remains to be tested.
