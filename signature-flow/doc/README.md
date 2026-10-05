# Signature Flow

Signature Flow displays up to six configurable blocks and their connections, with Signature typography, pastel icon backgrounds and 22 px corners. Each block can represent any measurement. Primary value, secondary value and animated flow can each use a different entity. There is no solar, grid, battery or water-specific behavior in the module.

## Installation

1. Import the complete [distribution](../dist/signature-flow.yaml) through Bubble Card Tools.
2. Add `signature_flow` to a Bubble `button` card with `button_type: state`.
3. Open **Modules → Signature Flow** and configure the numbered blocks in the visual form, or edit `signature_flow.slots` in YAML.

The folder and distribution are named `signature-flow`; the module ID and options key are `signature_flow`. Version: **3.5.3**. The module is self-contained; use it without the `signature` design module on the same card. Options are configured in the French visual form or in YAML. Sliders and other card types are outside its scope.

Version 3 uses `primary` and `secondary` with the same entity, template and text behavior. It replaces slot-level `entity`, `state` and `secondary_entity`; formatting options become `primary_unit`, `primary_scale` and `primary_precision`, and primary value actions use `primary_*_action`. Replace the card configuration when importing this version. The [home configuration](../examples/home.yaml) preserves the existing sensors, forecast, battery power and percentage, water conversion and five popup hashes. It excludes the car charging card and leaves the section title outside the module. The corresponding popup cards must already exist. The outer Bubble card's `entity` remains unchanged.

## Visual configuration

The form appears directly under **Modules → Signature Flow**, using the same inline approach as Signature, without an outer object-item panel or delete button. Height, accessible label and the common deadband appear first. The common animation settings and the six numbered slots have collapsible sections. Each slot shows its position and an **Afficher cet emplacement** switch. An absent slot remains absent when the form is opened; enabling it creates that slot. Disabling an existing slot retains its values for later use.

Within an enabled slot, the form exposes primary/secondary values, appearance, formatting, flow settings, per-slot animation and the nine native Lovelace actions. Primary/secondary/name/icon fields accept text and Jinja; enter a direct entity ID as text for a measurement, and use the entity picker for the explicit flow entity. Colors accept the suggested palette, arbitrary CSS colors and Jinja. All existing keys and the mapping with slot keys `1`–`6` remain unchanged; existing configurations require no migration.

Conditional groups follow the actual renderer. Disabled slots show only their enable switch. Scaling and decimal controls appear only for direct entity values, since templates supply their own calculation/formatting. Secondary formatting/actions disappear when secondary text is empty. Turning animation off hides its flow/animation settings while preserving them. The whole form hides its fields on unsupported card types and sliders. An explicit-flow warning explains why a template or fixed-text primary value cannot animate by itself.

Blank per-slot animation values inherit each global setting separately; they do not get replaced by module defaults. A slot with only `animation.reference: 20` keeps its global speed and maximum arrow count. Other defaults and inheritance are described next to their fields. Switches display the effective defaults; opening the form writes nothing. Editing a slot can store equivalent default booleans (`enabled: true`, `animate: true`, `invert_flow: false`). False values, numeric zero, hidden settings, templates and explicit action objects are retained.

The module registers its editor component once and reuses Bubble Card's object-field schema, condition/group and value-change helpers in native `ha-form` elements. Nested forms edit `slots` and `animation` in their existing scopes; object-item shells are never mounted. This path is validated against Bubble Card 3.4.1 and relies on those helpers. No observer, polling or subscription is added to displayed cards for the editor. Reimport the complete distribution and reload the page when updating an already open editor.

Section corners follow the native Home Assistant panel radius (`ha-card-border-radius`, then `ha-border-radius-lg`) instead of the object group's fixed 6 px radius. Signature uses the same scoped component; native group warnings, fields and events remain intact. Radius changes follow the theme directly in CSS, without changing other Bubble forms.

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

At card widths below 490 px, slots 1, 2 and 3 form an aligned left column. Slots 4, 5 and 6 align on the right. These cards use 10 px horizontal padding instead of 14 px and an 8 px icon/text gap instead of 10 px, giving four-digit power values and their connections more room. Vertical padding remains 14 px. The center axis stays centered; units, number formatting and value font defaults are unchanged. All icons use the same size; slots 3 and 6 share label and value baselines. The layout responds to the card's width, including a narrow column in a wide browser. Padding is selected from the outer card width so resizing cannot make it alternate around the breakpoint. The original narrow/small layout thresholds are preserved by excluding the extra 8 px from density classification; wire geometry uses the expanded canvas.

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
| `flow_entity` | Entity controlling arrow direction and count. Defaults to `primary` only when it is a direct entity ID. Templates and fixed text require an explicit flow entity to animate. |
| `flow_scale` | Multiply the flow measurement. Defaults to `1` with an explicit `flow_entity`, otherwise to `primary_scale`. |
| `flow_unit` | Unit used for W/kW/MW normalization. Defaults to the explicit flow entity unit, or `primary_unit` / primary entity unit when using the default flow. Describes units; does not convert values by itself. |
| `invert_flow` | Reverse the signed flow convention. Default `false`; affects the arrow, not displayed values. |
| `animate` | Default `true`. Set `false` to keep the thin connection without an arrow. |
| `deadband` | Absolute threshold below which animation stops, after flow scaling. Default `0`. `signature_flow.deadband` sets a common default. |
| `animation` | Optional per-slot `speed`, `max_arrows` and `reference`. Each omitted setting inherits `signature_flow.animation`, then the module default. |

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
      animation:
        reference: 20
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

## Arrow speed and count

Arrows move at a fixed physical speed: **24 px/s** by default on every connection, regardless of its measurement or length. The absolute scaled flow instead controls the requested number of arrows, from **1 to 5** by default. Zero, deadband, unavailable measurements and `animate: false` hide and pause the arrows.

```yaml
signature_flow:
  animation:
    speed: 24
    max_arrows: 5
    reference: 10000
```

`speed` is in pixels per second (minimum 1). `max_arrows` is an integer from 1 to 12. `reference` is the measurement at which the maximum count is requested, with a default of **10,000**. For W/kW/MW flow units, `reference` is always in watts, globally and per slot, and values are normalized. Other units use the reference directly after flow scaling. The home configuration reaches its water maximum at **20 L/min**. Previous `min_speed` and `max_speed` options are ignored; replace them with `speed` when editing an existing card. Replace the previous slot-level `animation_reference` with `animation.reference`; the former option has been removed. If a power slot previously used `animation_reference` in kW or MW, convert its reference to watts. Water references stay in the configured flow unit, for example 20 L/min.

Any slot can override the same settings. Overrides are per setting, so a slot with only `reference` keeps the global speed and maximum count. There are no water-specific animation options:

```yaml
signature_flow:
  animation:
    speed: 24
    max_arrows: 5
    reference: 10000
  slots:
    1:
      primary: sensor.production_power
      animation:
        reference: 7500
    3:
      primary: sensor.storage_power
      animation:
        speed: 18
        max_arrows: 3
        reference: 2400
    6:
      primary: sensor.water_flow
      primary_scale: 1000
      primary_unit: L/min
      animation:
        reference: 20
```

The requested count is the nearest integer to `1 + (max_arrows - 1) × min(abs(flow) / reference, 1)`. A margin of 0.1 arrow beyond each rounding boundary stabilizes the count: with the default settings, going from one to two arrows requires more than 1,500 W, and returning to one requires less than 1,000 W. Initial readings use ordinary rounding. Above the reference, the count stays capped.

Arrows are regularly spaced along each path. Short connections cap the visible count to keep at least **14 px** between arrows, with a minimum of one arrow for an active flow. Resizing adjusts this cap automatically. The requested count still reflects the measurement; the visible count also depends on the available path length.

Each arrow reuses a native Web Animation and its SVG element. Count changes and path resizing retain the leading arrow's position on the shared visible path and redistribute the other arrows around it. Extra arrows are hidden and paused, then reused when needed. Measurement changes that retain the count and path length do not change playback rate or reset animation time. Traversal time depends on path length so each connection keeps its configured physical speed. When flow changes sign, each active arrow turns over 180 ms and travels back from its current point. Zero or unavailable flows pause the arrows; they resume when flow returns. Reduced-motion preferences cancel the animations and show regularly spaced stationary arrows. These are signed net measurements; the module does not calculate allocation between sources and destinations.

## Runtime and validation

The generated CSS is cached per card and reused until its effective configured height changes. Theme variables remain in the CSS; sensor reads, templates, formatting, actions and animation updates still execute on cache hits. This avoids rebuilding the style string, without adding a dependency or claiming a measured full-dashboard loading improvement.

DOM nodes, number formatters, paths and animations are reused on sensor updates. Each connection retains a bounded arrow pool (at most 12 SVG arrows); only visible arrows run animations. When a target entity or configured action changes, only that action element is replaced, preserving its child content and ongoing flow animations; this refreshes Bubble's cached pointer handler. Every evaluation reads the visible slots' direct or inferred display entities and flow entities through Bubble's tracked `hass` object. Source detection is cached in a bounded map; rendered results and entity states are refreshed on each evaluation. Jinja uses Bubble's `renderTemplate` helper and its native template subscriptions. The module adds no polling, service call, direct WebSocket subscription or global CSS injection. One `ResizeObserver` adjusts paths after layout changes. Changed display values and resizing coalesce text fitting into one scheduled frame; slot 2's connection and the mobile connections from slots 1 and 3 then follow their fitted text widths. Measurements are batched before path writes. The other connections reuse their existing geometry during sensor updates. There is no JavaScript animation loop.

Teardown cancels animations and pending text fitting, then removes the observer, reduced-motion listener, input-mode handlers and custom DOM. Text and template results are inserted as text, never as HTML.

This module replaces native button content. Alert Manager's native main-icon badge is not exposed on custom slots; no per-slot alert integration is included.

Run `npm run test:signature-flow` or `npm test` from the repository root. Tests read the actual distribution and check generic slots, symmetric entity/template/text values, inferred targets, independent flow entities, formatting, visibility, explicit actions, tracked reads, fixed speed, power-dependent counts, hysteresis, short-path caps, arrow reuse, reversals, pause/resume, layout and teardown. Editor fixtures check nested scopes, absent slots, conditional fields, default actions and preservation of hidden settings; the inline bridge is also checked against Bubble Card 3.4.1's actual object-selector helpers. Repository browser checks use native-shaped fixtures with simulated Home Assistant data, including the inline editor's DOM, labels and events. They do not run a live Home Assistant instance. Its popup definitions, sensor conventions and templates still need checking in the installation.

## Signature theme

This module supports the optional [Signature light/dark theme](../../themes/README.md). Shared CSS variables are resolved by the browser, including when switching modes. The shared Signature defaults apply when the theme is absent. Card options and actions are unchanged.

## Release notes

### 3.5.3 — 5 October 2026

- Generated from module sources and shared functions; existing configuration and rendering are preserved.
- See the [repository build guide](../../shared/README.md).

### 3.5.2 — 5 October 2026

- Reduces horizontal padding from 14 to 10 px and the icon/text gap from 10 to 8 px on cards below 490 px, leaving longer visible connections next to four-digit readings.
- Keeps watts and other configured units, the centered junction, existing number fitting, font defaults, actions and light/dark surfaces. No dashboard configuration changes are needed.

### 3.5.1 — 5 October 2026

- Aligns editor section corners with native Home Assistant panels and live theme variables, matching Signature.
- Preserves nested scopes, fields and warnings; the diagram's rendering and other Bubble forms are unchanged.

### 3.5.0 — 5 October 2026

- Adds a French visual configuration form with direct general settings and six collapsible slot sections, using the inline approach introduced for Signature.
- Exposes existing values, formatting, flow entities, global/per-slot animation and all nine native action objects without changing the YAML keys or the card renderer.
- Filters irrelevant fields, keeps hidden values, preserves absent slots until enabled and retains per-setting animation inheritance, false values, zero and Jinja.

### 3.4.1 — 4 October 2026

- Reuses the generated CSS while the effective height is unchanged; dynamic slot data and actions retain their tracked reads.
- Tests cover sensor refreshes on cache hits, configuration replacement, height bounds and live theme variables.

### 3.4.0 — 4 October 2026

- Harmonizes shared surface fallbacks, system typography and role-based CSS variables with the other Signature modules.
- Small icon corners derive from the shared icon radius. Slot 3 secondary text follows the shared secondary size on mobile; numeric rows follow their font sizes.

## Maintenance des sources

Modifier `src` et les [fonctions communes](../../shared/README.md), puis exécuter `npm run build:modules` et `npm run check:modules`. Ne pas modifier directement la distribution dans `dist`. Les chemins d’import, les clés YAML et les actions natives sont conservés.
