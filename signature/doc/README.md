# Signature — design module guide

Version **1.8.28**. [Complete file to import](../dist/signature.yaml).

**YAML ID: `signature`; display name: Signature.**

The module provides five layouts, neutral surfaces, colored icons, rounded corners, and consistent system typography. It works in Bubble Card without `card-mod` or global CSS. It preserves the card's native entities, visibility conditions, and actions.

## Installation and first example

Install Bubble Card and Bubble Card Tools, then import the complete YAML file from the Modules section of a card's editor. Custom options in this version are configured in YAML: the module does not yet declare an `editor` schema.

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
| `compact_mode` | `value` | Standard | Shows the value on the right for a `state` button, or a `name` button with a custom `state` |
| `state` | Text or Jinja | Native state | Computed value to display; follows native state display options |
| `secondary` | Text or Jinja | None | Additional secondary text |
| `secondary_entity` | Entity ID | None | Target when clicking the secondary text; does not supply its text |
| `secondary_bold` | Boolean | `false` | Interprets `**text**` in the secondary text |
| `multiline` | Boolean | `false` | Allows line breaks in the state and secondary text |
| `auto_height` | Boolean | `false` | Adjusts height to content, only in `square` |
| `controls` | `measure` or `number` | Native controls | Positions measurement controls in square, or adds numeric controls in compact |
| `reserve_measure_detail` | Boolean | `false` | Reserves the lower detail row in square with `controls: measure` |
| `sub_buttons_position` | `end` | Standard position | Places sub-buttons after native controls in compact |
| `sub_button_styles` | Object keyed by class or number | None | Customizes existing sub-buttons |
| `room_auto_colors` | Boolean | `true` | Automatically colors active room controls |
| `room_control_columns` | Number from 1 to 6 | `4` | Number of room control columns, rounded and clamped |
| `room_measures_position` | `header` | Measurements in the content area | Places temperature/humidity in the header when neither a main state nor secondary text is displayed |

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
  secondary_entity: sensor.living_room_temperature
  secondary: |-
    {{ states('sensor.living_room_temperature') }} °C
    **Indoor comfort**
```

`secondary` is not an automatically resolved entity. `secondary_entity` is used only to open that entity's details. Bold formatting supports only `**…**` pairs on the same line, not full Markdown or HTML.

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

The section title is 32 px tall with 18 px text. It hides the horizontal divider and pushes sub-buttons to the end of the row. Use their native `show_background` and `state_background` options for their backgrounds.

For a banner, use `card_type: button`, `button_type: name`, and `layout: header`. The background is transparent and sub-buttons become pills. The title shrinks from 38 to 32 px in a small container; pills wrap below the title depending on the container width.

## Text, units, and actions

- Fields that accept Jinja use Bubble's `renderTemplate` engine. Updates depend on rendering and the dependencies tracked by Bubble; the module adds no polling of its own.
- Simple numeric measurements follow Home Assistant's number format and precision settings. Scientific notation contributes its exponent to inferred decimal precision, up to 20 decimal places; an explicit display precision takes precedence. A missing or unavailable numeric state becomes `—`, without a unit.
- A custom value must include its unit. Simple quantities (`500 g`, `50 %`, `−4.5 °C`) and durations such as `2 h 52 min` are visually split into numbers and units without changing the calculation.
- `state_content` and native attribute/timestamp options are respected. An explicitly hidden state stays hidden.
- Clicking or holding the main value opens `more-info` for the main entity. Secondary text does the same when `secondary_entity` is defined. Sub-buttons retain their native actions.
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

A standard compact state button without optional controls or secondary text generates about 6.0 kB of CSS (4.4 kB after Bubble's CSS cleanup), down from 11.4 kB (9.0 kB after cleanup) in 1.8.27. These are generated style sizes for this configuration, not the imported YAML file size; enabled features add their own rules.

The module targets Bubble Card's DOM. Local styles, the theme, grid dimensions, and changes in Bubble can affect rendering. Use a recent Bubble version; Jinja templates and lifecycle cleanup use `renderTemplate` and `onTeardown` when available. No specific minimum version is claimed without validation against that version.

After importing, check your layouts on mobile and desktop, long names, units, and numeric controls in your installation. YAML/JavaScript syntax checks do not validate rendering or commands in a real Home Assistant instance.
