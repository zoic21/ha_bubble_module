# Signature Wind Rose

**Version: 1.0.0** · Module ID: `signature_wind_rose`

A minimal wind rose for Bubble Card: 16 directions in one teal color, subtle guide rings, a 1 hour / 1 day / 1 week selector, and a footer showing the dominant direction and selected period. Tap a sector to see its percentage and recorded duration; tap it again or the chart background to dismiss. Enter/Space select a focused sector and Escape dismisses the detail.

The card shows where the wind comes **from**: north is at the top and west at the left. It deliberately omits current speed, gust values, a vertical speed legend and a large center percentage, so it can sit below an existing wind graph.

## Installation

1. Install Bubble Card 3.3 or later and Bubble Card Tools.
2. Import the complete [signature-wind-rose.yaml](../dist/signature-wind-rose.yaml) file from the Bubble Card module editor.
3. Use `signature_wind_rose` in the card's `modules` list. Configure options in YAML; there is no custom editor schema.

This standalone module replaces the native button content. Use a button/state card and `grid_options.rows: auto`; do not combine it with another module that replaces the card content, such as Signature Flow or Signature Weather. The Signature design module is not required. No card-mod, graph library, helper or backend integration is needed.

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

Direction is taken from Bubble Card's `entity`. A [direction-only example](../examples/direction-only.yaml) is also available; without speed history, calm periods cannot be identified and all valid direction durations are counted.

## Options

| Option under `signature_wind_rose` | Default | Meaning |
|---|---|---|
| `direction_entity` | Bubble Card's `entity` | Optional direction source override; recorded entity state is used. |
| `speed_entity` | Unset | Optional recorded speed entity, used only to exclude calm periods. Its value is not displayed. |
| `hours` | `24` | Initial period: `1`, `24` or `168`. The buttons change it locally until the card is recreated. |
| `direction_offset` | `0` | Degrees added to recorded bearings, clockwise. |
| `calm_threshold` | `0` | Speed at or below this value is calm. Uses the speed entity's native unit; only applied when `speed_entity` is set. |
| `refresh_interval` | `300` | History refresh interval in seconds, minimum `60`. |
| `color` | Theme or `#4db6ac` | Optional color override for all sectors. |

Directions accept numeric degrees or the 16 English/French compass abbreviations (`N`, `SSE`, `SSW` / `SSO`, `W` / `O`, etc.). Bearings wrap around 360° and are assigned to the closest of the 16 sectors. Zero degrees is valid north, not a missing value. Entity attributes and Jinja templates are not history sources.

French and English labels follow the Home Assistant language. Number formatting follows the Home Assistant number format. Unsupported languages use English labels.

## Frequency calculation

The module joins direction and speed histories on their timestamps. Each recorded value applies until the next change; frequency is based on elapsed time, **not the number of samples**. The initial state at the period boundary is requested, so an unchanged direction still contributes for its full recorded duration.

When speed is configured, periods with speed at or below `calm_threshold` are excluded from directional frequency. A negative or unavailable speed is missing data. Missing/unknown direction is excluded when wind is blowing. Valid calm speed can be identified even when direction is missing. A period with only calm history displays a calm message; a period with no usable history displays an empty message.

Sector percentages add up to 100% of the **usable non-calm duration**, before display rounding. They are not percentages of the entire selected period if there are gaps or calm intervals. The footer's accessible description and hover text report usable coverage and calm duration. Ties for dominant direction use the first sector clockwise from north.

Sector areas are proportional to duration. The largest sector reaches the outer guide ring; the scale adapts to each period, so ring positions do not imply a fixed percentage. There is no arithmetic averaging of bearings: 359° and 1° correctly contribute to north. Long-term direction statistics are not used because their arithmetic mean can misrepresent circular data.

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
