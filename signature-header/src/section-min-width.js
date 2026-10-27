// Keep native six-unit cards, falling back to a whole row in narrow sections.
const sectionMinWidthKey = Symbol.for('signature.header.section-min-width');
if (!runtime.releaseSectionMinWidth) {
  const current = runtime, dispose = current.dispose;
  current.releaseSectionMinWidth = () => {
    const owned = current.sectionMinWidth;
    if (!owned) return;
    owned.binding.owners.delete(current);
    if (!owned.binding.owners.size) {
      owned.binding.style.remove();
      if (owned.target[sectionMinWidthKey] === owned.binding) delete owned.target[sectionMinWidthKey];
    } else owned.binding.update();
    delete current.sectionMinWidth;
  };
  current.dispose = () => { current.releaseSectionMinWidth(); dispose(); };
}
const minimumCardWidth = Number(o.minimum_card_width);
let minWidthTarget = null;
if (kind === 'separator' && Number.isFinite(minimumCardWidth) && minimumCardWidth >= 120 && minimumCardWidth <= 500) {
  for (let node = root; node; node = node.parentNode || node.getRootNode?.().host) {
    if (node.localName === 'hui-grid-section') { minWidthTarget = node; break; }
  }
}
if (runtime.sectionMinWidth?.target !== minWidthTarget || runtime.sectionMinWidth?.width !== minimumCardWidth) {
  runtime.releaseSectionMinWidth();
  if (minWidthTarget?.shadowRoot) {
    let binding = minWidthTarget[sectionMinWidthKey];
    if (!binding) {
      const style = document.createElement('style');
      style.dataset.signatureSectionMinWidth = '';
      minWidthTarget.shadowRoot.append(style);
      binding = minWidthTarget[sectionMinWidthKey] = {style,owners:new Map(),update() {
        const minimum = Math.max(...this.owners.values());
        style.textContent = `
          .container { container-type: inline-size; container-name: signature-section-cards; }
          @container signature-section-cards (width < ${2 * minimum + 8}px) {
            .container > .card:not(.full-width) { grid-column: 1 / -1 !important; }
          }
        `;
      }};
    }
    binding.owners.set(runtime,minimumCardWidth);
    binding.update();
    runtime.sectionMinWidth = {target:minWidthTarget,binding,width:minimumCardWidth};
  }
}
