# Signature Flow

Signature Flow displays up to six configurable blocks and their connections, with Signature typography, pastel icon backgrounds and 22 px corners. Each block can represent any measurement. Primary value, secondary value and animated flow can each use a different entity. There is no solar, grid, battery or water-specific behavior in the module.

## Installation

1. Import the complete [distribution](../dist/signature-flow.yaml) through Bubble Card Tools.
2. Add `signature_flow` to a Bubble `button` card with `button_type: state`.
3. Configure the numbered blocks under `signature_flow.slots`.

The folder and distribution are named `signature-flow`; the module ID and options key are `signature_flow`. Version: **3.0.1**. The module is self-contained; use it without the `signature` design module on the same card. Options are configured in YAML; there is no editor schema. Sliders and other card types are outside its scope.

Version 3 uses `primary` and `secondary` with the same entity, template and text behavior. It replaces slot-level `entity`, `state` and `secondary_entity`; formatting options become `primary_unit`, `primary_scale` and `primary_precision`, and primary value actions use `primary_*_action`. Replace the card configuration when importing this version. The [home configuration](../examples/home.yaml) preserves the existing sensors, forecast, battery power and percentage, water conversion and five popup hashes. It excludes the car charging card and leaves the section title outside the module. The corresponding popup cards must already exist. The outer Bubble card's `entity` remains unchanged.

## Slots and layout

`slots` is a mapping with keys `1` to `6`, not a YAML list. Every slot has the same options. Omit a slot or set `enabled: false` to hide its block and connection. Positions and connections follow the established layout.

| Slot | Desktop position | Mobile position | Positive flow direction |
|---|---|---|---|
| `1` | Upper center; moves left when slot 4 is shown | Upper left | Slot 1 → junction |
| `2` | Middle left | Middle left | Slot 2 → junction |
| `3` | Lower center | Lower left | Slot 3 → junction |
| `4` | Upper right | Upper right | Slot 4 → slot 5 |
| `5` | Middle right | Middle right | Junction → slot 5 |
| `6` | Lower right | Lower right | Slot 6 → slot 5 |

Negative measurements reverse those directions. Slots 4 and 6 connect independently to slot 5; their connections are hidden when slot 5 is absent. The junction is hidden when none of slots 1, 2, 3 or 5 is configured. No entity type is imposed on any slot.

At card widths below 490 px, slots 1, 2 and 3 form an aligned left column. Slots 4, 5 and 6 align on the right. All icons use the same size; slots 3 and 6 share label and value baselines. The layout responds to the card's width, including a narrow column in a wide browser.

The default height is **310 px** on mobile and desktop. The card fills its parent width; the home example reserves 12 columns and 5 rows in a Sections view. `height` accepts 280–600 px. Keep the dashboard row reservation consistent with a changed height. Hovering a block or value does not change its background.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.home_power
card_layout: large
grid_options:
  columns: 12
  rows: 5
modules:
  - signature_flow
signature_flow:
  slots:
    1:
      name: Production
      primary: sensor.production_power
      icon: mdi:white-balance-sunny
      color: '#ff9800'
    2:
      name: Connection
      primary: sensor.connection_power
      icon: mdi:transmission-tower
      color: '#00b8cf'
    3:
      name: Storage
      primary: sensor.storage_percentage
      flow_entity: sensor.storage_power
      secondary: sensor.storage_power
      secondary_precision: 0
      icon: mdi:battery
      color: '#009c90'
    5:
      name: Building
      primary: sensor.home_power
      icon: mdi:home-outline
```

## Slot options

| Option | Behavior |
|---|---|
| `enabled` | Show the configured slot. Default `true`; `false` hides it. |
| `primary`, `secondary` | An entity ID, Jinja template or fixed text. Primary appears as the large value; secondary appears below it. Empty secondary text hides it while preserving alignment. |
| `primary_unit`, `secondary_unit` | Override the displayed unit. Direct entity values use their entity unit by default. Templates and fixed text have no automatic unit; an explicit unit is appended. |
| `primary_scale`, `secondary_scale` | Multiply direct numeric entity values. Both default to `1`. Templates supply their own calculation. |
| `primary_precision`, `secondary_precision` | Fixed decimal places, 0–6, for direct numeric entity values. Both default to the entity's `display_precision`, then `0`. Templates supply their own formatting. |
| `name` | Label; accepts Jinja. Defaults to the primary entity's friendly name, then `Slot N` / `Emplacement N`. |
| `icon`, `color` | MDI icon and icon/connection color; accept Jinja. Icon defaults to the primary entity's `icon` attribute, then `mdi:flash`; color defaults to the theme secondary text color. Invalid colors use that neutral default. |
| `flow_entity` | Entity controlling arrow direction and speed. Defaults to `primary` only when it is a direct entity ID. Templates and fixed text require an explicit flow entity to animate. |
| `flow_scale` | Multiply the flow measurement. Defaults to `1` with an explicit `flow_entity`, otherwise to `primary_scale`. |
| `flow_unit` | Unit used for W/kW/MW normalization. Defaults to the explicit flow entity unit, or `primary_unit` / primary entity unit when using the default flow. Describes units; does not convert values by itself. |
| `invert_flow` | Reverse the signed flow convention. Default `false`; affects the arrow, not displayed values. |
| `animate` | Default `true`. Set `false` to keep the thin connection without an arrow. |
| `deadband` | Absolute threshold below which animation stops, after flow scaling. Default `0`. `signature_flow.deadband` sets a common default. |
| `animation_reference` | Per-slot measurement at which speed reaches its maximum, in scaled flow units. |

For direct entities, a missing, blank, non-finite, `unknown` or `unavailable` primary measurement displays `—` without a unit. An unavailable secondary measurement displays `Unavailable` / `Indisponible`. Other nonnumeric entity states are displayed as text. A valid explicit flow can animate even when either display measurement is unavailable. A missing or nonnumeric flow stops the arrow while retaining available display values.

### Entities, templates and text

The same rules apply to both display fields:

```yaml
signature_flow:
  slots:
    3:
      name: Storage
      primary: sensor.storage_power
      secondary: "{{ states('sensor.storage_percentage') | int }} %"
```

An entity ID alone reads and formats its state and unit. A template displays its rendered result as text, without further scaling or numeric formatting. A plain string displays fixed text. Explicit units can be appended to all three forms; include a unit either in the template or in the unit option to avoid duplication.

The default more-info target is the direct entity ID, or the first literal entity reference in a template, in textual order. Detection supports quoted IDs used by `states(...)`, `state_attr(...)`, `is_state(...)` or a variable assignment such as `{% set id = 'sensor.forecast' %}`, and dotted references such as `states.sensor.forecast.state`. Detection does not evaluate Jinja or resolve entity IDs assembled dynamically. Templates with no detectable entity and fixed text have no default action. Configure an explicit action when the first entity is not the desired target.

The inferred entity supplies the template's `entity` context and primary name/icon metadata. It does not supply a template's display unit or control its flow. Jinja expressions referring only to `entity` or to a dynamically built ID cannot infer a target on their own. Numeric templates still require `flow_entity` for animation, because a calculation may combine several sensors.

The module uses Home Assistant's language and number-format preference for automatic numeric values. Explicit names and Jinja text remain as configured. `signature_flow.name` sets the accessible group label; its default is `Flows` / `Flux`.

Long numbers fit their slot's available width without reducing the unit size. Short values keep the normal font size. Slot 2 starts its connection 12 px after the displayed value and unit. In mobile layout, slots 1 and 3 do the same for their horizontal segments before joining the center axis. Their available value width is capped to retain this gap even for large readings. Short readings have longer connections; when an origin changes, the arrow keeps its physical position on the shared visible path, including beyond the bend. Desktop vertical paths and the right-hand connections retain their positions. Keep long names and secondary text concise; below 320 px, consider displaying power in kW.

## Actions

| Target | Configuration | Default |
|---|---|---|
| Block icon/name | `tap_action`, `hold_action`, `double_tap_action` | Tap/hold: detected primary more-info; double tap: none |
| Primary value | `primary_tap_action`, `primary_hold_action`, `primary_double_tap_action` | Tap/hold: detected primary more-info; double tap: none |
| Secondary text | `secondary_tap_action`, `secondary_hold_action`, `secondary_double_tap_action` | Tap/hold: detected secondary more-info; double tap: none |

These are native Bubble/Home Assistant action objects. Explicit actions override inferred defaults. Without a detected entity, defaults are `none`; explicit actions still work. Empty or decorative secondary text lets taps reach the block. Enter/Space activates the focused target's tap action. Focus outlines appear for keyboard navigation; restored focus after pointer/touch more-info does not leave a frame around the value.

```yaml
signature_flow:
  slots:
    6:
      name: Water
      primary: sensor.water_flow
      icon: mdi:water-outline
      color: '#6ab5f4'
      primary_scale: 1000
      primary_unit: L/min
      primary_precision: 1
      animation_reference: 20
      tap_action:
        action: navigate
        navigation_path: '#water-details'
      primary_tap_action:
        action: more-info
```

To open a different entity from a calculated value, specify it in the action:

```yaml
signature_flow:
  slots:
    3:
      primary: "{{ states('sensor.storage_power') | float + states('sensor.production_power') | float }}"
      flow_entity: sensor.storage_power
      primary_tap_action:
        action: more-info
        entity: sensor.production_power
```

Add the other slots as needed; slot 6's connection appears when slot 5 is configured. Add slot 4 for a block above slot 5, using exactly the same options.

## Arrow speed

Speed increases linearly with the absolute scaled flow. Defaults are **4–40 px/s**, reaching the maximum at a reference of **10,000**. For W/kW/MW flow units, the global reference is in watts and values are normalized. Other units use the reference directly; a per-slot `animation_reference` is appropriate for water, current or other measurements. The home configuration reaches its water maximum at **20 L/min**.

```yaml
signature_flow:
  animation:
    min_speed: 4
    max_speed: 40
    reference: 10000
```

Above the reference, speed stays capped. Equal flow has equal physical speed on different connections; traversal time depends on path length. An explicit dashboard setting overrides a module default.

Each connection reuses a native Web Animation. Flow changes adjust playback rate without resetting position. When flow changes sign, the arrow turns over 180 ms and travels back from its current point. Zero or unavailable flows hide and pause the arrow; it resumes there when flow returns, including in the opposite direction. Reduced-motion preferences show a stationary arrow. These are signed net measurements; the module does not calculate allocation between sources and destinations.

## Runtime and validation

DOM nodes, number formatters, paths and animations are reused on sensor updates. When a target entity or configured action changes, only that action element is replaced, preserving its child content and ongoing flow animations; this refreshes Bubble's cached pointer handler. Every evaluation reads the visible slots' direct or inferred display entities and flow entities through Bubble's tracked `hass` object. Source detection is cached in a bounded map; rendered results and entity states are refreshed on each evaluation. Jinja uses Bubble's `renderTemplate` helper and its native template subscriptions. The module adds no polling, service call, direct WebSocket subscription or global CSS injection. One `ResizeObserver` adjusts paths after layout changes. Changed display values and resizing coalesce text fitting into one scheduled frame; slot 2's connection and the mobile connections from slots 1 and 3 then follow their fitted text widths. Measurements are batched before path writes. The other connections reuse their existing geometry during sensor updates. There is no JavaScript animation loop.

Teardown cancels animations and pending text fitting, then removes the observer, reduced-motion listener, input-mode handlers and custom DOM. Text and template results are inserted as text, never as HTML.

This module replaces native button content. Alert Manager's native main-icon badge is not exposed on custom slots; no per-slot alert integration is included.

Run `npm run test:signature-flow` or `npm test` from the repository root. Tests read the actual distribution and check generic slots, symmetric entity/template/text values, inferred targets, independent flow entities, formatting, visibility, explicit actions, tracked reads, reversals, pause/resume, layout and teardown. Browser checks use the real Bubble bundle with simulated Home Assistant data to verify responsive layouts, text clearance, actions, restored focus, keyboard navigation, native motion and cleanup. A live Home Assistant installation remains the final check for its popup definitions, sensor conventions and templates.
