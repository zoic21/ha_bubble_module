# Signature Flow

Signature Flow displays up to six configurable blocks and their connections, with Signature typography, pastel icon backgrounds and 22 px corners. Each block can represent any measurement. Primary value, secondary value and animated flow can each use a different entity. There is no solar, grid, battery or water-specific behavior in the module.

## Installation

1. Import the complete [distribution](../dist/signature-flow.yaml) through Bubble Card Tools.
2. Add `signature_flow` to a Bubble `button` card with `button_type: state`.
3. Configure the numbered blocks under `signature_flow.slots`.

The folder and distribution are named `signature-flow`; the module ID and options key are `signature_flow`. Version: **2.0.1**. The module is self-contained; use it without the `signature` design module on the same card. Options are configured in YAML; there is no editor schema. Sliders and other card types are outside its scope.

Version 2 replaces the former named `solar`, `grid`, `battery`, `home`, `top` and `bottom` options with `slots`. Replace the card configuration when importing this version. The [home configuration](../examples/home.yaml) uses the new schema and preserves the existing sensors, forecast, battery percentage and power, water conversion and five popup hashes. It excludes the car charging card and leaves the section title outside the module. The corresponding popup cards must already exist.

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
      entity: sensor.production_power
      icon: mdi:white-balance-sunny
      color: '#ff9800'
    2:
      name: Connection
      entity: sensor.connection_power
      icon: mdi:transmission-tower
      color: '#00b8cf'
    3:
      name: Storage
      entity: sensor.storage_percentage
      flow_entity: sensor.storage_power
      secondary_entity: sensor.storage_power
      secondary_precision: 0
      icon: mdi:battery
      color: '#009c90'
    5:
      name: Building
      entity: sensor.home_power
      icon: mdi:home-outline
```

## Slot options

| Option | Behavior |
|---|---|
| `enabled` | Show the configured slot. Default `true`; `false` hides it. |
| `entity` | Primary measurement and default more-info target. |
| `name` | Label; accepts Jinja. Defaults to the entity's friendly name, then `Slot N` / `Emplacement N`. |
| `icon`, `color` | MDI icon and icon/connection color; accept Jinja. Icon defaults to the entity's `icon` attribute, then `mdi:flash`; color defaults to the theme secondary text color. Invalid colors use that neutral default. |
| `unit` | Display unit; defaults to the primary entity unit. |
| `scale` | Multiply the primary numeric value. Default `1`. Also scales the flow when no separate `flow_entity` or `flow_scale` is provided. |
| `precision` | Fixed decimal places, 0–6. Defaults to the entity `display_precision`, then `0`, for every slot. |
| `state` | Jinja or plain text replacing the primary value. Set `unit` separately if needed. The flow still uses its numeric entity state. |
| `secondary` | Jinja or plain text below the primary value. An empty string hides it while preserving alignment. |
| `secondary_entity` | Secondary measurement, template dependency and default secondary more-info target. Without `secondary`, its numeric state and unit are displayed. |
| `secondary_scale` | Multiply the automatic secondary numeric value. Default `1`. |
| `secondary_unit` | Override the automatic secondary unit. Defaults to the secondary entity unit. |
| `secondary_precision` | Decimal places for the automatic secondary value. Default `1`. |
| `flow_entity` | Entity controlling arrow direction and speed. Defaults to `entity`; independent of display values. |
| `flow_scale` | Multiply the flow measurement. Defaults to `1` with a separate `flow_entity`, otherwise to `scale`. |
| `flow_unit` | Unit used for W/kW/MW normalization. Defaults to the separate flow entity unit, or the primary display unit when using the primary entity. Describes units; does not convert values by itself. |
| `invert_flow` | Reverse the signed flow convention. Default `false`; affects the arrow, not displayed values. |
| `animate` | Default `true`. Set `false` to keep the thin connection without an arrow. |
| `deadband` | Absolute threshold below which animation stops, after flow scaling. Default `0`. `signature_flow.deadband` sets a common default. |
| `animation_reference` | Per-slot measurement at which speed reaches its maximum, in scaled flow units. |

A missing, blank, non-finite, `unknown` or `unavailable` primary measurement displays `—` without a unit. An unavailable automatic secondary measurement displays `Unavailable` / `Indisponible`. A valid separate flow can animate even when the primary measurement is unavailable. A missing flow stops the arrow while retaining available display values.

The module uses Home Assistant's language and number-format preference for automatic numeric values. Explicit names and Jinja text remain as configured. `signature_flow.name` sets the accessible group label; its default is `Flows` / `Flux`.

Long numbers fit their slot's available width without reducing the unit size. Short values keep the normal font size. Slot 2 starts its connection 12 px after the displayed value and unit, so short readings have a longer connection while large readings retain a safe gap. When that starting point changes, the arrow keeps its physical position within the visible connection. Keep long names and secondary text concise; below 320 px, consider displaying power in kW.

## Actions

| Target | Configuration | Default |
|---|---|---|
| Block icon/name | `tap_action`, `hold_action`, `double_tap_action` | Tap/hold: primary more-info; double tap: none |
| Primary value | `value_tap_action`, `value_hold_action`, `value_double_tap_action` | Tap/hold: primary more-info; double tap: none |
| Secondary text | `secondary_tap_action`, `secondary_hold_action`, `secondary_double_tap_action` | Tap/hold: secondary more-info; double tap: none |

These are native Bubble/Home Assistant action objects. Without an entity, defaults are `none`; explicit actions still work. Empty or decorative secondary text lets taps reach the block. Enter/Space activates the focused target's tap action. Focus outlines appear for keyboard navigation; restored focus after pointer/touch more-info does not leave a frame around the value.

```yaml
signature_flow:
  slots:
    6:
      name: Water
      entity: sensor.water_flow
      icon: mdi:water-outline
      color: '#6ab5f4'
      scale: 1000
      unit: L/min
      precision: 1
      animation_reference: 20
      tap_action:
        action: navigate
        navigation_path: '#water-details'
      value_tap_action:
        action: more-info
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

DOM nodes, number formatters, paths and animations are reused. Every evaluation reads the visible slots' primary, secondary and flow entities through Bubble's tracked `hass` object. Jinja uses Bubble's `renderTemplate` helper and its native template subscriptions. The module adds no polling, service call, direct WebSocket subscription or global CSS injection. One `ResizeObserver` adjusts paths after layout changes. Changed display values and resizing coalesce text fitting into one scheduled frame; slot 2's connection then follows its fitted text width. Other connections reuse their existing geometry during sensor updates. There is no JavaScript animation loop.

Teardown cancels animations and pending text fitting, then removes the observer, reduced-motion listener, input-mode handlers and custom DOM. Text and template results are inserted as text, never as HTML.

This module replaces native button content. Alert Manager's native main-icon badge is not exposed on custom slots; no per-slot alert integration is included.

Run `npm run test:signature-flow` or `npm test` from the repository root. Tests read the actual distribution and check generic slots, independent primary/secondary/flow entities, formatting, visibility, actions, tracked reads, reversals, pause/resume, layout and teardown. Browser checks use the real Bubble bundle with simulated Home Assistant data to verify responsive layouts, text clearance, actions, restored focus, keyboard navigation, native motion and cleanup. A live Home Assistant installation remains the final check for its popup definitions, sensor conventions and templates.
