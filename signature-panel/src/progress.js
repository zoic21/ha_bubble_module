// Progress is only decorative. Existing actions and clocks stay in the card.
if (kind === 'button' && o.progress && typeof o.progress === 'object') {
  const input = render(o.progress.value).trim();
  const progress = input === '' ? NaN : Number(input);
  if (Number.isFinite(progress)) {
    const value = Math.min(100,Math.max(0,progress));
    const tint = color(o.progress.color,accent);
    css += `
      ha-card .bubble-container::before,ha-card .bubble-wrapper::after {
        content: ''; position: absolute; left: 10px; bottom: 2px; height: 3px;
        border-radius: 999px; pointer-events: none; z-index: 3;
      }
      ha-card .bubble-container::before { right: 10px; background: color-mix(in srgb,${tint} 12%,${neutralSurface}); }
      ha-card .bubble-wrapper::after { width: calc((100% - 20px) * ${value} / 100); background: ${tint}; }
    `;
  }
}
