// One opt-in binding per native Sections view. Keep the native DOM, column
// spans and visibility; use short grid tracks only outside mobile/edit mode.
const viewMasonryKey = Symbol.for('signature.header.view-masonry');
if (!runtime.releaseViewMasonry) {
  const current = runtime, dispose = current.dispose;
  current.releaseViewMasonry = () => {
    const owned = current.viewMasonry;
    if (!owned) return;
    owned.binding.owners.delete(current);
    if (!owned.binding.owners.size) {
      owned.binding.dispose();
      if (owned.target[viewMasonryKey] === owned.binding) delete owned.target[viewMasonryKey];
    }
    delete current.viewMasonry;
  };
  current.dispose = () => { current.releaseViewMasonry(); dispose(); };
}
let viewTarget = null;
if (o.masonry_sections === true) {
  for (let node = root; node; node = node.parentNode || node.getRootNode?.().host) {
    if (node.localName === 'hui-sections-view') { viewTarget = node; break; }
  }
}
if (runtime.viewMasonry?.target !== viewTarget) {
  runtime.releaseViewMasonry();
  const content = viewTarget?.shadowRoot?.querySelector('.content');
  if (content && typeof ResizeObserver === 'function') {
    let binding = viewTarget[viewMasonryKey];
    if (binding && binding.content !== content) { binding.dispose(); binding = null; }
    if (!binding) {
      const style = document.createElement('style');
      style.dataset.signatureViewMasonry = '';
      const scope = '.wrapper:not(.single-column) .content:not(:has(hui-section-edit-mode))';
      style.textContent = `
        ${scope} {
          grid-auto-rows: 4px;
          grid-auto-flow: row dense;
          row-gap: 0;
        }
        ${scope} > .section {
          grid-row: span var(--signature-masonry-rows,1);
          margin-block-end: var(--row-gap,24px);
        }
      `;
      const sections = new Map();
      let frame = 0, stopped = false;
      const update = () => {
        frame = 0;
        if (stopped) return;
        for (const section of sections.keys()) {
          if (section.parentElement !== content) {
            resize.unobserve(section);
            const original = sections.get(section);
            if (original) section.style.setProperty('--signature-masonry-rows',original);
            else section.style.removeProperty('--signature-masonry-rows');
            sections.delete(section);
          }
        }
        for (const section of content.children) if (section.classList.contains('section') && !sections.has(section)) {
          sections.set(section,section.style.getPropertyValue('--signature-masonry-rows'));
          resize.observe(section);
        }
        const gap = parseFloat(getComputedStyle(content).getPropertyValue('--row-gap')) || 0;
        // Read every natural height before writing track spans to avoid repeated
        // layout passes. align-items:start keeps track changes from resizing cards.
        const spans = [...sections.keys()].map(section => [section,Math.max(1,Math.ceil((section.getBoundingClientRect().height + gap) / 4))]);
        for (const [section,span] of spans) if (section.style.getPropertyValue('--signature-masonry-rows') !== String(span)) {
          section.style.setProperty('--signature-masonry-rows',String(span));
        }
      };
      const schedule = () => { if (!frame && !stopped) frame = requestAnimationFrame(update); };
      const resize = new ResizeObserver(schedule);
      const mutation = new MutationObserver(schedule);
      mutation.observe(content,{childList:true});
      viewTarget.shadowRoot.append(style);
      binding = viewTarget[viewMasonryKey] = {
        content,style,owners:new Set(),
        dispose() {
          stopped = true;
          cancelAnimationFrame(frame);
          resize.disconnect(); mutation.disconnect(); style.remove();
          for (const [section,original] of sections) {
            if (original) section.style.setProperty('--signature-masonry-rows',original);
            else section.style.removeProperty('--signature-masonry-rows');
          }
          sections.clear();
        }
      };
      update();
    }
    binding.owners.add(runtime);
    runtime.viewMasonry = {target:viewTarget,binding};
  }
}
