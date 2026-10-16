`/* Artwork is anchored at the top right, independently of optional detail.
    Title/value take priority; narrow cards shrink artwork rather than text. */
    ha-card[data-dp-layout="square"][data-dp-illustration="yes"]:not([data-dp-auto-height="yes"]) .bubble-container {
      container-type: size;
    }
    ha-card[data-dp-layout="square"][data-dp-illustration="yes"] .bubble-content-container {
      grid-template-columns: minmax(0,max-content) minmax(0,1fr);
      column-gap: 0;
      padding: 0;
    }
    ha-card[data-dp-layout="square"][data-dp-illustration="yes"] .bubble-name {
      grid-area: 1 / 1 / 2 / 2;
    }
    ha-card[data-dp-layout="square"][data-dp-illustration="yes"][data-dp-icon="yes"] .bubble-name {
      padding-left: 46px;
    }
    ha-card[data-dp-layout="square"][data-dp-illustration="yes"] .bubble-state {
      grid-area: 2 / 1 / 3 / 2;
    }
    ha-card[data-dp-layout="square"][data-dp-illustration="yes"] .bubble-content-container::after {
      content: '';
      grid-area: 1 / 2 / 3 / 3;
      width: min(var(--signature-illustration-size,80px),100%${!autoHeight ? `,max(0px,calc(100cqh - ${secondary ? '38px' : '18px'}))` : ''});
      aspect-ratio: 1;
      align-self: start;
      justify-self: end;
      pointer-events: none;
      background-image: var(--dp-illustration-image);
      background-size: var(--dp-illustration-size);
      background-position: var(--dp-illustration-position);
      background-repeat: no-repeat;
    }
    `
