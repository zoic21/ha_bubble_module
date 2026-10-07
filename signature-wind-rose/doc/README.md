# Signature Wind Rose

**Version: 1.5.2** · Module ID: `signature_wind_rose`

A minimal wind rose for Bubble Card: 16 directions with four speed shades, unlabelled guide rings, a compact speed legend, a 1 hour / 1 day / 1 week selector, and a footer showing the dominant direction, its frequency and recorded calm duration when a speed source is configured. Hover a sector to see its percentage, recorded duration, time-weighted mean and maximum recorded speed. Moving away dismisses the preview or restores the clicked selection. Touch pointers keep tap-only interaction. Tap a sector to pin its detail; tap it again or the chart background to dismiss. Enter/Space select a focused sector and Escape dismisses the detail.

The card shows where the wind comes **from**: north is at the top and west at the left. It deliberately omits current speed, gust values, a vertical speed legend and a large center percentage, so it can sit below an existing wind graph.

## Installation

1. Install Bubble Card 3.4.1 or later and Bubble Card Tools.
2. Import the complete [signature-wind-rose.yaml](../dist/signature-wind-rose.yaml) file from the Bubble Card module editor.
3. Use `signature_wind_rose` in the card's `modules` list. Configure options under **Modules → Signature Wind Rose**, or keep using YAML.

This standalone module replaces the native button content. Use a button/state card and `grid_options.rows: auto`; do not combine it with another module that replaces the card content, such as Signature Flow or Signature Weather. The Signature design module is not required. No card-mod, graph library, helper or backend integration is needed.

## Visual configuration

The French module form offers direction/speed entity pickers, initial period, period-button visibility, direction offset, calm threshold, history refresh and sector color. Disable **Afficher les boutons de période** to remove the whole top toolbar and use the configured period. The calm threshold appears only when a speed entity is configured. A blank direction source inherits the card entity; the initial period remains a numeric YAML value. History sources use entity states rather than attributes or templates.

Les valeurs masquées sont conservées et l’ouverture du formulaire ne crée aucune option. Les sections suivent les arrondis natifs du thème. Le pont utilise les helpers de Bubble Card 3.4.1 ; les versions sans ces helpers ne prennent pas en charge ce formulaire. Réimporter le fichier complet puis recharger la page après la mise à jour.

## Ecowitt example

The [Ecowitt example](../examples/ecowitt.yaml) uses these local station entities:

```yaml
type: custom:bubble-card
card_type: button
button_type: state
entity: sensor.gw2000a_wifibf57_jardin_direction_du_vent
name: Rose des vents
card_layout: large
scrolling_effect: false
grid_options:
  columns: 12
  rows: auto
modules:
  - signature_wind_rose
signature_wind_rose:
  speed_entity: sensor.gw2000a_wifibf57_jardin_vitesse_vent
  hours: 24
```

Direction is taken from Bubble Card's `entity`. A [direction-only example](../examples/direction-only.yaml) is also available; without a speed source, the rose remains monochrome without a speed legend or speed details; calm periods cannot be identified and all valid direction durations are counted.

## Options

| Option under `signature_wind_rose` | Default | Meaning |
|---|---|---|
| `direction_entity` | Bubble Card's `entity` | Optional direction source override; recorded entity state is used. |
| `speed_entity` | Unset | Optional recorded speed entity, used for calm filtering, speed bands and historical mean/maximum per direction. |
| `hours` | `24` | Initial period: `1`, `24` or `168`. The buttons change it locally until the card is recreated. When the buttons are hidden, this is the fixed period. |
| `show_period_buttons` | `true` | Show the top period selector. `false` removes the toolbar and its spacing, and resets any local selection to `hours`. |
| `direction_offset` | `0` | Degrees added to recorded bearings, clockwise. |
| `calm_threshold` | `0` | Speed at or below this value is calm. Uses the speed entity's native unit; only applied when `speed_entity` is set. |
| `refresh_interval` | `300` | History refresh interval in seconds, minimum `60`. |
| `color` | Theme or `#4db6ac` | Optional base color for all sectors and their four speed shades. |

Directions accept numeric degrees or the 16 English/French compass abbreviations (`N`, `SSE`, `SSW` / `SSO`, `W` / `O`, etc.). Bearings wrap around 360° and are assigned to the closest of the 16 sectors. Zero degrees is valid north, not a missing value. Entity attributes and Jinja templates are not history sources.

French and English labels follow the Home Assistant language. Number formatting follows the Home Assistant number format. Unsupported languages use English labels.

For a fixed one-day rose without period buttons:

```yaml
signature_wind_rose:
  hours: 24
  show_period_buttons: false
```

## Frequency calculation

The module joins direction and speed histories on their timestamps. Each recorded value applies until the next change; frequency is based on elapsed time, **not the number of samples**. The initial state at the period boundary is requested, so an unchanged direction still contributes for its full recorded duration.

When speed is configured, periods with speed at or below `calm_threshold` are excluded from directional frequency. A negative or unavailable speed is missing data. Missing/unknown direction is excluded when wind is blowing. Valid calm speed can be identified even when direction is missing. A period with only calm history displays a calm message; a period with no usable history displays an empty message.

Sector percentages add up to 100% of the **usable non-calm duration**, before display rounding. They are not percentages of the entire selected period if there are gaps or calm intervals. The footer's accessible description and hover text report usable coverage and calm duration. Ties for dominant direction use the first sector clockwise from north.

The footer's **Frequency** is the dominant sector's share of that same usable non-calm duration, rounded to at most one decimal with Home Assistant's number format. For example, `S` and `32 %` mean that wind came from south during 32% of the usable windy history. It updates with the selected period and uses the cached aggregate, without another history request. Calm-only or unusable history shows `—` for frequency.

The footer’s **Calm** field shows the recorded duration at or below `calm_threshold`, including calm intervals with a missing direction. It uses the selected period’s existing cached aggregate. Valid speed history with no calm interval shows `0 min`; missing/loading/failed history shows `—`. Without a speed source, this field is hidden and the footer retains its two existing columns. Missing intervals are never counted as calm. Durations are rounded to the nearest minute, like the sector details. The footer uses compact hours/minutes with two-digit minutes (`1 h 05`) to keep long durations on one row.

Sector areas are proportional to duration. The largest sector reaches the outer guide ring; the scale adapts to each period, so ring positions do not imply a fixed percentage. There is no arithmetic averaging of bearings: 359° and 1° correctly contribute to north. Long-term direction statistics are not used because their arithmetic mean can misrepresent circular data.

## Speed bands and sector details

With a speed source in a supported unit, each petal is divided into four speed ranges: **below 5**, **5 to below 10**, **10 to below 20** and **20 or more km/h**. The matching horizontal legend sits below the rose. Lighter bands are nearer the center; darker bands are farther out. Each band’s area represents its recorded duration, and the complete petal keeps the same area and frequency as before. Guide rings have no percentage labels because their scale adapts to the largest sector.

Speed states in `km/h` (`kmh`, `kph`), `m/s`, `mph` (`mi/h`) and knots (`kn`, `kt`, `knots`) are converted to km/h for the bands only. The calm threshold and tooltip speeds use the entity’s native unit. If the unit is absent or unsupported, the rose stays monochrome without a speed legend; historical speed details still use the source values and any available unit. The module reads unit metadata from the entity, without requesting historical attributes. Changing that unit clears cached aggregates. Recorded states must share the current unit; historical unit changes cannot be inferred from attribute-free history.

The sector detail shows a **time-weighted mean** over the same usable non-calm duration as its frequency, and the **highest recorded speed** that applied during that duration. Missing speeds, calm intervals and states exactly at the period end do not affect those values. This maximum is the speed sensor’s maximum, not a gust measurement from a separate sensor. These details use the existing history response and cached aggregate.

## History and performance

Home Assistant's `history` and `recorder` integrations must retain these entities. The 1 week view needs 7 days of raw history. If retention is shorter, the rose uses only the available duration and reports coverage; excluded entities cannot be recovered by the card.

One WebSocket `history/history_during_period` request fetches both entities for the selected period, using minimal responses without attributes. Only up to three small aggregate results are cached; raw history is released after each calculation. Changing to a recently loaded period uses the cache. Ordinary Home Assistant state/style updates do not recalculate the histogram or start another request before the refresh interval.

Refresh pauses while the document is hidden or the card is disconnected. Timer and visibility listener are released through Bubble Card's module teardown hook. A request already sent cannot be cancelled, but its response is ignored after teardown, a source change, reconnect or period change. Failed requests retry at the refresh interval, rather than on every state update. There is no live history subscription, animation loop or per-update computed-style read.

API references: [Home Assistant history client](https://github.com/home-assistant/frontend/blob/dev/src/data/history.ts), [history WebSocket API](https://github.com/home-assistant/core/blob/dev/homeassistant/components/history/websocket_api.py), and [History integration](https://www.home-assistant.io/integrations/history/).

## Signature theme

The optional [Signature theme](../../themes/README.md) controls typography, surfaces, corners, shadow and separators in light and dark modes. The module consumes these shared variables directly in CSS and also works without the theme:

| Theme variable | Fallback |
|---|---|
| `signature-wind-rose-color` | `#4db6ac` |
| `signature-divider-inset` | `16px` from each edge |
| `signature-divider-color` | Subtle line based on primary text color |
| `signature-card-border-radius` | `22px` |
| `signature-card-box-shadow` | Light shadow |
| Shared card, font and control variables | Same defaults as Signature Weather |

Set `signature-divider-inset: 0px` in the theme for a separator spanning the inner card width. This variable changes the line only. It is compatible with the divider harmonization change and does not require that change to be installed first.

For a single card, use Bubble Card's `styles`:

```yaml
styles: |
  ha-card {
    --signature-divider-inset: 24px;
    --signature-wind-rose-color: #32b5ad;
  }
```

## Validation

Run `npm run test:signature-wind-rose` or `npm test` from the repository root. Tests exercise the actual imported YAML code, including duration weighting, asynchronous history responses, missing/calm data, localization, cache, refresh and teardown. Verify the installed card with your recorded station data in Home Assistant after importing.

Named colors such as `blue` use the same theme palette as Signature and Flow. Use `#0000ff` to keep literal CSS blue from earlier releases. Explicit CSS and Jinja colors are supported; Jinja uses the card entity. Empty or invalid colors restore `signature-wind-rose-color` (default `#4db6ac`) rather than producing black sectors.

## Release notes

### 1.5.2 — 7 October 2026

- Pads minutes after hours in the compact calm duration: `1 h 05` instead of `1 h 5`. Minute-only and exact-hour durations retain their existing format.

### 1.5.1 — 7 October 2026

- Adds recorded calm duration as a third footer column, alongside dominant direction and frequency, using the existing period aggregate.
- Distinguishes zero calm duration from unavailable data, and preserves the two-column footer without a speed source.

### 1.5.0 — 7 October 2026

- Adds four time-weighted speed bands and a compact horizontal legend when a supported speed unit is available. Sector areas, frequency and calm filtering are preserved.
- Adds historical duration, mean and maximum speed to hover, tap and keyboard details using the same history request. Guide rings remain unlabelled.
- Keeps direction-only and unsupported-unit roses monochrome, with live theme and custom-color shades for speed bands.

### 1.4.0 — 7 October 2026

- Adds `show_period_buttons` in YAML and the visual editor, enabled by default.
- Hiding the selector removes the whole toolbar and its spacing, and uses the configured `hours` period. Existing history caches, refresh and sector interactions remain available.

### 1.3.0 — 5 October 2026

- Shares named theme colors with Signature and Flow, validates CSS colors and restores the semantic wind color for invalid/empty options.
- Evaluates optional Jinja colors against the card entity on each pass. Literal hexadecimal/RGB values retain their meaning.
- Shares locale, DOM helpers and native editor lifecycle; history, selection and numeric policies are preserved.

### 1.2.3 — 5 October 2026

- Builds shared CSS roles from `shared/src/styles` while preserving selectors, theme fallbacks, priorities and layout-specific geometry.
- Keeps standalone, minified distributions and existing configuration/actions.

### 1.2.2 — 5 October 2026

- Compact generated distribution: local JavaScript names and expressions, embedded CSS whitespace and YAML metadata. Configuration keys, CSS variables and runtime behavior are preserved.
- Minification runs during the build, including the automatic GitHub workflow. Editable sources remain in `src`.

### 1.2.1 — 5 October 2026

- Generated from module sources and shared functions; existing configuration and rendering are preserved.
- See the [repository build guide](../../shared/README.md).

### 1.2.0 — 5 October 2026

- Adds a French visual form for all wind sources, history and appearance options.
- Hides the calm threshold without a speed source and preserves inherited defaults, numeric periods and existing history/rendering behavior.


### 1.1.2 — 5 October 2026

- Shows sector percentage and duration on pointer hover, using cached data.
- Preserves tap and keyboard selection; leaving a sector restores any pinned selection.

### 1.1.1 — 5 October 2026

- Replaces the repeated period in the footer with the dominant direction's frequency, using the same percentage as its sector detail.
- Keeps the period selector, shared styles and existing history requests unchanged.

### 1.1.0 — 4 October 2026

- Harmonizes shared surface fallbacks, system typography and role-based CSS variables with the other Signature modules.
- Period selectors match Weather. Tooltip corners and shadow follow the theme; caption sizes remain adjustable.

## Maintenance des sources

Les styles communs sont définis dans [shared/src/styles](../../shared/src/styles/README.md) et inclus au build. Les dispositions restent propres au module ; la distribution demeure autonome et minifiée.

Modifier `src` et les [fonctions communes](../../shared/README.md), puis exécuter `npm run build:modules` et `npm run check:modules`. Ne pas modifier directement la distribution dans `dist`. Les chemins d’import, les clés YAML et les actions natives sont conservés.
