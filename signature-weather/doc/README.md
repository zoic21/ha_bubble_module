# Signature Weather

**Version: 1.2.1** · Module ID: `signature_weather`

A weather card in the Signature style: a neutral surface, 22 px corners, colored weather icons, and neutral temperature values. It runs independently of the `signature` module.

## Requirements and installation

- Bubble Card **3.3.0 or later**, with its module teardown hook.
- Bubble Card Tools, or an existing working Bubble Card module installation.
- A Home Assistant `weather` entity that provides at least one forecast type.

Import the complete [distribution](../dist/signature-weather.yaml) through the Bubble Card module editor. Add `signature_weather` to the card's `modules` list. A repository update does not update the copy already installed in Home Assistant: import the new distribution again.

Use a Bubble **button** card with `button_type: state`. This module replaces its native content. Do not apply `signature` or `signature_flow` to the same card. Native sub-buttons are hidden with the native content; use the weather module's own measurements and period buttons.

Use `grid_options.rows: auto` so the dashboard follows the content height. There is no fixed height to adjust when changing layouts or the number of days.

## Three layouts

| `layout` | Presentation | Typical use |
|---|---|---|
| `ribbon` | Horizontal forecasts with condition, high and low temperatures | A compact replacement for the standard forecast card |
| `ranges` | One 56 px row per entry, with low and high temperatures on a shared scale | Comparing temperature changes across days |
| `summary` | Current conditions and measurements above the forecasts, with period buttons | A weather summary on the home dashboard |

The ribbon displays six entries by default. Larger counts scroll horizontally on narrow cards instead of shrinking the text. Ranges always use the same temperature scale across the visible entries. If a minimum is absent, the module shows a dash and a point at the available temperature; it does not invent a minimum.

Tap a forecast to select it. The bottom detail row shows its date or time, condition, chance of rain, rain amount, and wind speed, when the provider supplies them. These remain **forecast** values, even if local measurements are configured.

Tap a current temperature or measurement to open the corresponding entity's Home Assistant more-info dialog.

## Basic card

Replace `weather.home` with your forecast entity. The module uses the card's `entity` by default.

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: weather.home
show_name: false
show_state: false
show_icon: false
button_action:
  tap_action:
    action: none
grid_options:
  columns: full
  rows: auto
modules:
  - signature_weather
signature_weather:
  layout: ribbon
  forecast_type: daily
  count: 6
```

Complete examples: [Ribbon](../examples/ribbon.yaml), [Ranges](../examples/ranges.yaml), [Summary with local measurements](../examples/summary-local.yaml).

## Options

All options belong under `signature_weather`.

| Option | Default | Description |
|---|---|---|
| `layout` | `ribbon` | `ribbon`, `ranges`, or `summary` |
| `entity` | Card entity | Optional separate `weather` entity for current provider data and forecasts |
| `name` | Card name, then weather name | Name displayed above current conditions |
| `forecast_type` | First supported type | `daily`, `hourly`, or `twice_daily`. Automatic preference: daily, twice daily, hourly |
| `count` | `6` | Number of forecast entries, from 1 to 12 |
| `precision` | `0` | Forecast temperature decimals: 0 or 1 |
| `current_precision` | `1` | Current temperature decimals, from 0 to 2 |
| `show_current` | See below | Display the current conditions header and measurements |
| `show_details` | `true` | Display the selected forecast's detail row |
| `current_metrics` | See below | List of current measurements displayed under the header; `[]` hides them |
| `local` | Empty | Optional local sources for individual current measurements |

Current conditions are displayed by default in `summary`, and in any layout with a non-empty `local` configuration. Set `show_current: false` to hide them explicitly.

Without `current_metrics`, the module displays the configured local measurements, excluding temperature and condition, which have their own header fields. If none are configured, it displays provider humidity and wind speed when available. Use `current_metrics` to choose an exact subset or order.

`summary` offers buttons only for forecast types supported by the provider. The period toolbar appears only when at least two types are available; forecasts have no separate period or temperature-unit heading. Changing period preserves any previously received forecast for that type while its subscription is starting. An explicitly configured unsupported `forecast_type` produces an explanatory message; the module does not silently replace it with another type.

## Local measurements

Forecasts come from the `weather` entity. Local sources replace **current** measurements only. They never overwrite the selected day's forecast or its rain probability.

For example, use a local station for current temperature, humidity, wind, accumulated rain, and UV:

```yaml
signature_weather:
  layout: summary
  name: À la maison
  forecast_type: daily
  count: 6
  current_metrics:
    - humidity
    - wind_speed
    - precipitation
    - uv_index
  local:
    temperature: sensor.outdoor_temperature
    humidity: sensor.outdoor_humidity
    wind_speed: sensor.wind_speed
    precipitation: sensor.rain_today
    uv_index: sensor.uv_index
```

These are example entity IDs: replace them with the sensors from your Ecowitt or other local station. The same `local` block also works with `ribbon` and `ranges`.

| Local key | Measurement |
|---|---|
| `temperature` | Current temperature |
| `condition` | Current condition, such as `sunny`, `cloudy`, or `rainy` |
| `apparent_temperature` | Feels-like temperature |
| `humidity` | Relative humidity |
| `pressure` | Atmospheric pressure |
| `wind_speed` | Wind speed |
| `wind_gust_speed` | Gust speed |
| `wind_bearing` | Wind direction in degrees or cardinal text |
| `precipitation` | Rain measurement chosen by the user, for example today's total |
| `uv_index` | UV index |

Use a plain entity ID to read its state and unit. Use an object when the value is in an attribute or needs conversion:

```yaml
signature_weather:
  layout: summary
  current_metrics:
    - wind_speed
    - precipitation
  local:
    temperature:
      entity: sensor.local_station
      attribute: outdoor_temperature
      unit: °C
      precision: 1
    wind_speed:
      entity: sensor.wind_speed_ms
      scale: 3.6
      unit: km/h
      precision: 0
    precipitation:
      entity: sensor.rain_today
      precision: 1
```

| Local source option | Default | Description |
|---|---|---|
| `entity` | Required | Entity supplying the measurement |
| `attribute` | Entity state | Read this attribute instead of the state |
| `unit` | Sensor unit, then provider unit | Displayed unit; specify it for attributes without unit metadata |
| `scale` | `1` | Multiply numeric measurements by this factor |
| `precision` | Temperature: `current_precision`; rain: 1; other metrics: 0 | Decimal places, from 0 to 2 |

Units are shown for current measurements independently of the forecast's temperature unit. Setting `unit` changes the label, not the value: use `scale` or a Home Assistant template sensor for conversions. Conversions requiring an offset, such as °F to °C, belong in a template sensor.

When a field has no local source, it uses the provider's current attribute. A configured local source that is missing, unavailable, or non-numeric displays a dash; it does not silently fall back to the provider. Unsupported provider metrics are omitted. Zero and negative measurements remain valid.

Condition strings use the standard Home Assistant weather icons and translations. A custom condition string is displayed as plain text with a neutral cloud icon.

## Language, time, and appearance

- Dates follow the Home Assistant language and configured time zone.
- Hourly times respect an explicitly selected 12-hour or 24-hour format.
- Numbers respect Home Assistant's number-format preference.
- Interface labels have French and English defaults; standard weather conditions also use Home Assistant translations when available.
- Temperatures remain neutral. Icon colors use Home Assistant weather color variables when supplied by the theme.
- Card surfaces and text follow the active Home Assistant theme, including dark mode.

The current temperature uses the same 30 px maximum as Signature's room temperature, the header uses 14 px, secondary text uses 13 px, and daily range rows use 56 px height. Forecast highs use 20 px in ribbon/summary and 16 px in ranges; at container widths up to 360 px these become 18 px and 15 px respectively. Numeric readings use tabular figures.

## Data lifecycle

The module uses Home Assistant's `weather/subscribe_forecast` WebSocket API. It subscribes only to the currently selected forecast type. It does not poll, call a weather provider directly, create refresh timers, or require a forecast template sensor.

The subscription is released when the card is removed, its forecast entity or connection changes, or another period is selected. A pending subscription that completes after removal is immediately released. Late events from an old subscription cannot replace the current forecast.

The card caches DOM elements, numeric/date formatters, and the last forecasts for its own entity. Unrelated Home Assistant updates do not rebuild its content. It retains the selected forecast by timestamp when the provider refreshes the list.

Loading, empty, unsupported, unavailable, and failed forecasts have explicit messages. A failed subscription can retry when the weather entity updates; unrelated entity changes do not trigger repeated requests. Invalid and past entries are excluded using the Home Assistant time zone for daily forecasts and the current hour for hourly forecasts.

## Development

Run from the repository root:

```sh
npm ci --ignore-scripts
npm run test:signature-weather
npm test
```

Tests execute the code from the actual distribution. They cover the three layouts, provider capabilities, local measurements and updates, units, date/time formatting, temperature ranges, subscriptions, teardown races, selection persistence, and examples.

API references: [Home Assistant weather entities](https://developers.home-assistant.io/docs/core/entity/weather/), [frontend weather subscription](https://github.com/home-assistant/frontend/blob/dev/src/data/weather.ts), and [Bubble Card module lifecycle](https://github.com/Clooos/Bubble-Card/blob/main/src/modules/module-documentation.md#release-what-your-module-started).

## Signature theme

This module supports the optional [Signature light/dark theme](../../themes/README.md). Shared CSS variables are resolved by the browser, including when switching modes. The shared Signature defaults apply when the theme is absent. Card options and actions are unchanged.

From version 1.1.1, horizontal dividers share a 16 px inset from each card edge with Signature room cards. Set `signature-divider-inset` in the theme (without `--`) or card CSS (with `--`) to change this margin. `0px` spans the card's inner width; larger values shorten the line. Forecast-row padding is accounted for on desktop and mobile, without shifting content or changing row heights. Divider colors still use `signature-divider-color`.

## Release notes

### 1.2.1 — 4 October 2026

- Current temperature and measurement buttons retain tabular figures through the canvas font reset, matching forecasts and the other numeric modules.

### 1.2.0 — 4 October 2026

- Harmonizes shared surface fallbacks, system typography and role-based CSS variables with the other Signature modules.
- Period selectors use the same font, colors, derived corners and 40 px desktop / 44 px touch height as Wind Rose, including keyboard focus.
