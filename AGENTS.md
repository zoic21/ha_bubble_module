# Repository instructions

- All module distributions are generated. Edit `src` and shared source files, then run `npm run build:modules` and `npm run check:modules`. See [shared/README.md](shared/README.md). Never patch `dist` directly.

Before changing styles in Signature, Signature Flow, Signature Weather, Signature Wind Rose or the shared theme, read [STYLE_GUIDE.md](STYLE_GUIDE.md).

- Keep shared visual roles consistent, including their CSS variable fallbacks without the Signature theme.
- Preserve documented layout-specific density, native visibility, entities and actions.
- Keep theme variables in CSS so cached modules follow live theme changes.
- Run `npm test` and `npm run test:styles` for visual changes; install the Playwright Chromium browser when needed.
- Update affected module versions, root version table, module guides and style documentation when publishing a change.
- Report fixture/browser coverage accurately. Do not claim a real Home Assistant or Safari/iOS check from Chromium fixture results.
