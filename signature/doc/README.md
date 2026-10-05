# Signature — design module guide

Version **2.3.4**. [Complete file to import](../dist/signature.yaml).

**YAML ID: `signature`; display name: Signature.**

The module provides five layouts, neutral surfaces, colored icons, rounded corners, and consistent system typography. It works in Bubble Card without `card-mod` or global CSS. It preserves the card's native entities, visibility conditions, and actions.

The legacy distribution is retained unchanged. New [Square](../../signature-square/doc/README.md), [Compact](../../signature-compact/doc/README.md), [Room](../../signature-room/doc/README.md) and [Header](../../signature-header/doc/README.md) modules provide separate presentations and focused forms. See the [optional migration guide](../../signature-shared/doc/MIGRATION.md). Media-player styling remains available here.

## Installation and first example

Install Bubble Card and Bubble Card Tools, then import the complete YAML file from the Modules section of a card's editor. Apply Signature to the card, then expand **Modules → Signature** to configure its options in the visual editor. YAML remains available and existing configurations need no migration. Reimport the complete distribution to update an already installed module; a repository update does not change the copy installed in Home Assistant.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.living_room_temperature
name: Living room
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

Place `signature` at the card's root, at the same level as `entity` and `modules`. Replace the example entities with those from your installation.

## Visual configuration

The form uses French labels. Settings appear directly under **Modules → Signature**, with a single presentation dropdown and no object-item header or root-object delete button. Presentation, accent color and secondary text appear when applicable; the other settings are grouped in collapsible sections for values/text, controls/sub-buttons, square tiles, rooms and advanced appearance. The main entity and native sub-buttons/actions are still configured in Bubble's own editor.

The anonymous form (`name: ''`, `type: signature_options`) edits the existing keys directly under `signature`, without introducing a nested object or list. A small component registered by the module renders a native `ha-form` and delegates schema generation, defaults and value changes to a detached Bubble object selector. Its redundant outer panel is never mounted. Bubble's `group` metadata creates collapsible sections and removes sections whose fields are all hidden. Its `visible_if` expressions inspect both the current module settings (`item`) and the native card configuration (`card`). The bridge relies on Bubble's object-selector helpers, validated against 3.4.1; versions without those helpers are unsupported. Hidden settings stay in the configuration, so switching layouts does not delete previous room/square settings. Reload the page after importing this update if an editor is already open.

Collapsible sections inherit Home Assistant's native panel radius (`ha-card-border-radius`, then `ha-border-radius-lg`) instead of Bubble's object-group fixed 6 px radius. The same scoped group component is used by Signature Flow. It retains native grouping, warnings and events, follows live theme changes and does not change other Bubble forms.

The form follows the same effective-layout rules as the renderer: square and room are button layouts, cover/climate/switch cards stay compact, and header falls back to compact unless the button type is name. Section titles expose the layout control; media players expose only color/background. Numeric controls are offered only for compact state buttons linked to number/input_number entities. The square detail-row reservation appears only with measure controls, and room header-measure positioning appears only when main/secondary text leaves that space available. Incompatible layout or control choices show a warning instead of rewriting the card.

Declared defaults match the runtime. Bubble's object selector displays unset select defaults without persisting them; text/number inputs may remain empty and describe their defaults. False-default switches remain off when unset. Selecting the explicit standard choices (`compact_mode: default`, `controls: native`, `sub_buttons_position: default`, `room_measures_position: content`) has the same behavior as omitting those options.

Color accepts the existing palette names as well as custom CSS colors or Jinja. Main/secondary text fields accept multiline Jinja and fixed text; secondary also accepts a direct entity ID. An entity ID in a mixed text field is entered as text because that field also supports templates. The main entity uses Bubble's native entity picker.

Four advanced fields intentionally use native YAML inputs inside the form:

- `color_background`: a boolean (`true`/`false`) or a quoted Jinja string.
- `icon_opacity`: a number from 0 to 1 or a quoted Jinja string; `null` preserves native opacity. Keeping the scalar type also preserves a numeric zero.
- `sub_button_styles`: the existing object keyed by `css_class` or sub-button number; arbitrary keys and templates remain supported.
- `room_auto_colors`: `true` by default or `false` to disable automatic room colors. A YAML scalar keeps that default explicit because Bubble's object selector currently injects select defaults only.

For example, enter `"{{ is_state('light.living_room', 'on') }}"` in the background field. The YAML input preserves an existing boolean or template when another setting is edited. It does not convert style objects to lists or introduce new template override keys. The editor component is registered once; no observer, polling or subscription is added to displayed cards.

## Layouts and compatibility

| Layout | Use | Requirements |
|---|---|---|
| `compact` | Information or control row; typically 56 px tall | Default layout |
| `square` | Measurement tile with a main value and secondary text | `button` card, except a `switch` button |
| `room` | Room summary, measurements, and controls | `button` card, except a `switch` button |
| `header` | Title banner with pill buttons | `button` card, `button_type: name` |
| `title` | Section title without a divider, with buttons at the end of the row | `separator` card |

`cover` and `climate` cards and `switch` buttons always use `compact`. A `header` on a button other than `name` falls back to `compact`. A `media-player` card receives dedicated styling that preserves its native controls, artwork, and dimensions.

`slider` buttons, popups, and other card types not listed in `supported` are outside the module's scope. `layout: title` adds no styling to cards other than separators. The former `heading` mode adds no styling.

A `square` tile's height depends on the card and the Home Assistant grid: the module does not enforce a universal height of 252 px. Compact height uses `--row-height`, with a fallback of 56 px.

## Options

| Option | Type / values | Default | Effect |
|---|---|---|---|
| `layout` | `compact`, `square`, `room`, `header`, `title` | `compact` | Selects the layout, subject to the compatibility rules above |
| `color` | CSS color, palette name, or Jinja | `blue` | Accent color and icon background tint |
| `color_background` | Boolean or Jinja returning `true`/`false` | `false` | Also tints the card background |
| `icon_color` | Color or Jinja | Depends on layout and state | Overrides the main icon color |
| `icon_opacity` | Number from 0 to 1, or Jinja | Native behavior | Main icon opacity |
| `border_color` | Color or Jinja | No added border | Adds a 2 px inner card border |
| `icon_border_color` | Color or Jinja | No added border | Adds a 2 px inner border to the icon background |
| `compact_mode` | `default` or `value` | `default` | Shows the value on the right for a `state` button, or a `name` button with a custom `state` |
| `state` | Text or Jinja | Native state | Computed value to display; follows native state display options |
| `secondary` | Entity ID, text or Jinja | None | Secondary value; direct entities supply their state and unit, and the details target is detected automatically |
| `secondary_bold` | Boolean | `false` | Interprets `**text**` in the secondary text |
| `multiline` | Boolean | `false` | Allows line breaks in the state and secondary text |
| `auto_height` | Boolean | `false` | Adjusts height to content, only in `square` |
| `controls` | `native`, `measure` or `number` | `native` | Positions measurement controls in square, or adds numeric controls in compact |
| `reserve_measure_detail` | Boolean | `false` | Reserves the lower detail row in square with `controls: measure` |
| `sub_buttons_position` | `default` or `end` | `default` | Places sub-buttons after native controls in compact |
| `sub_button_styles` | Object keyed by class or number | None | Customizes existing sub-buttons |
| `room_auto_colors` | Boolean | `true` | Automatically colors active room controls |
| `room_control_columns` | Number from 1 to 6 | `4` | Number of room control columns, rounded and clamped |
| `room_measures_position` | `content` or `header` | `content` | Places temperature/humidity in the header when neither a main state nor secondary text is displayed |

Not all tile options apply to `title` and `media-player`. For `title`, use the native sub-button options; for `media-player`, the supported color options are `color` and `color_background`.

## Colors and appearance

The neutral surface uses `--ha-card-background`, then `--card-background-color`, then white. The icon background blends 16% of the accent color into that surface. `color_background: true` also tints the card. `icon_color` changes the icon itself without changing the tint derived from `color`.

Palette names: `blue`, `indigo`, `amber`, `orange`, `green`, `red`, `grey`, `teal`, `purple`, `light-blue`, `cyan`, `pink`, `yellow`. The corresponding theme variables take precedence over built-in fallbacks. Valid CSS colors such as `#2196f3`, `rgb(...)`, and `var(...)` are also accepted.

`color_background` must return exactly `true`, ignoring case and surrounding whitespace. `1` does not enable it. A missing or invalid main icon opacity preserves native behavior; a valid numeric value is clamped between 0 and 1.

| Element | Current appearance |
|---|---|
| Tile card | 22 px corner radius, subtle border, and light shadow |
| Compact / square icon | 36 × 36 px background with 12 px corner radius; 22 px icon |
| Compact / square name | 14 px |
| Compact / square secondary text | 13 px |
| Compact numeric value on the right | 20 px; 13 px unit |
| Compact text value on the right | 16 px |
| Square value | 28 px; 16 px unit |
| Room | 156 px base height; grows with text and control rows |

The module uses the system font; it does not bundle an Apple font. Compact dimensions are shared across mobile and desktop.

## Square measurement and secondary text

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.living_room_humidity
name: Humidity
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
  secondary: |-
    {{ states('sensor.living_room_temperature') }} °C
    **Indoor comfort**
```

`secondary` accepts an entity ID, Jinja template or fixed text. A direct entity displays its state and unit using the same Home Assistant locale and precision rules as the main measurement; missing or unavailable states display `—` without a unit. For example, `secondary: sensor.living_room_temperature` displays the temperature and opens its details when clicked.

For templates, the first quoted literal entity ID or `states.sensor.name` reference supplies the details target. Native references such as `states(entity)` and `state_attr(entity, 'measured_at')` use the Bubble card's main entity. References are inspected in source order and cached until the configured secondary changes. Template rendering retains Bubble's main `entity` context and never appends a unit automatically. Fixed text and templates without a detectable entity have no secondary details action. Dynamically constructed entity IDs cannot be inferred.

For a template using several entities, place the intended details entity first. This is a source-based convention, not an inference about which branch rendered. Bold formatting supports only `**…**` pairs on the same line, not full Markdown or HTML.

Version 2 removes `secondary_entity`. Delete that option from existing cards and check the first entity referenced by each secondary template. The main entity remains the native Bubble `entity`; the optional `state` only customizes its display. There is no `primary` field.

`controls: measure` positions the first two existing sub-buttons: a control at the top right and a detail at the bottom right. `reserve_measure_detail: true` reserves the lower space even without a second sub-button. The module does not create these buttons.

## Numeric controls

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: input_number.setpoint
name: Setpoint
icon: mdi:tune
card_layout: large
modules:
  - signature
signature:
  layout: compact
  color: teal
  controls: number
```

For `number` and `input_number`, this mode adds − / value and unit / +. It uses the actual `min`, `max`, `step`, and `unit_of_measurement` attributes, then calls the domain's `set_value` service. Clicking the value opens `more-info`.

Accessible control labels and failure messages use Home Assistant translations. If these are unavailable, the module falls back to French for a French language setting, or English otherwise. Values and numeric controls respect Home Assistant's number format preference, including system formatting and no grouping. With no explicit preference, they follow the Home Assistant language, then the browser language if none is provided. Changing only the number format refreshes existing controls.

After a press, further presses wait for an actual value change or a timeout of five seconds. Missing or invalid attributes disable the buttons. Climate and cover controls remain native.

## Custom sub-buttons

Keys in `sub_button_styles` refer to a sub-button's `css_class` or its native number as a string (`'1'`, `'2'`…). Prefer an explicit class for buttons that may be reordered. With Bubble groups, native numbering may differ from the visual YAML order: the module visits groups before individual buttons, then the bottom section.

| Sub-button option | Effect |
|---|---|
| `color` | Icon or switch track color; accepts Jinja |
| `background` | Custom background; accepts Jinja |
| `opacity` | Opacity clamped from 0 to 1; accepts Jinja |
| `icon` | Fixed icon or Jinja; an empty/invalid value restores the native icon |
| `type: switch` | Styles a compatible control as a switch in compact/square |
| `type: mode` | Styles a compact mode sub-button at 46 × 44 px |
| `column` | Room control column, clamped to the configured number of columns |

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.living_room_temperature
name: Living room
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

Standard visual switches require a native sub-button with no type or `default` type, a `toggle` action, and a domain of `switch`, `input_boolean`, `light`, `automation`, or `humidifier`. They preserve the native action.

Visual switches retain their configured `opacity`, clamped from 0 to 1. Unknown, unavailable, or transitional states multiply that opacity by 0.4; with no custom opacity, available switches use 1 and unavailable switches use 0.4.

For `lock`, use two conditional buttons with explicit `lock.unlock` and `lock.lock` actions. ON means `unlocked`, OFF means `locked`; transitional states remain dimmed. The module does not turn a `toggle` action into a lock command.

## Room summary

The room layout recognizes these sub-button classes:

| `css_class` | Role |
|---|---|
| `room-temperature` | Temperature measurement with a separate unit |
| `room-humidity` | Humidity |
| `room-status` | Status badge |
| `room-control-N` | Room control, sorted by number N |
| `room-climate` | Heating/cooling control, after numbered controls |

```yaml
type: custom:bubble-card
card_type: button
button_type: name
name: Living room
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
      show_icon: true
      tap_action:
        action: toggle
modules:
  - signature
signature:
  layout: room
  room_control_columns: 4
```

Controls use four columns by default, configurable from 1 to 6. Each additional row reserves more height; also adjust the Home Assistant grid. Displaying a main state hides the temperature/humidity roles. Secondary text can enlarge the card.

With `room_measures_position: header` and neither a main state nor secondary text, temperature/humidity appear to the right of the title. Two control rows then fit within the 156 px base height; each subsequent row adds 48 px. The geometry introduced in version 1.8.25 leaves 8 px between the measurements/icon and the divider.

Active controls receive automatic colors unless `room_auto_colors: false` or an explicit color is set. Disabling automatic colors also applies to controls customized through `sub_button_styles`; explicit colors and backgrounds still apply to their icons. Hidden buttons retain their logical positions; hiding them does not redistribute the other columns.

## Titles and banners

```yaml
type: custom:bubble-card
card_type: separator
name: Climate
icon: mdi:thermometer
modules:
  - signature
signature:
  layout: title
```

The section title is 32 px tall with 18 px text. Its outer card and visible container stay transparent, without a border or shadow, including under a theme that styles Bubble containers. It hides the horizontal divider and pushes sub-buttons to the end of the row. Use their native `show_background` and `state_background` options for their backgrounds.

For a banner, use `card_type: button`, `button_type: name`, and `layout: header`. The background is transparent and sub-buttons become pills. The title shrinks from 38 to 32 px in a small container; pills wrap below the title depending on the container width.

## Text, units, and actions

- Fields that accept Jinja use Bubble's `renderTemplate` engine. Updates depend on rendering and the dependencies tracked by Bubble; the module adds no polling of its own.
- Simple numeric measurements follow Home Assistant's number format and precision settings. Scientific notation contributes its exponent to inferred decimal precision, up to 20 decimal places; an explicit display precision takes precedence. A missing or unavailable numeric state becomes `—`, without a unit.
- A custom value must include its unit. Simple quantities (`500 g`, `50 %`, `−4.5 °C`) and durations such as `2 h 52 min` are visually split into numbers and units without changing the calculation.
- `state_content` and native attribute/timestamp options are respected. An explicitly hidden state stays hidden.
- Clicking or holding the main value opens `more-info` for the native Bubble `entity`, including when `state` customizes its display. Secondary text does the same for its automatically detected entity. Sub-buttons retain their native actions.
- The main icon uses explicit navigation from `tap_action`, or otherwise `button_action.tap_action`. Clicking the card and clicking its value can therefore perform different actions.

## Using with Alert Manager

```yaml
modules:
  - signature
  - alert_manager
signature:
  layout: compact
  compact_mode: value
```

The [Alert Manager module](../../alert_manager/doc/README.md) colors the icon according to matching alerts; it does not require Signature. Both module orders work with these versions, but placing Alert Manager last makes the configuration easier to read.

## Limitations and validation

Layout CSS includes only the active compact mode, native control type, secondary text, and multiline option. It is reused while these options, geometry, and surface are unchanged. An empty/nonempty secondary template result or a change in trailing controls updates the cached styles. Dynamic entity states, Jinja results, colors, and actions are still evaluated on each module execution; this cache does not suppress dependency reads or template updates.

A standard compact state button without optional controls or secondary text generates about 7.0 kB of CSS (5.25 kB after Bubble's CSS cleanup). These are generated style sizes for this configuration, not the imported YAML file size; enabled features add their own rules. Layout-specific secondary rules reuse shared typography. Room controls with explicit styles paint their automatic defaults once. Visual switches share one cached geometry block per card, retaining independent track colors, positions, opacity and native actions. Grouping switches saves CSS when a card has several switches; a single switch has a small custom-property overhead.

The module targets Bubble Card's DOM. Local styles, the theme, grid dimensions, and changes in Bubble can affect rendering. Use a recent Bubble version; Jinja templates and lifecycle cleanup use `renderTemplate` and `onTeardown` when available. No specific minimum version is claimed without validation against that version.

After importing, check your layouts on mobile and desktop, long names, units, and numeric controls in your installation. YAML/JavaScript syntax checks do not validate rendering or commands in a real Home Assistant instance.

## Release notes

### 2.3.4 — 5 October 2026

- Generated from module sources and shared functions; existing configuration and rendering are preserved.
- See the [repository build guide](../../shared/README.md).

### 2.3.3 — 5 October 2026

- Aligns editor section corners with the native Home Assistant panels and theme, including live radius changes.
- Retains Bubble's grouped-field renderer, warnings and flat configuration without changing other forms or displayed cards.

### 2.3.2 — 5 October 2026

- Displays settings directly with one presentation dropdown, removing the redundant object-item header and its ineffective root-object delete button.
- Reuses Bubble's native fields, conditional groups, defaults and value-change logic through an inline editor bridge; existing keys and hidden settings are preserved.
- Registers the editor component once without changing card rendering or adding observers, polling or subscriptions.

### 2.3.1 — 5 October 2026

- Filters the visual configuration using the effective layout, native card type and numeric entity domain. Empty groups disappear; square no longer displays room settings.
- Uses Bubble's native structured-object form and live `visible_if` expressions without changing existing YAML keys or the card renderer.
- Retains hidden settings when changing layouts, shows warnings for incompatible choices and keeps the default-on room-color option as a boolean YAML field.

### 2.3.0 — 5 October 2026

- Adds a native Bubble configuration form with French labels, the existing color palette and collapsible option sections.
- Exposes every current Signature option without changing its key, layouts, actions, templates or runtime code.
- Keeps background/opacity scalars and sub-button style maps in native YAML fields inside the form, preserving mixed types and arbitrary map keys.
- Declares defaults matching the current runtime; explicit standard choices also preserve existing behavior.

### 2.2.4 — 5 October 2026

- Section titles remain transparent and have no border or shadow on either their outer card or visible Bubble container.
- The optional Signature theme now inherits Home Assistant's native palette and card backgrounds. It retains shared typography, corners and card shadows without styling every Bubble container's surface.

### 2.2.3 — 4 October 2026

- Shares cached geometry across visual switches on the same card; state, color and availability still refresh on every evaluation.
- Removes duplicate automatic room-control colors and secondary typography without changing the visual defaults.
- Keeps module-local styles and live theme variables. See the measured CSS budgets and validation limits in the [style guide](../../STYLE_GUIDE.md#8-performances-et-volume-css).

### 2.2.2 — 4 October 2026

- Compact main values use tabular figures, matching the other primary numeric displays.

### 2.2.1 — 4 October 2026

- Media track titles and artists follow shared name/secondary typography, with line height that follows their font size.
- Cover buttons follow the shared control radius, including without the Signature theme.

### 2.2.0 — 4 October 2026

- Harmonizes shared surface fallbacks, system typography and role-based CSS variables with the other Signature modules.
- Ordinary state text stays fully opaque; room numbers use medium weight. Media names and states honor shared font sizes, and secondary grid rows grow with their text.

### 2.1.1 — 4 October 2026

- Aligns room-control dividers with Weather using a 16 px inset from each card edge.
- Adds optional `signature-divider-inset` support to adjust line width through the theme without moving controls or adding JavaScript work.

### 2.1.0 — 4 October 2026

- Adds optional `signature-*` CSS variables for typography, card surfaces, corners, shadows and dividers, with existing values as fallbacks.
- Supports the Signature light/dark theme without new JavaScript style reads or subscriptions. Layout geometry, actions and the cached CSS lifecycle remain unchanged.
- Verification: 188 automated repository tests passed, including theme reference and contrast checks. Rendering on a live Home Assistant dashboard remains to be checked.

### 2.0.0 — 4 October 2026

- Keeps the main entity and its details action native to Bubble; `state` remains an optional display override.
- Accepts a direct entity, template or text in `secondary`, with automatic details targeting. Removes the redundant `secondary_entity` option.
- Caches secondary source detection until its configuration changes, while continuing to refresh rendered values and entity dependencies. Numeric values reuse locale/precision formatters; no polling or additional subscriptions are introduced.
- Replaces the secondary action node only when its target changes, avoiding Bubble's previously cached action handler opening the old entity.
- Verification: 184 automated repository tests passed, including one proving that 1,000 updates and an equivalent configuration replacement trigger only one secondary source analysis. A Node.js 24 benchmark with simulated DOM fixtures measured about 0.11–0.14 µs additional execution time per update for secondary templates (about 2%), with no increase in the compact/room samples. A direct secondary retained its source cache and formatter over 50,000 updates without observed heap growth. These measurements cover module execution, not real Home Assistant layout or asynchronous template rendering.

## Signature theme

This module supports the optional [Signature light/dark theme](../../themes/README.md). Shared CSS variables are resolved by the browser, including when switching modes. The shared Signature defaults apply when the theme is absent. Card options and actions are unchanged.


## Maintenance des sources

Modifier `src` et les [fonctions communes](../../shared/README.md), puis exécuter `npm run build:modules` et `npm run check:modules`. Ne pas modifier directement la distribution dans `dist`. Les chemins d’import, les clés YAML et les actions natives sont conservés.
