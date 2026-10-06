// Dress the existing delegated state action; never replace its native node.
const valueButton = compactValue && visibleState && !numberEnabled && o.value_style === 'button';
attr('data-dp-value-style', valueButton ? 'button' : 'text');
if (valueButton) attr('data-dp-value-background', o.value_background === false ? 'no' : 'yes');
else root.removeAttribute('data-dp-value-background');
if (valueButton) {
  // Keep visual switches at the end of their native row/group. Select handlers,
  // indices, visibility and configuration order remain owned by Bubble.
  styles.filter(style => style.visualSwitch).forEach(({cls}) => {
    css += 'ha-card[data-dp-value-style="button"] .'+cls+'{order:1;}';
    css += 'ha-card[data-dp-value-style="button"] .bubble-sub-button-group:has(.'+cls+'){order:1;}';
  });
}
