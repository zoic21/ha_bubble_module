# Signature Navigation

Version **1.0.4**. A standalone floating navigation footer for Bubble Card **3.4.1 or later**. It uses native `sub-buttons` and their actions; the module supplies the glass surface, spacing and active-dashboard highlight.

## Installation

1. Install Bubble Card and Bubble Card Tools.
2. Import the complete [distribution](../dist/signature-navigation.yaml) in **Modules**. The module ID is `signature_navigation`.
3. Add `signature_navigation` to the footer card's `modules` list.
4. Remove the previous navigation `styles` block. Keep the native icons, names, visibility and navigation actions.

Use this module on its own, without the card-design `signature` module on the same card. The Signature theme is optional. Importing this file does not update existing dashboard cards automatically.

## Card configuration

Use `card_type: sub-buttons`, `footer_mode: true`, an empty `sub_button.main` list and one flat `sub_button.bottom` list. Nested groups and footers with main buttons are outside this module's layout; the module returns no CSS for them. Set `show_name: false` and `show_background: false` on each route to obtain the icon-only design.

```yaml
type: custom:bubble-card
card_type: sub-buttons
card_layout: large
rows: 1
footer_mode: true
footer_full_width: false
footer_width: 420
footer_bottom_offset: 16
hide_main_background: false
modules:
  - signature_navigation
sub_button:
  main: []
  bottom:
    - name: Accueil
      icon: mdi:home
      show_name: false
      show_background: false
      tap_action:
        action: navigate
        navigation_path: /lovelace/summary-home
    - name: Étage
      icon: mdi:home-floor-1
      show_name: false
      show_background: false
      tap_action:
        action: navigate
        navigation_path: /dashboard-etage/summary
```

The [complete six-route example](../examples/home.yaml) includes Accueil, Étage, RDC, Jardin, Sécurité and Informatique. Adapt the destinations to your own dashboards. The example preserves the native footer position, including Bubble's desktop sidebar offset. The module defaults the desktop width to 420 px when `footer_width` is omitted; the native `footer_bottom_offset` defaults to 16 px.

## Visual configuration

Open **Modules → Signature Navigation** for the French settings form. These options are also available in YAML:

```yaml
signature_navigation:
  mobile_margin: 24
  blur: 18
  opacity: 45
```

| Option | Default | Range | Meaning |
|---|---:|---:|---|
| `mobile_margin` | 24 px | 0–48 | Margin on each side of the viewport at widths up to 600 px |
| `blur` | 18 px | 0–32 | Backdrop blur; saturation stays at 180% |
| `opacity` | 45% | 0–100 | Theme card-surface contribution to the glass background |

Zero is a valid value. Out-of-range values are bounded to the documented limits. The bar is 64 px high with 52 px route cells and a uniform 6 px inset; the native footer fields control desktop width and bottom offset.

## Active route

The first native `navigate` action whose destination has the same dashboard segment as `window.location.pathname` is highlighted. `/dashboard-etage/summary` stays selected on the room views of `/dashboard-etage`. Dashboard names are compared as complete segments, so `/dashboard-etage-bis` does not select `/dashboard-etage`. A destination with a query or fragment keeps the same dashboard segment. Other actions keep their native behavior and are not selected automatically.

No `css_class`, fixed route list or entity is required. Selection uses Bubble's numbered sub-button classes for the flat bottom row. The module does not rewrite configuration, replace buttons or install click handlers. When a route changes, Bubble evaluates the module again as part of the card lifecycle; there is no extra route listener, entity subscription, polling or timer.

## Popups

Outside the card editor, the footer uses `z-index: 3`, below Bubble's backdrop (`4`) and popup content (`5`). Bubble's native footer uses the same level as its popups; with some card orders it covers popup content and receives clicks above the backdrop. The module corrects that stacking order automatically, using CSS only.

Popup content covers the bar where they overlap, and the backdrop covers the remaining bar and receives outside clicks. The bar is usable again when the popup closes. This does not remove the footer from the DOM or hide it completely behind a translucent backdrop. There is no new setting, popup/hash detection or extra listener. The editor preview keeps its native positioning. Updating the imported module is sufficient; existing dashboard YAML and the theme do not need changes.

## Shared appearance and corners

- Surface: `signature-card-background`, then `ha-card-background`, then `card-background-color`, then white.
- Font: `signature-font-family`, then the shared system font stack.
- Outer radius: `signature-card-border-radius`, with a 22 px fallback.
- Inner radius: outer radius minus the uniform 6 px inset, bounded at zero: **16 px by default**. The selection fills its route cell instead of using a fixed 44 px square. The first and last selections follow the bar's curve without the uneven horizontal/vertical inset of the earlier card CSS.
- Selection, hover, keyboard focus and click ripple share that inner radius and route-cell dimensions. Ripple hover is disabled to prevent a second background; click feedback remains native.
- Icons: 26 px. Active icon and keyboard focus use `primary-text-color`; inactive icons use `secondary-text-color`. With native neutral palettes, this gives an anthracite active icon in light mode and a near-white icon in dark mode.
- Selection fill: 12% primary text in the inherited card surface, then 65% of that mix in transparent. It is visibly darker in light mode and lighter in dark mode while retaining translucency. The small shadow is `0 1px 2px rgb(0 0 0 / .025)`; the inset glass highlight is attenuated to 25%.

The outer surface is intentionally different from a normal content card: a translucent fill, a single soft outer shadow and a 1 px directional rim. The rim is brightest at the top and right, fading at the bottom and left. A CSS mask keeps the gradients on the edge rather than across the whole surface. This technique was inspired by [Takagit's CSS explanation](https://zenn.dev/takagit/articles/css-liquid-glass-backdrop-filter?locale=en).

Theme variables remain in CSS so live theme changes update the same nodes. Reduced motion disables the short hover/selection transitions. The CSS approximates the glass appearance; it does not implement Apple's background refraction. No card-mod, extra frontend resource or runtime dependency is required.

## Verification

```sh
npm run test:signature-navigation
npm run test:styles
```

Unit tests exercise the actual distribution and example, native configuration preservation, dashboard matching, changed routes and visual options. Chromium fixtures check computed sizes, 26 px icon bounds, concentric corners, the masked rim, theme changes, narrow/wide layouts, hover, focus and the ripple bounds. They also check neutral selection/focus colors, translucency, a visible composed selection fill and stronger active-icon contrast in light and dark palettes, with and without the Signature theme, changing modes on the same nodes without rerendering. Popup/backdrop fixtures in independent shadow roots check real pointer clicks in mobile/desktop widths and light/dark modes: popup content and the backdrop receive clicks above the footer, and native navigation clicks work before opening and after removing the popup. These tests are simulated browser coverage; they do not demonstrate a real Home Assistant or Safari/iOS check.

## Changelog

### 1.0.4

- Placed the navigation footer below Bubble popup content and its backdrop, avoiding overlapping content and intercepted outside clicks regardless of their relative DOM order.
- Used a scoped CSS stacking correction with no popup detection or added runtime listeners. Existing dashboards only need the imported module updated.
- Added Chromium pointer-click coverage for popup/backdrop overlays and restored navigation in mobile/desktop widths and light/dark modes.

### 1.0.3

- Strengthened the neutral selection fill to 12% primary text in the card surface, retaining its 65% opacity. It darkens in light mode and brightens in dark mode using live CSS theme variables.
- Increased route icons from 24 to 26 px for better balance within the 52 px cells.
- Preserved the 64 px height, derived corners, native actions, glass surface and shadows. Updating the imported module is sufficient for existing dashboards.

### 1.0.2

- Replaced the blue active icon with the theme's primary text color, including keyboard focus.
- Added a subtly tinted translucent selection that adapts to light and dark palettes and reduced its shadow and inset highlight.
- Preserved the 64 px height, native routes, glass surface and derived corners. Updating the imported module is sufficient for existing dashboards.

### 1.0.1

- Increased the bar from 56 to 64 px and route cells, selection, hover and ripple from 44 to 52 px.
- Kept the uniform 6 px inset and derived inner radius, along with the existing width, margins, glass and icon sizes.
- Updating the imported module is sufficient for cards already using `signature_navigation`; no dashboard YAML changes are required.

### 1.0.0

- Extracted the user-approved glass navigation into its own module.
- Added a French settings form for mobile margins, blur and background opacity.
- Preserved native sub-button actions and automatic dashboard selection without required CSS classes.
- Corrected the selection corners with a uniform 6 px inset and a radius derived from the bar.
