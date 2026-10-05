      /* @include signature-shared/src/editor.js */
      const c = this.config;
      const o = c.signature || {};
      const root = this.card;
      const kind = c.card_type || 'button';
      const tileEnabled = root && !['title','heading'].includes(o.layout)
        && c.button_type !== 'slider' && ['button','cover','climate'].includes(kind);
      /* @include signature-shared/src/lifecycle.js */
      // Section titles are native separators, isolated from tile styling and actions.
      if (c.card_type === 'separator') {
        if (o.layout !== 'title') return '';
        return `
          .bubble-container {
            height: 32px !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          ha-card {
            font-family: var(--signature-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .bubble-icon {
            --mdc-icon-size: 20px !important;
            margin: 0 9px 0 2px !important;
            color: var(--secondary-text-color) !important;
          }
          .bubble-name {
            min-width: 0;
            font-size: 18px !important;
            font-weight: var(--signature-font-weight-semibold, 600) !important;
            letter-spacing: -0.3px;
            margin-right: 14px !important;
            color: var(--secondary-text-color) !important;
          }
          .bubble-line {
            display: none !important;
          }
          /* Native transition: all must not animate initial layout sizing. */
          .bubble-wrapper { transition: none !important; }
          .bubble-sub-button {
            transition: background-color 160ms ease, color 160ms ease, opacity 160ms ease !important;
          }
          .bubble-sub-button-container {
            margin-inline-start: auto !important;
            flex-shrink: 0;
          }
        `;
      }
      // A title layout must not turn other card types into compact tiles.
      if (o.layout === 'title') return '';
      // Sliders and one-off card families are outside this module.
      if (c.button_type === 'slider' || !['button','cover','climate','media-player'].includes(c.card_type || 'button')) return '';
      // Obsolete heading mode is outside the three tile families.
      if (o.layout === 'heading') return '';
      if (!root) return '';
      /* @include shared/src/number-format.js */
      const attr = (key,value) => { if (root.getAttribute(key) !== value) root.setAttribute(key,value); };
      let layout = ['square','room','header'].includes(o.layout) ? o.layout : 'compact';
      if (kind !== 'button' || c.button_type === 'switch') layout = 'compact';
      if (layout === 'header' && c.button_type !== 'name') layout = 'compact';
      /* @include signature-shared/src/value-helpers.js */
      /* @include signature-compact/src/media.js */
      /* @include signature-shared/src/structure.js */
      /* @include signature-shared/src/value-config.js */
      /* @include signature-compact/src/number.js */
      /* @include signature-shared/src/value-render.js */
      /* @include signature-shared/src/value-observer.js */
      /* @include signature-room/src/room-temperature.js */
      /* @include signature-shared/src/secondary.js */
      /* @include signature-shared/src/actions.js */
      /* @include signature-shared/src/appearance.js */
      /* @include signature-room/src/room-geometry.js */
      const paint = (selector,b,spec = {},auto = false) => {
        const st = hass.states[b.entity];
        const d = (b.entity || '').split('.')[0];
        let fg = '', bg = '', opacity = '';
        if (auto && st) {
          const active = d === 'climate' ? ['heating','preheating','cooling'].includes(st.attributes.hvac_action) : d === 'cover' ? ['open','opening','closing'].includes(st.state) : st.state === 'on';
          const activeColor = d === 'cover' || st.attributes.hvac_action === 'cooling' ? 'var(--info-color, #039be5)' : 'var(--warning-color, #ff9800)';
          fg = active ? activeColor : 'var(--secondary-text-color)';
          bg = active ? 'color-mix(in srgb, '+activeColor+' 16%, '+neutralSurface+')' : 'color-mix(in srgb, var(--primary-text-color) 4%, '+neutralSurface+')';
          opacity = ['unknown','unavailable'].includes(st.state) ? '0.4' : '1';
        }
        if (String(spec.color ?? '').trim()) fg = color(spec.color,fg || accent,b.entity);
        if (String(spec.background ?? '').trim()) bg = color(spec.background,bg || 'transparent',b.entity);
        if (spec.opacity != null) opacity = number(render(spec.opacity,b.entity),1,0,1);
        const target = layout === 'room' && roleSet.has(b) ? selector+' .bubble-sub-button-icon' : selector;
        const declarations = (fg?'color:'+fg+' !important;':'')+(bg?'background:'+bg+' !important;':'')+(opacity!==''?'opacity:'+opacity+' !important;':'');
        if (declarations) css += target+' {'+declarations+'}';
        if (spec.column != null) css += selector+' { --room-control-column:'+ (number(spec.column,1,1,roomColumns)-1) +'; }';
        return opacity;
      };
      if (layout === 'room' && o.room_auto_colors !== false) roles.forEach(({b,selector}) => {
        // Explicit role styles paint the same automatic defaults plus their overrides below.
        if (!structure.styledButtons.has(b)) paint(selector,b,{},true);
      });
      if (layout === 'header') flat.forEach((b,i) => paint('ha-card .bubble-sub-button-'+(i+1), b, {background:'color-mix(in srgb, '+accent+' 12%, '+neutralSurface+')'}));
      const visualSwitches = ['square','compact'].includes(layout) && structure.hasSwitches;
      if (visualSwitches && !structure.switchCSS) {
        const selectors = styles.filter(style => style.visualSwitch).map(style => 'ha-card[data-dp-layout] .bubble-sub-button.'+style.cls);
        const select = suffix => selectors.map(selector => selector+suffix).join(', ');
        // Share geometry within this card; only the track, position and opacity vary per switch.
        structure.switchCSS = `
          ${select('')} {
            position: relative; width: 52px !important; min-width: 52px !important;
            height: 34px !important; flex: 0 0 52px; padding: 0 !important;
            border-radius: 17px !important; box-shadow: none !important;
          }
          ${select(' :is(.bubble-sub-button-icon,.bubble-sub-button-name-container)')} { display: none !important; }
          ${select('::before')} {
            content: ''; position: absolute; left: 2px; top: 3px;
            width: 48px; height: 28px; border-radius: 14px;
            background: var(--dp-switch-track); pointer-events: none;
            transition: background 160ms ease;
          }
          ${select('::after')} {
            content: ''; position: absolute; left: 4px; top: 5px;
            width: 24px; height: 24px; border-radius: 50%; background: #fff;
            box-shadow: 0 1px 3px rgb(0 0 0 / 0.15);
            transform: translateX(var(--dp-switch-offset));
            transition: transform 160ms ease, background 160ms ease; pointer-events: none;
          }
          @media (prefers-reduced-motion: reduce) {
            ${select('::before')}, ${select('::after')} { transition: none; }
          }
        `;
      }
      if (visualSwitches) css += structure.switchCSS;
      styles.forEach(({cls,b,spec,visualSwitch,lock}) => {
        const opacity = paint('ha-card .'+cls,b,spec,layout === 'room' && o.room_auto_colors !== false && roleSet.has(b));
        if (spec.type === 'mode' && layout === 'compact'
            && (!b.sub_button_type || b.sub_button_type === 'default')) {
          css += `
            ha-card[data-dp-layout="compact"] .${cls} {
              width: 46px; min-width: 46px; height: 44px; padding: 0;
              box-sizing: border-box; font-size: 11px; font-weight: var(--signature-font-weight-semibold, 600);
            }
          `;
        }
        // Reuse Bubble's Jinja renderer, including dependencies on other entities.
        const iconName = render(spec.icon,b.entity).trim();
        if (/^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/.test(iconName)) {
          root.querySelectorAll('ha-card .'+cls+' .bubble-sub-button-icon').forEach(icon => {
            desiredIcons.set(icon,iconName);
          });
        }
        // Style only: explicit lock actions, visibility and native handlers stay untouched.
        if (visualSwitch && visualSwitches) {
          const state = hass.states[b.entity]?.state;
          // ON means passage allowed for locks; transitional/unknown states are dimmed.
          const on = state === (lock ? 'unlocked' : 'on');
          const available = (lock ? ['locked','unlocked'] : ['on','off']).includes(state);
          const selector = 'ha-card[data-dp-layout] .bubble-sub-button.'+cls;
          // Inherit the configured icon/card color unless this switch has its own color.
          const tint = color(spec.color,iconTint,b.entity);
          const track = on ? tint : 'color-mix(in srgb, var(--primary-text-color) 18%, '+neutralSurface+')';
          css += `
            ${selector} {
              --dp-switch-track: ${track}; --dp-switch-offset: ${on ? '20px' : '0px'};
              background: transparent !important; opacity: ${(opacity === '' ? 1 : opacity) * (available ? 1 : .4)} !important;
            }
          `;
          if (layout === 'square' && o.controls === 'measure' && b === flat[0])
            css += 'ha-card[data-dp-controls="measure"] .bubble-name { padding-right: 54px; }';
        }

      });
      iconOverrides.forEach((value,icon) => {
        if (desiredIcons.has(icon)) return;
        restoreIcon(icon,value);
        iconOverrides.delete(icon);
      });
      desiredIcons.forEach((iconName,icon) => {
        const current = icon.getAttribute('icon');
        const previous = iconOverrides.get(icon);
        const original = previous && current === previous.applied ? previous.original : current;
        iconOverrides.set(icon,{original,applied:iconName});
        if (current !== iconName) icon.setAttribute('icon',iconName);
      });
      // Cache the layout CSS only. Dynamic states, templates and actions still run above.
      const styleKey = [layout,kind,surface,roomColumns,roomRows,roomHeaderMeasures,autoHeight,numberEnabled,o.controls === 'measure',compactValue,valueTrailing,!!secondary,multiline].join('\u0001');
      if (runtime.styleKey !== styleKey) {
        runtime.styleCSS = `/* Shared design tokens for all three tile families. */
    ha-card[data-dp-layout] {
      --dp-radius: var(--signature-card-border-radius, 22px);
      --dp-divider-color: var(--signature-divider-color, color-mix(in srgb, var(--primary-text-color) 8%, transparent));
      font-family: var(--signature-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-weight: var(--signature-font-weight-normal, 400);
      --dp-tint: 16%;
      --dp-surface: ${surface};
      --bubble-border-radius: var(--dp-radius, 22px);
      --bubble-main-background-color: var(--dp-surface);
      --bubble-accent-color: var(--dp-accent);
      --dp-icon-surface: ${iconSurface};
      --bubble-icon-background-color: ${neutralSurface};
      --bubble-icon-border-radius: var(--signature-icon-border-radius, 12px);
      --bubble-sub-button-border-radius: var(--signature-control-border-radius, 14px);
      --bubble-box-shadow: var(--signature-card-box-shadow,var(--ha-card-box-shadow,0 2px 10px rgb(0 0 0 / .035)));
      --bubble-border: 1px solid var(--signature-card-border-color, color-mix(in srgb, var(--primary-text-color) 5%, transparent));
      border: 0; box-shadow: none;
    }
    /* Scope the tint to the main icon: native sub-buttons share Bubble's fallback token. */
    ha-card[data-dp-layout] .bubble-main-icon-container { --bubble-icon-background-color: var(--dp-icon-surface); border-radius: var(--bubble-icon-border-radius) !important; }
    ha-card[data-dp-layout] :is(.bubble-name,.bubble-state,.bubble-sub-button-name-container) { font-family: inherit; }
    /* Secondary color supplies attenuation; ordinary states stay fully opaque. */
    ha-card[data-dp-layout] .bubble-state { font-weight: var(--signature-font-weight-normal, 400); opacity: 1; }
    ha-card[data-dp-layout] .dp-unit { font-size: .8em; letter-spacing: 0; color: var(--secondary-text-color); }
    ha-card[data-dp-layout] .dp-unit:not(:empty) { margin-inline-start: 4px; }
    /* Compound durations keep their original spaces between numbers and units. */
    ha-card[data-dp-layout] .dp-unit.dp-duration-unit { margin-inline-start: 0; }
    ${secondary ? `ha-card[data-dp-layout] .dp-secondary { font-size: var(--signature-secondary-font-size, 13px); line-height: max(16px, calc(var(--signature-secondary-font-size, 13px) * 1.2)); color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; pointer-events: none; }
    ha-card[data-dp-layout] .dp-secondary strong { font-weight: var(--signature-font-weight-semibold, 600); color: var(--primary-text-color); }` : ''}
    ${multiline ? `ha-card[data-dp-multiline="yes"] .bubble-state, ha-card[data-dp-multiline="yes"] .dp-secondary { white-space: pre-line !important; overflow-wrap: anywhere; }` : ''}
    /* Never undo native visibility, including grouped sub-buttons and conditional badges. */
    ha-card[data-dp-layout] .hidden, ha-card[data-dp-layout] [hidden] { display: none !important; }

    /* Native active states must not override the chosen card surface. */
    ha-card[data-dp-layout] .bubble-button-background { background: transparent !important; }

    /* Native active badges keep their state color, with a readable pastel surface. */
    ha-card[data-dp-layout] .bubble-sub-button.background-on:not(.is-select) {
      background-color: color-mix(in srgb, var(--bubble-sub-button-light-background-color, var(--dp-accent)) 16%, ${neutralSurface});
      color: var(--primary-text-color);
    }

    /* Only the displayed value catches the pointer; surrounding space belongs to the tile. */
    ha-card[data-dp-layout] .dp-value-action { pointer-events: auto; cursor: pointer; }
    ha-card[data-dp-layout] .bubble-state.dp-value-action { width: fit-content; max-width: 100%; }
    ${secondary ? `ha-card[data-dp-layout] .dp-secondary.dp-value-action { width: fit-content; max-width: 100%; }` : ''}
    ${compactValue ? `ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"] .bubble-state.dp-value-action { justify-self: end; }` : ''}
    ` + (layout === 'header' ? `/* Page header: native sub-buttons retain their labels, visibility and actions. */
    ha-card[data-dp-layout="header"] {
      background: transparent !important; border: none !important;
      box-shadow: none !important; width: 100% !important; height: auto !important;
      container-type: inline-size;
    }
    ha-card[data-dp-layout="header"] .card-content { width: 100% !important; margin: 0 !important; padding: 0 !important; }
    ha-card[data-dp-layout="header"] .bubble-button-card-container {
      width: 100% !important; height: auto !important; min-height: 0 !important;
      background: transparent !important; border: none !important;
      box-shadow: none !important; overflow: visible !important;
    }
    /* Keep native layout changes immediate when the module styles are applied. */
    ha-card[data-dp-layout="header"] .bubble-wrapper {
      transition: none !important;
      position: relative !important; display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto; align-items: center;
      gap: 16px; padding: 6px 0 !important;
      width: 100% !important; height: auto !important; box-sizing: border-box;
    }
    ha-card[data-dp-layout="header"] .bubble-content-container { min-width: 0 !important; }
    ha-card[data-dp-layout="header"] .bubble-name-container { margin: 0 !important; min-width: 0 !important; overflow: visible !important; }
    /* Bubble's non-scrolling line clamp clips large glyphs, including the descender in Étage. */
    ha-card[data-dp-layout="header"] .bubble-name { display: block !important; overflow: visible !important; font-size: 38px !important; line-height: 1.15 !important; font-weight: var(--signature-font-weight-bold, 700) !important; letter-spacing: -1.2px; white-space: normal; }
    ha-card[data-dp-layout="header"] .bubble-sub-button-container {
      position: static !important; display: flex !important;
      flex-wrap: wrap !important; justify-content: flex-end !important;
      width: auto !important; min-width: 0; margin: 0 !important; gap: 8px !important;
    }
    ha-card[data-dp-layout="header"] .bubble-sub-button-group { display: contents !important; }
    ha-card[data-dp-layout="header"] .bubble-sub-button {
      transition: background-color 160ms ease, color 160ms ease, opacity 160ms ease !important;
      height: 44px !important; min-width: 0 !important; padding: 0 14px !important;
      border-radius: 24px !important; border: none !important; box-shadow: none !important;
    }
    @container (max-width: 900px) {
      ha-card[data-dp-layout="header"] .bubble-wrapper { grid-template-columns: minmax(0, 1fr); gap: 12px; }
      ha-card[data-dp-layout="header"] .bubble-sub-button-container { justify-content: flex-start !important; }
    }
    @container (max-width: 600px) {
      ha-card[data-dp-layout="header"] .bubble-name { font-size: 32px !important; letter-spacing: -0.8px; }
      ha-card[data-dp-layout="header"] .bubble-sub-button { padding: 0 10px !important; }
    }
    ` : layout === 'square' ? `/* Layout changes are confined to button name/state cards. */
    ha-card[data-dp-layout="square"] .bubble-container { container-type: inline-size; }
    ha-card[data-dp-layout="square"] .bubble-state:not(.hidden) { min-width: 0; margin: 0 !important; color: var(--primary-text-color); font-variant-numeric: tabular-nums; opacity: 1 !important; white-space: nowrap; }
    /* Square: title / value / optional secondary. */
    /* 9px inside the 1px border gives a 10px inset: card radius 22px, icon radius 12px. */
    ha-card[data-dp-layout="square"] .bubble-content-container { min-width: 0; margin: 0 !important; pointer-events: none; position: absolute; inset: 9px; display: grid !important; grid-template-columns: 36px minmax(0,1fr); grid-template-rows: 36px minmax(0,1fr); gap: 6px 10px; }
    ha-card[data-dp-layout="square"] .bubble-name-container { display: contents !important; }
    ha-card[data-dp-layout="square"] .bubble-icon-container { margin: 0 !important; pointer-events: auto; grid-area: 1 / 1; width: 36px; height: 36px; min-width: 36px !important; min-height: 36px !important; --mdc-icon-size: 22px; }
    ha-card[data-dp-layout="square"] .bubble-name { min-width: 0; font-size: var(--signature-name-font-size, 14px) !important; font-weight: var(--signature-font-weight-semibold, 600); line-height: 20px; letter-spacing: -0.2px; color: var(--primary-text-color); grid-area: 1 / 2; align-self: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    ha-card[data-dp-layout="square"] .bubble-state { grid-area: 2 / 1 / 3 / 3; align-self: center; font-size: var(--signature-value-font-size, 28px) !important; line-height: 1.1; letter-spacing: -.7px; font-weight: var(--signature-font-weight-medium, 500) !important; overflow: hidden; text-overflow: ellipsis; }
    ${secondary ? `ha-card[data-dp-layout="square"][data-dp-secondary="yes"] .bubble-content-container { grid-template-rows: 36px minmax(0,1fr) max(16px, calc(var(--signature-secondary-font-size, 13px) * 1.2)); row-gap: 4px; }
    ha-card[data-dp-layout="square"] .dp-secondary { grid-area: 3 / 1 / 4 / 3; }` : ''}
    ha-card[data-dp-layout="square"][data-dp-icon="no"] .bubble-name { grid-column: 1 / 3; }

    ha-card[data-dp-layout="square"] .bubble-button-card { transition: none !important; }

    ha-card[data-dp-layout="square"] .dp-unit { font-size: var(--signature-value-unit-font-size, 16px); font-weight: var(--signature-font-weight-normal, 400); }
    ` : layout === 'room' ? `/* A room has a stable height and only explicitly identified roles are moved. */
    ha-card[data-dp-layout="room"] .bubble-container { height: ${156 + roomExtraHeight}px !important; min-height: ${156 + roomExtraHeight}px !important; container-type: inline-size; }
    ha-card[data-dp-layout="room"] .bubble-wrapper { position: static !important; }
    ha-card[data-dp-layout="room"] .bubble-content-container { position: absolute; inset: 12px; display: grid !important; grid-template-columns: 38px minmax(0,1fr); grid-template-rows: 38px 32px; gap: 10px 10px; margin: 0 !important; pointer-events: none; }
    ha-card[data-dp-layout="room"] .bubble-name-container { display: contents !important; }
    ha-card[data-dp-layout="room"] .bubble-icon-container { grid-area: 1 / 1; width: 38px; height: 38px; min-width: 38px !important; min-height: 38px !important; margin: 0 !important; background: var(--bubble-icon-background-color); --mdc-icon-size: 24px; pointer-events: auto; }
    ha-card[data-dp-layout="room"] .bubble-name { grid-area: 1 / 2; align-self: center; font-size: var(--signature-name-font-size, 14px) !important; font-weight: var(--signature-font-weight-semibold, 600); letter-spacing: -0.2px; line-height: 19px; white-space: normal; max-height: 38px; overflow: hidden; }
    ha-card[data-dp-layout="room"] .bubble-state { grid-area: 2 / 1 / 3 / 3; align-self: center; font-size: 17px; line-height: 22px; opacity: 1; }
    ${secondary ? `/* Secondary text gets its own row; reserve the footer even when it wraps. */
    ha-card[data-dp-layout="room"][data-dp-secondary="yes"] .bubble-container { height: auto !important; min-height: ${180 + (roomRows - 1) * 48}px !important; }
    ha-card[data-dp-layout="room"][data-dp-secondary="yes"] .bubble-wrapper { display: block !important; height: auto !important; }
    ha-card[data-dp-layout="room"][data-dp-secondary="yes"] .bubble-content-container { position: relative; inset: auto; width: 100%; box-sizing: border-box; padding: 12px 12px ${68 + (roomRows - 1) * 48}px; grid-template-rows: 38px 32px auto; }
    ha-card[data-dp-layout="room"] .dp-secondary { grid-area: 3 / 1 / 4 / 3; }` : ''}
    ha-card[data-dp-layout="room"][data-dp-has-state="yes"] :is(.room-temperature,.room-humidity) { display: none !important; }
    ha-card[data-dp-layout="room"] :is(.bubble-sub-button-container,.bubble-sub-button-group) { position: static !important; transform: none !important; }
    ha-card[data-dp-layout="room"] :is(.room-temperature,.room-humidity,.room-status,.room-climate,[class*="room-control-"]) { position: absolute !important; margin: 0 !important; padding: 0 !important; min-width: 0 !important; box-sizing: border-box; transform: none !important; }
    ha-card[data-dp-layout="room"] :is(.room-temperature,.room-humidity) { top: 62px; bottom: auto; width: max-content; height: 32px; background: transparent !important; font-variant-numeric: tabular-nums; }
    ha-card[data-dp-layout="room"] .room-temperature { left: 12px; right: auto; max-width: calc(100% - 78px); font-size: clamp(20px,14cqw,var(--signature-temperature-font-size,30px)); font-weight: var(--signature-font-weight-medium, 500); letter-spacing: -.7px; color: var(--primary-text-color); }
    ha-card[data-dp-layout="room"] .room-humidity { left: auto; right: 12px; max-width: 58px; flex-direction: row !important; gap: 3px; font-size: var(--signature-caption-font-size, 12px); font-weight: var(--signature-font-weight-normal, 400); color: var(--secondary-text-color); }
    ha-card[data-dp-layout="room"] :is(.room-temperature,.room-humidity) .bubble-sub-button-name-container { margin: 0 !important; white-space: nowrap; line-height: 32px; font-size: inherit; overflow: hidden; text-overflow: ellipsis; }
    ha-card[data-dp-layout="room"] .dp-room-unit { font-size: var(--signature-temperature-unit-font-size, 13px); font-weight: var(--signature-font-weight-normal, 400); letter-spacing: 0; color: var(--secondary-text-color); }
    ha-card[data-dp-layout="room"][data-dp-room-temperature-text="yes"] .room-temperature { font-size: 15px; letter-spacing: 0; }
    ha-card[data-dp-layout="room"] .room-humidity .bubble-sub-button-icon { --mdc-icon-size: 13px; color: inherit; }
    ha-card[data-dp-layout="room"] .room-humidity:not(:has(.bubble-sub-button-icon:not(.hidden):not([hidden])))::before {
      content: ''; display: block; width: 11px; height: 14px; flex: 0 0 11px; background: currentColor;
      mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3C10 7 5 12 5 16a7 7 0 0 0 14 0c0-4-5-9-7-13Z' fill='none' stroke='black' stroke-width='1.8'/%3E%3C/svg%3E") center / contain no-repeat;
    }
    ${roomHeaderMeasures ? `
    ha-card[data-dp-layout="room"] .bubble-content-container { right: 100px; }
    ha-card[data-dp-layout="room"] .room-temperature { top: 12px; left: auto; right: 12px; height: 22px; max-width: 82px; font-size: 20px; letter-spacing: -0.2px; }
    ha-card[data-dp-layout="room"] .room-temperature .bubble-sub-button-name-container { line-height: 22px; }
    ha-card[data-dp-layout="room"] .room-humidity { top: 34px; height: 16px; }
    ha-card[data-dp-layout="room"] .room-humidity .bubble-sub-button-name-container { line-height: 16px; }
    ` : ''}
    /* The divider exists only for real controls and never intercepts a tap. */
    ha-card[data-dp-layout="room"] .bubble-container:has(:is([class*="room-control-"],.room-climate):not(.hidden):not([hidden]))::after { content: ''; position: absolute; inset-inline: var(--signature-divider-inset, 16px); bottom: ${roomDividerBottom}px; height: 1px; background: var(--dp-divider-color); pointer-events: none; }
    ha-card[data-dp-layout="room"] :is([class*="room-control-"],.room-climate) { top: auto; right: auto; bottom: calc(${roomControlBottom}px + (${roomRows - 1} - var(--dp-room-row,0)) * ${roomControlPitch}px); left: calc(8px + var(--room-control-column,var(--dp-room-column,0)) * (100% - 16px) / ${roomColumns}); width: calc((100% - 16px) / ${roomColumns}); height: 44px; justify-content: center; background: transparent !important; box-shadow: none !important; }
    ha-card[data-dp-layout="room"] :is([class*="room-control-"],.room-climate) .bubble-sub-button-icon { width: 36px; height: 36px; padding: 8px; box-sizing: border-box; border-radius: 50%; --mdc-icon-size: 20px; }
    ha-card[data-dp-layout="room"] .room-status { top: 7px; left: 43px; width: 22px; height: 22px; border-radius: 50%; background: ${neutralSurface}; color: var(--warning-color,#ff9800); --mdc-icon-size: 16px; z-index: 2; }

    ha-card[data-dp-layout="room"] .bubble-main-icon { color: var(--primary-text-color); opacity: 1; }
    ha-card[data-dp-layout="room"] .room-status .bubble-sub-button-icon { color: inherit; }

    ha-card[data-dp-layout="room"] .dp-unit { font-size: 11px; }
    ` : `/* One compact tile for native cover, climate and button controls. */
    ha-card[data-dp-layout="compact"] { container-type: inline-size; ${kind === 'cover' ? `--bubble-cover-button-background-color: ${neutralSurface}; --bubble-cover-buttons-border-radius: var(--signature-control-border-radius, 14px);` : ''} ${kind === 'climate' || numberEnabled ? `--bubble-climate-background-color: transparent; --bubble-climate-button-background-color: ${neutralSurface};` : ''} }
    /* Match the centered 36px icon's 10px vertical inset, including the 1px card border. */
    ha-card[data-dp-layout="compact"] .bubble-wrapper { display: flex !important; align-items: center !important; gap: 2px; padding: 0 4px; padding-inline-start: 9px; box-sizing: border-box; transition: none !important; }
    ha-card[data-dp-layout="compact"] .bubble-content-container { flex: 1; display: flex !important; align-items: center; min-width: 0; }
    ha-card[data-dp-layout="compact"] .bubble-icon-container { width: 36px; height: 36px; min-width: 36px !important; min-height: 36px !important; margin: 0 4px 0 0 !important; background: var(--bubble-icon-background-color) !important; border-radius: var(--bubble-icon-border-radius) !important; }
    ha-card[data-dp-layout="compact"] .bubble-main-icon { --mdc-icon-size: 22px; color: var(--dp-accent); }
    ha-card[data-dp-layout="compact"] .bubble-name-container { margin: 0 !important; min-width: 0; }
    /* Keep glyphs inside Bubble's clipped name; max-height still measures the two content lines. */
    ha-card[data-dp-layout="compact"] .bubble-name { color: var(--primary-text-color); font-size: var(--signature-name-font-size, 14px); font-weight: var(--signature-font-weight-semibold, 600); letter-spacing: -0.2px; line-height: max(16px, calc(var(--signature-name-font-size,14px) * 1.1)); padding-block: 2px; box-sizing: content-box; white-space: normal; }
    ha-card[data-dp-layout="compact"] .bubble-state { color: var(--secondary-text-color); font-size: var(--signature-secondary-font-size,13px); line-height: max(16px, calc(var(--signature-secondary-font-size, 13px) * 1.2)); white-space: normal; }
    ${!compactValue ? `/* Two name lines and one state line fit the 56px tile; multiline remains an explicit opt-in. */
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="standard"] .bubble-name { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; max-height: calc(2 * max(16px, calc(var(--signature-name-font-size,14px) * 1.1))); overflow: hidden; }
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="standard"] .bubble-state { display: block; letter-spacing: -0.1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* Native inline wrapping must not turn a compact state into an extra row. */
    ${!multiline ? `ha-card[data-dp-layout="compact"][data-dp-compact-mode="standard"][data-dp-multiline="no"] .bubble-state { display: block !important; white-space: nowrap !important; }` : ''}` : ''}
    ha-card[data-dp-layout="compact"] .bubble-sub-button-container { position: relative !important; inset-inline-end: 0 !important; margin: 0 !important; flex-shrink: 0; z-index: 2; }
    ha-card[data-dp-layout="compact"] .bubble-buttons-container { position: static !important; margin: 0 !important; gap: 4px; flex-shrink: 0; }
    /* Two compact rows plus the native row gap equal a two-row square. */
    ha-card[data-dp-layout="compact"] .bubble-container { height: var(--row-height, 56px) !important; }
    ${kind === 'cover' ? `/* Match the 128px thermostat group so mode badges share the same column. */
    ha-card[data-dp-layout="compact"][data-dp-kind="cover"] .bubble-buttons-container { width: 128px; justify-content: space-between; }
    ha-card[data-dp-layout="compact"] .bubble-cover-button { transition: none !important; width: 38px; min-width: 38px; height: 44px; margin: 0; }
    ha-card[data-dp-layout="compact"] .bubble-cover-button-icon { --mdc-icon-size: 20px; }` : ''}
    ${kind === 'climate' || numberEnabled ? `ha-card[data-dp-layout="compact"] :is(.bubble-temperature-container,.bubble-low-temp-container,.bubble-high-temp-container) { width: 128px; height: 44px; flex-shrink: 0; justify-content: space-between; }
    ha-card[data-dp-layout="compact"] :is(.bubble-climate-minus-button,.bubble-climate-plus-button) { width: 38px; min-width: 38px; height: 44px; margin: 0; }
    ha-card[data-dp-layout="compact"] .bubble-climate-temp-display { flex: 1; padding: 0 2px; font-size: var(--signature-caption-font-size, 12px); font-weight: var(--signature-font-weight-semibold, 600); }` : ''}

    ha-card[data-dp-layout="compact"] .dp-unit { font-size: 10px; }

    ` + (numberEnabled ? `/* Button cards do not load Bubble's climate CSS. Geometry is included above. */
    ha-card[data-dp-controls="number"] .bubble-state { display: none !important; }
    ha-card .dp-number-control { display: inline-flex; position: relative; align-items: center; border-radius: var(--bubble-sub-button-border-radius); background: var(--bubble-climate-button-background-color, var(--dp-surface)); }
    ha-card .dp-number-control button { display: flex; align-items: center; justify-content: center; position: relative; appearance: none; border: 0; padding: 0; background: transparent; color: var(--primary-text-color); font-family: inherit; cursor: pointer; border-radius: var(--bubble-sub-button-border-radius); box-sizing: border-box; }
    ha-card .dp-number-control .bubble-climate-temp-display { height: 44px; white-space: nowrap; }
    ha-card .dp-number-control ha-icon { --mdc-icon-size: 16px; }
    ha-card .dp-number-control button:disabled { opacity: 0.35; cursor: default; }
    ha-card .dp-number-control button:focus-visible { outline: 2px solid var(--dp-accent); outline-offset: -2px; }

    ` : '') + (compactValue ? `/* A value is the native main state, placed beside the title in the compact tile. */
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"] .bubble-name-container {
      display: grid;
      grid-template-columns: minmax(0, 1fr) fit-content(60%);
      align-items: center;
      column-gap: 6px;
    }
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"] .bubble-name {
      grid-area: 1 / 1 / 3 / 2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"] .bubble-state {
      grid-area: 1 / 2 / 3 / 3;
      display: block !important;
      min-width: 0;
      font-size: var(--signature-compact-value-font-size, 20px);
      font-weight: var(--signature-font-weight-medium, 500);
      font-variant-numeric: tabular-nums;
      color: var(--primary-text-color);
      padding-inline-end: 6px;
      box-sizing: border-box;
      line-height: 1.1;
      white-space: nowrap;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 1;
    }
    ${!multiline ? `ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"][data-dp-multiline="no"] .bubble-state { white-space: nowrap !important; }` : ''}
    /* Text values need room for accents and descenders inside Bubble's clipped native state. */
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"][data-dp-value-text="yes"] .bubble-state { font-size: 16px; font-weight: var(--signature-font-weight-normal, 400); color: var(--secondary-text-color); line-height: 1.3; padding-block: 2px; }
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"][data-dp-value-text="yes"][data-dp-color-background="yes"] .bubble-state { color: var(--dp-accent); }
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"] .dp-unit { font-size: var(--signature-secondary-font-size, 13px); font-weight: var(--signature-font-weight-normal, 400); }
    ${secondary ? `ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"] .dp-secondary { grid-area: 2 / 1; }
    ha-card[data-dp-layout="compact"][data-dp-compact-mode="value"][data-dp-secondary="yes"] .bubble-name { grid-area: 1 / 1; }` : ''}
    ` : '') + (valueTrailing ? `/* Flatten only layout boxes: keep the native state node, formatting and action bindings. */
    ha-card[data-dp-value-trailing="yes"] .bubble-wrapper {
      display: grid !important;
      grid-template-columns: 36px minmax(0, 1fr) auto fit-content(60%);
      grid-template-rows: 1fr 1fr;
      column-gap: 4px;
      row-gap: 0;
    }
    ha-card[data-dp-value-trailing="yes"] :is(.bubble-content-container,.bubble-name-container) { display: contents !important; }
    ha-card[data-dp-value-trailing="yes"] .bubble-icon-container { grid-area: 1 / 1 / 3 / 2; margin: 0 !important; }
    ha-card[data-dp-value-trailing="yes"] .bubble-name { grid-area: 1 / 2 / 3 / 3 !important; align-self: center; min-width: 0; }
    ha-card[data-dp-value-trailing="yes"] .bubble-sub-button-container { grid-area: 1 / 3 / 3 / 4; align-self: center; }
    ha-card[data-dp-value-trailing="yes"] .bubble-state { grid-area: 1 / 4 / 3 / 5 !important; align-self: center; }
    ${secondary ? `ha-card[data-dp-value-trailing="yes"] .dp-secondary { grid-area: 2 / 2 / 3 / 3 !important; align-self: start; min-width: 0; }
    ha-card[data-dp-value-trailing="yes"][data-dp-secondary="yes"] .bubble-name { grid-area: 1 / 2 / 2 / 3 !important; align-self: end; }` : ''}
    ha-card[data-dp-value-trailing="yes"][data-dp-icon="no"] .bubble-wrapper { grid-template-columns: 0 minmax(0, 1fr) auto fit-content(60%); }
    ` : '')) + (autoHeight ? `/* Let square cards grow with their content without altering the shared typography. */
    /* The grid provides a shared height; flex keeps intrinsic text sizing and fills each cell. */
    :host { height: 100%; }
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"] { height: 100%; display: flex; flex-direction: column; }
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"] .card-content { flex: 1; display: flex; flex-direction: column; }
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"] .bubble-container { height: auto !important; flex: 1; }
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"] .bubble-wrapper { position: relative !important; height: auto !important; }
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"] .bubble-content-container {
      position: relative; inset: auto; width: 100%; box-sizing: border-box;
      padding: 9px; grid-template-rows: 36px auto;
    }
    ${secondary ? `ha-card[data-dp-layout="square"][data-dp-auto-height="yes"][data-dp-secondary="yes"] .bubble-content-container { grid-template-rows: 36px auto auto; }
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"] .dp-secondary { overflow: visible; text-overflow: clip; }` : ''}
    ha-card[data-dp-layout="square"][data-dp-auto-height="yes"][data-dp-measure-detail="yes"] .bubble-content-container { bottom: auto; padding-bottom: 26px; }
    ` : '') + (layout === 'square' && o.controls === 'measure' ? `/* Optional measurement controls; leave visibility and state_background native. */
    ha-card[data-dp-controls="measure"] .bubble-name { padding-right: 34px; }
    ha-card[data-dp-controls="measure"][data-dp-measure-detail="yes"] .bubble-content-container { bottom: 26px; }
    ha-card[data-dp-controls="measure"] :is(.bubble-sub-button-container,.bubble-sub-button-group) { position: static !important; }
    ha-card[data-dp-controls="measure"] .bubble-sub-button-1 { position: absolute !important; top: 8px; right: 10px; width: 34px; min-width: 34px !important; height: 34px; padding: 0; border-radius: 50%; --mdc-icon-size: 20px; }
    ha-card[data-dp-controls="measure"] .bubble-sub-button-2 { position: absolute !important; top: auto; bottom: 3px; right: 14px; width: auto; min-width: 0 !important; height: 24px; padding: 0; background: transparent !important; box-shadow: none; font-size: var(--signature-caption-font-size, 12px); }
    ` : '') + `/* Hidden binary states must stay hidden despite compact display rules. */
    ha-card[data-dp-layout][data-dp-has-state="no"] .bubble-state.hidden { display: none !important; }
    `;
        runtime.styleKey = styleKey;
      }
      return runtime.styleCSS + css;
