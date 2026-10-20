# Home Assistant Bubble Modules

Reusable modules for [Bubble Card](https://github.com/Clooos/Bubble-Card).

[Global dashboard consistency audit](docs/GLOBAL_COHERENCE_2026_10.md): shared
Header button typography, optional Compact two-line names, clock-duration
values and section metrics, with coordinated dashboard updates.

[17 October code/performance audit](docs/MODULE_OPTIMIZATION_2026_10.md): optional
CSS only when used, fewer repeated chart/statistics calculations, unchanged
computed styles. Includes measured CSS sizes, operation counts and import versions.

| Module | Version | Distribution | Documentation |
|---|---|---|---|
| Signature Square — square tiles | 2.0.7 | [signature-square.yaml](signature-square/dist/signature-square.yaml) | [Guide](signature-square/doc/README.md) |
| Signature Compact — information, control rows and media players | 1.6.8 | [signature-compact.yaml](signature-compact/dist/signature-compact.yaml) | [Guide](signature-compact/doc/README.md) |
| Signature Panel — illustrated full-width panels | 1.3.2 | [signature-panel.yaml](signature-panel/dist/signature-panel.yaml) | [Guide](signature-panel/doc/README.md) |
| Signature Room — room summaries and controls | 1.4.3 | [signature-room.yaml](signature-room/dist/signature-room.yaml) | [Guide](signature-room/doc/README.md) |
| Signature Header — page headers and section titles | 1.2.1 | [signature-header.yaml](signature-header/dist/signature-header.yaml) | [Guide](signature-header/doc/README.md) |
| Signature Flow — six configurable flow slots | 3.6.2 | [signature-flow.yaml](signature-flow/dist/signature-flow.yaml) | [Guide](signature-flow/doc/README.md) |
| Signature Energy Balance — daily net supply bar | 1.0.0 | [signature-energy-balance.yaml](signature-energy-balance/dist/signature-energy-balance.yaml) | [Guide](signature-energy-balance/doc/README.md) |
| Signature Weather — forecasts and optional local measurements | 1.3.6 | [signature-weather.yaml](signature-weather/dist/signature-weather.yaml) | [Guide](signature-weather/doc/README.md) |
| Signature Wind Rose — wind direction frequencies | 1.5.5 | [signature-wind-rose.yaml](signature-wind-rose/dist/signature-wind-rose.yaml) | [Guide](signature-wind-rose/doc/README.md) |
| Signature Group — popup activity summaries | 1.1.5 | [signature-group.yaml](signature-group/dist/signature-group.yaml) | [Guide](signature-group/doc/README.md) |
| Signature Navigation — floating glass footer | 1.0.8 | [signature-navigation.yaml](signature-navigation/dist/signature-navigation.yaml) | [Guide](signature-navigation/doc/README.md) |
| Signature Hue — native Hue presentation companion | 1.0.1 | [signature-hue.yaml](signature-hue/dist/signature-hue.yaml) | [Guide](signature-hue/doc/README.md) |
| Signature Irrigation — calendar reader and weekday controls | 1.0.0 | [signature-irrigation.yaml](signature-irrigation/dist/signature-irrigation.yaml) | [Guide](signature-irrigation/doc/README.md) |
| Alert Manager — alert badges and optional card tint | 3.7.0 | [alert_manager.yaml](alert_manager/dist/alert_manager.yaml) | [Guide](alert_manager/doc/README.md) |

The main Signature presentations share [CSS source fragments by visual role](shared/src/styles/README.md), assembled during the build into autonomous distributions. Hue and Irrigation are optional companions: keep Compact for the native card frame and add the companion afterwards, only where needed. The [17 October style audit](docs/STYLE_AUDIT_2026_10.md) fixes the remaining Panel, Room-unit and Hue-label inconsistencies and documents the shared rules and preserved insets.

Each module has its own folder: `src` contains its editable sources, `dist` contains the generated complete YAML file to import and `doc` contains its documentation. Existing modules keep their own `test` folders; the five standalone presentation modules share behavior and build tests in `signature-shared/test`.

The suites share [test helpers](shared/test/README.md) for DOM fixtures, isolated editor environments and distribution loading. Module-specific simulations and assertions stay in their own suites.

## Installation

1. Install Bubble Card and [Bubble Card Tools](https://github.com/Clooos/Bubble-Card-Tools).
2. Download the module's YAML file from its `dist` folder.
3. In the Bubble Card editor, open **Modules** and import the complete file, or paste its contents into the manual import field.
4. Add the module ID to the card's `modules` list.
5. Configure the options described in the module guide, then reload the dashboard if needed.

Distribution files include metadata and code. Import them as modules; they are not dashboard cards to paste directly into a view.

## Module IDs

The YAML IDs are `signature_square`, `signature_compact`, `signature_room`, `signature_panel`, `signature_header`, `signature_flow`, `signature_energy_balance`, `signature_weather`, `signature_wind_rose`, `signature_navigation`, `signature_group`, `signature_hue`, `signature_irrigation` and `alert_manager`. Standalone Signature folders use hyphens in place of their module ID's underscore.

## Updates and Module Store

This repository contains the distributions and documentation. It does not automatically publish modules to the Module Store.

Publishing to the store requires a separate discussion for each module in [Share your Modules](https://github.com/Clooos/Bubble-Card/discussions/categories/share-your-modules), including its complete export and a screenshot. The store discussions have not been created yet.

For a manual installation, import the updated YAML file again. For a store release, update the YAML in the same discussion and increase the version. A commit in this repository does not, by itself, update modules installed in Home Assistant.

## Standalone Signature presentations

Square, Compact, Room, Panel and Header are separate, autonomous modules with French forms limited to their own options. Their module choice replaces `layout`; Header selects page/header or section/title from the native card type. Section titles keep their native badge group beside the label when it fits, or move the whole group below and wrap its badges within the column, on desktop and mobile. Every wrapped row starts at the left edge; badges keep their natural widths. Compact also styles native media-player cards, preserving their artwork, controls and dimensions. Use one presentation module per card, with optional Alert Manager. A name button can also add [Signature Group](signature-group/doc/README.md) to summarize the cards of a popup using their existing visibility conditions. The legacy `signature` module has been removed after checking the Home Assistant configuration export. Older installations must migrate every card before deleting their installed copy. Room 1.3.0 provides `room_mode: illustrated`: room artwork, a compact 148 px base height, temperature, native controls and status badges, with humidity and the main icon hidden. Room and Square use the shared `signature-illustration-size` theme key (80 px by default). Artwork stays in your own `/local/` assets, outside this module repository. See the [Room guide](signature-room/doc/README.md). Full-width equipment and energy summaries use [Signature Panel](signature-panel/doc/README.md).

Room 1.4.3 places native icon-only sub-buttons over the upper-right artwork corner through `sub_button_styles.<class-or-index>.type: badge`. The icons share one neutral capsule, 20px high, with a fixed right edge; it grows leftwards over the illustration, clear of the title. It shrinks to the visible icons and disappears when none remain. Showing or hiding badges preserves artwork size and centering, including on mobile. Without artwork the capsule stays beside the name. Native visibility, colors and actions remain unchanged. See the [Room badge configuration](signature-room/doc/README.md#badges-sur-lillustration).

Room 1.3.0 adds opt-in `type: command` controls with an icon above the native label, stable 44px targets and template-driven `active` / `disabled` states. Disabled commands retain their place and block native actions, including cached or in-flight gestures, without replacing nodes or service targets. `room_state_as_value` displays equipment values or alarm states using the same illustrated layout. Existing room controls keep their default presentation. See the [command guide](signature-room/doc/README.md#commandes-illustrées-avec-libellé).

See the [migration guide](signature-shared/doc/MIGRATION.md) and [shared-source build instructions](signature-shared/README.md).

The optional Signature theme supplies common CSS appearance variables; each module owns its layout and controls. Shared JavaScript and CSS source files are assembled at build time, so no base module or runtime import is needed.

Compact can display its main value as a small clickable button (`value_style: button`): 14px value, 12px unit, placed before native commands, with visual switches last in their native group. Set `value_background: false` to keep that value clickable without a pill background. Compact also supports an optional proportional `fill`: a live reference entity or a fixed maximum, with a soft 16% accent over the theme surface. It preserves native switches, selects and Alert Manager badges; three or more controls wrap below the value on narrow gauge cards. See the [Compact guide](signature-compact/doc/README.md#remplissage-proportionnel).

Compact and Square support numeric `color_thresholds.values` on their main icons; all three modules also support existing sub-button badges, including Header section titles. Surfaces mix only 16% of the threshold color into the live theme surface, just like ordinary Signature icons. Icons match the graph's RGB accent without any contrast adaptation; badge labels keep theme text. Header also keeps theme text on every ordinary badge and button label, including slider values, while preserving their icon colors, fills and functional opacity. See the [shared threshold guide](signature-shared/doc/COLOR_THRESHOLDS.md). Room, native controls and Alert Manager retain their behavior.

## Source maintenance

All fourteen module YAML distributions are generated and minified: local JavaScript identifiers and expressions, complete embedded stylesheets and YAML metadata. Edit each module’s `src` files and the [common functions](shared/README.md), then run `npm run build:modules` (or `npm run build`) and `npm run check:modules` to test locally. The [automatic build workflow](.github/workflows/build.yml) also rebuilds and validates modules after a source/build/dependency push, then commits changed YAML distributions on the same repository branch. It creates no commit when they are already current. Never edit `dist` directly; versions and documentation remain maintained in the sources. Installation paths and module IDs are unchanged.

## Configuration

Each Signature presentation declares an `editor` schema: open its module in the card editor to configure its options with French labels and collapsible sections. Square, Room and Header expose only their own settings; Compact supports button, cover, climate and media-player cards. Media players expose only their two color options. An inline editor bridge reuses Bubble Card's object-field logic and `visible_if` support without its redundant item header or delete button; it is validated against 3.4.1. Existing YAML configurations remain valid and hidden values are retained. Sub-button style objects, background/opacity scalars and the default-on room color setting use small YAML fields inside the form to preserve their types. Standard controls, entities, and actions remain those provided by Bubble Card.

Signature Flow uses the same inline form under **Modules → Signature Flow**, with common settings and six collapsible slot sections. Values, appearance, formatting, flow entities, global/per-slot animation and native actions are configurable there. Disabled slots, empty secondary text and template values hide irrelevant settings; existing YAML keys and animation inheritance are preserved. It replaces the native button content with a configurable flow diagram; see its [home example](signature-flow/examples/home.yaml). Signature Weather replaces the button content with a forecast ribbon, temperature ranges, or a current-weather summary; see its [local station example](signature-weather/examples/summary-local.yaml).

Signature, Flow, Weather, Wind Rose and Alert Manager editor sections use the native Home Assistant panel radius and follow live theme changes. This styling is scoped to their own groups, preserving native fields, warnings and configuration without changing other Bubble forms.

Signature Wind Rose replaces the button content with a time-weighted, 16-direction wind rose and optional period selector; see its [Ecowitt example](signature-wind-rose/examples/ecowitt.yaml). Set `show_period_buttons: false` to hide the selector and use the configured `hours` period. The footer shows dominant direction, frequency and recorded calm duration when a speed source is configured. Recorded speed history adds four speed bands and a compact legend; sector details show duration, time-weighted mean and maximum speed without duplicating current values from a graph above it.

Weather, Wind Rose and Alert Manager also provide French module forms. Weather exposes all forecast/current settings and ten optional local sources with entity and attribute selectors. Wind Rose exposes sources, history, calm filtering and color. Alert Manager exposes card display, source sensors, colors/icons, activated packs and per-entity exceptions. Repeated pack/entity entries are converted to the existing keyed mappings, retaining inheritance and exclusions. Existing YAML configurations remain valid; automatic defaults are preserved and the visual forms rely on Bubble Card 3.4.1 object helpers.

Signature Navigation styles a native `sub-buttons` footer with a directional glass rim and automatic active-dashboard selection. Icons and navigation actions remain in Bubble's native editor; mobile margins, blur and opacity have their own French module form. It uses a 64 px bar, 26 px icons, concentric selection corners and a visible neutral selection inherited from the light/dark theme. The footer stays below Bubble popups and their backdrop so it cannot cover popup content or intercept clicks through the backdrop. See the [six-route example](signature-navigation/examples/home.yaml) and remove the former navigation `styles` block when adopting it.

## Signature theme

The optional [Signature theme](themes/README.md) provides light and dark modes for Home Assistant and shared CSS variables for the Signature modules and Alert Manager. Compatible native cards share the same 1 px border, radius and shadow; Statistics Graph Chart Card must keep `card_border: true` to show that border. Download [signature.yaml](themes/signature.yaml) and follow the installation guide. No card-mod or additional JavaScript is required.

## Technical style rules

Read [STYLE_GUIDE.md](STYLE_GUIDE.md) before changing the Signature modules or theme. It defines typography roles, exact surface fallbacks, corners, control metrics, divider lengths, intentional layout differences and required computed-style checks.

## Testing

With Node.js 22 or later, run these commands from the repository root:

```sh
npm ci --ignore-scripts
npm run check:modules
npm test
```

Use `npm run test:signature`, `npm run test:signature-flow`, `npm run test:signature-weather`, `npm run test:signature-wind-rose`, `npm run test:signature-navigation` or `npm run test:alert-manager` to test a single existing module. Shared editor round-trip and condition tests are in `editors/test` and read the actual YAML distributions. YAML, Terser and Playwright are development dependencies; none is needed in Home Assistant.

Run `npm run build:modules` after editing any module or common source; `npm run check:modules` rejects stale distributions for all eleven modules. See the [shared-source build guide](shared/README.md). `build:signature` and `check:signature` remain available for the five standalone presentations. `npm run test:signature-split` checks the standalone presentation behaviors, editor forms and documentation. `npm run test:styles:split` is a compatibility alias for the full browser suite.

For browser style checks, run `npx playwright install chromium` once, then `npm run test:styles`. These tests load the actual module distributions in a minimal Bubble-shaped DOM and check computed styles, theme switching, keyboard focus, dividers and touch targets. All suites share [browser setup, isolated contexts, error checks and cleanup](styles/README.md). They do not run Home Assistant itself.

GitHub Actions runs the unit tests on Node.js 22 and 24 and browser style checks on Chromium for every push and pull request, and can also be triggered manually. It checks alert sources, filters, caching, translations, numeric controls, metadata, YAML examples, and local documentation links. It does not replace checking the rendered cards in Home Assistant.

Signature Group 1.1.1 links a popup and a name button through their hash. Enable `background_update: true` on the popup, add `signature_group` to both cards, and keep the button’s native navigation action. Its destination is reused by the summary, without a second list of entities or conditions. See the [Group guide](signature-group/doc/README.md).

Group’s optional `presentation: chips` replaces the visible title and total count with equipment pills inherited from the popup cards. Actual available width determines how many fit; `+N` counts only hidden items and precedes the fixed right arrow. Names, atlas crops and HA light/dark artwork follow the popup, without duplicate configuration.

Panel 1.1.4 and Group 1.1.5 share opt-in `illustration.media_artwork: true` for media-player cards: prefer the entity's current `entity_picture`, preserve its aspect ratio, and restore the configured themed artwork when unavailable. Track updates follow native HA updates without new subscriptions or observers. Media covers have rounded corners; Group keeps a small inset around them without changing chip width. Panel play/pause uses a transparent background and neutral icon while retaining the native ripple and actions.

Group’s optional `hide_empty: true` hides an empty summary through the native Home Assistant visibility contract while retaining state updates. Editor previews stay available; popup placeholders receive no extra empty-state block.

## Full-width illustrated panels

Signature Panel 1.0.0 owns the two-step (118px) full-width format: 80px artwork at the right, one to three information columns with details, and up to three visible native commands. URLs, sprite indexes and conditions remain in the card, with Jinja support. Media keeps its native track, volume and controls. Daily energy/consumption/cost calculations retain Recorder's timezone and reset handling.

Square 2.0.0 removes `summary` and `activity`; Room 1.4.0 removes equipment-only `room_compact`, `room_inline_metrics` and `room_state_centered`. Room remains for room summaries, Square for measurement tiles. Install Panel and migrate wide equipment cards before upgrading these modules. Group 1.1.1 reads Panel illustrations for its activity chips. See the [Panel migration guide](signature-panel/doc/README.md#migration).
