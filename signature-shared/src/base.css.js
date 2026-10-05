`/* Shared design tokens for all three tile families. */
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
    `
