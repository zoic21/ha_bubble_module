# Signature Flow

Signature Flow displays instantaneous solar, grid, home and battery power in one neutral card, with the typography, pastel icon backgrounds and 22 px corners of Signature. Battery state of charge remains the main battery value; its power appears below. Optional sources above and below Home connect directly to Home, independently of the electricity junction. Battery and the bottom source share the same label and value baselines.

## Installation

1. Import the complete [distribution](../dist/signature-flow.yaml) through Bubble Card Tools.
2. Add `signature_flow` to the `modules` list of a Bubble `button` card with `button_type: state`.
3. Configure its nodes under `signature_flow`. The module is self-contained: use it without the `signature` design module on this card.

The folder and distribution are named `signature-flow`; the YAML module ID and options key are `signature_flow`. Version: **1.0.2**. Options are configured in YAML; this module has no editor schema. Sliders and other card types are outside its scope.

[Home configuration](../examples/home.yaml) contains the existing sensors, the remaining solar forecast, battery charge and power, water conversion, and the five existing popup hashes. It replaces the five Energy/Water cards, excludes the car charging card, and leaves the section title outside the module. It does not create popup cards: the corresponding popups must already exist in the view. Importing the module does not modify the dashboard.

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
  solar:
    entity: sensor.solar_power
  grid:
    entity: sensor.grid_power
  home:
    entity: sensor.home_power
  battery:
    entity: sensor.battery_soc
    power_entity: sensor.battery_power
```

## Nodes and layout

`solar`, `grid`, `home` and `battery` always have a place. Missing or unavailable measurements display `—` without a unit and stop the corresponding animation. `top` and `bottom` are optional; omit the object or set `enabled: false` to hide it. Both can be enabled together. With a top source, Solar moves left to prevent a collision. At card widths below 490 px, Solar, Grid and Battery form an aligned left column, with Home and its optional sources on the right. The connections join a shared vertical axis. All node icons use the same size. The optional sources align with Home. The layout responds to the card's width, including in a wide browser with a narrow dashboard column. Hovering a block or value does not change its background.

The default card height is **310 px**, matching the agreed mockup, across mobile and desktop. The card fills its parent's width; the example reserves 12 columns and 5 rows in a Sections view. `height` can be set from 280 to 600 px. Keep the dashboard row reservation consistent with a changed height. At widths below 320 px or with unusually long values, use shorter names/secondary text or scale power to kW.

| Node option | Behavior |
|---|---|
| `entity` | Main measurement and value more-info target. |
| `name`, `icon`, `color` | Override label, MDI icon and icon/connection color. These accept Jinja. Invalid colors use the default. |
| `unit` | Override the displayed unit; defaults to the entity unit. |
| `scale` | Multiply the main numeric value and its flow measurement. Defaults to `1`. |
| `precision` | Fixed decimal places, 0–6. Defaults to entity `display_precision`, then 0 for main nodes and 1 for optional sources. |
| `state` | Optional Jinja or plain text replacing the main value. Include a separate `unit` if needed. Flow direction still uses the entity's numeric state. |
| `secondary` | Optional Jinja or plain text. An empty string hides the text while preserving alignment. |
| `secondary_entity` | Dependency and more-info target of the secondary text. Without `secondary`, its numeric state and unit are displayed. |
| `secondary_precision` | Decimal places for the automatic secondary measurement. Default `1`. |
| `tap_action`, `hold_action`, `double_tap_action` | Native Bubble/Home Assistant actions for the block. Tap and hold default to more-info; double tap defaults to none. |
| `invert_flow` | Reverse the signed sensor convention. Default `false`. |
| `deadband` | Absolute numeric threshold below which animation stops; applied after scaling. Default `0`. A global `signature_flow.deadband` supplies the default for all nodes. |
| `animation_reference` | Optional reference for reaching the maximum arrow speed, in this node's scaled flow units. Useful for water or other non-power sources. |

Battery also supports `power_entity`, `power_scale` (default 1), `power_unit` (entity unit by default), and `power_precision` (default 0). They affect its flow and automatic secondary text independently of the SoC display. `secondary` overrides the automatic charge/discharge text. Grid has no automatic import/export subtitle; its signed value and animated arrow show the direction. Optional sources use the same node options as the main nodes; their primary numeric entity controls their own connection to Home.

The module respects Home Assistant's language and number-format preference. Default labels and flow descriptions are French for a French interface and English otherwise. Override names and secondary text for other languages. `signature_flow.name` overrides the accessible group label.

## Arrow speed

Arrow speed increases linearly with the absolute flow measurement. Equal power moves at the same speed on different connections; the time to traverse a connection depends on its length. The default range is **4–20 pixels per second**, reaching the maximum at **10,000 W**. Small grid imports/exports remain slow, while larger solar, home or battery power gradually speeds up. Zero or unavailable flows have no arrow.

```yaml
signature_flow:
  animation:
    min_speed: 4
    max_speed: 20
    reference_power: 10000
```

`min_speed` and `max_speed` are pixels per second; `reference_power` is watts. The module normalizes W/kW/MW power units, including configured display scaling. Above the reference, speed remains capped. A node's `animation_reference` overrides the reference in its scaled flow units: the home example uses `20` for water measured in L/min. Sensor updates change only the animation duration, without measuring geometry again or adding a JavaScript animation loop.

## Direction and interactions

| Measurement | Positive | Negative |
|---|---|---|
| Solar | Solar → junction | Junction → Solar |
| Grid | Grid → junction (import) | Junction → Grid (export) |
| Home | Junction → Home | Home → junction |
| Battery `power_entity` | Battery → junction (discharge) | Junction → Battery (charge) |
| Top/bottom source | Source → Home | Home → source |

Battery's default convention matches the existing Zendure sensor. Set `invert_flow: true` for a sensor using the opposite convention. A moving chevron follows each active connection in its flow direction. Zero and unavailable measurements keep the thin connection visible, with no arrow. Reduced-motion preferences display a stationary arrow instead. These are instantaneous **net flows** at one common junction; the module does not calculate the portion of solar sent to each destination. Connections between electrical sensors must be configured in compatible power units.

Tap a block's icon or name to run its configured action, such as opening a Bubble popup with `action: navigate` and `navigation_path: '#water-details'`. Tap its main value to open entity more-info. The battery power line opens the power entity; a secondary line with `secondary_entity` opens that entity. Keyboard Enter/Space activates a focused block or value. Pointer taps, holds and double taps use Bubble's delegated action handler. Focus outlines appear for keyboard navigation; a restored focus after pointer/touch more-info does not leave a frame around the value.

The optional top source can be added with:

```yaml
signature_flow:
  # Keep the existing solar/grid/home/battery/bottom configuration here.
  top:
    entity: sensor.other_source_power
    name: Source
    icon: mdi:flash
    unit: W
    precision: 0
    tap_action:
      action: navigate
      navigation_path: '#other-source-details'
```

## Runtime and validation

DOM nodes, number formatters and paths are reused. Every evaluation reads the configured entities through Bubble's tracked `hass` object; Jinja uses Bubble's `renderTemplate` helper. There is no polling, service call, extra WebSocket subscription or global CSS injection. A single `ResizeObserver` per card adjusts paths on size changes. Teardown removes it, the keyboard/input-mode handlers and the custom DOM. Text and template results are inserted as text, never as HTML.

This module replaces the native button content. Alert Manager's native main-icon badge is therefore not exposed on the custom flow nodes; no per-node alert integration is included in this first version.

Run `npm run test:signature-flow` or `npm test` from the repository root. Tests use the actual distribution to check directions, connection alignment, unavailable states, scaling, localization, dependency reads, native action bindings, configuration changes and teardown. Browser checks additionally verify mobile/desktop layouts and responsive boundaries from 320 to 498 px, both optional sources, icon sizes, baselines, moving arrow positions/directions, hover backgrounds, actions and reduced motion. A live Home Assistant installation remains the final check for its own popup definitions, sensor sign conventions and template results.
