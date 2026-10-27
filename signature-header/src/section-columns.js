// Opt-in alignment for widened native Sections grids. The style belongs to
// the section, with shared ownership when several native titles request it.
const sectionColumnsKey = Symbol.for('signature.header.section-columns');
if (!runtime.releaseSectionColumns) {
  const current = runtime, dispose = current.dispose;
  current.releaseSectionColumns = () => {
    const owned = current.sectionColumns;
    if (!owned) return;
    owned.binding.owners.delete(current);
    if (!owned.binding.owners.size) {
      owned.binding.style.remove();
      if (owned.target[sectionColumnsKey] === owned.binding) delete owned.target[sectionColumnsKey];
    }
    delete current.sectionColumns;
  };
  current.dispose = () => { current.releaseSectionColumns(); dispose(); };
}
let sectionTarget = null;
if (kind === 'separator' && o.align_section_columns === true) {
  for (let node = root; node; node = node.parentNode || node.getRootNode?.().host) {
    if (node.localName === 'hui-grid-section') { sectionTarget = node; break; }
  }
}
if (runtime.sectionColumns?.target !== sectionTarget) {
  runtime.releaseSectionColumns();
  if (sectionTarget?.shadowRoot) {
    let binding = sectionTarget[sectionColumnsKey];
    if (!binding || binding.style.parentNode !== sectionTarget.shadowRoot) {
      const style = document.createElement('style');
      style.dataset.signatureSectionColumns = '';
      style.textContent = `
        :host { --signature-section-view-gap: var(--ha-view-sections-column-gap,32px); }
        @media (max-width:600px) {
          :host { --signature-section-view-gap: var(--ha-view-sections-narrow-column-gap,8px); }
        }
        /* Preserve the native 12-unit subgrid; trim half-cards instead of
           multiplying a large page gap across its 24 internal tracks. */
        .container > .card:not(.full-width) {
          --signature-section-trim: calc(min(1,max(0,calc(var(--column-span,1) - 1))) * max(0px,calc((var(--signature-section-view-gap) - var(--column-gap,8px)) / 2)));
          width: calc(100% - var(--signature-section-trim));
          justify-self: start;
        }
        .container > .card:nth-child(2n of .card:not(.full-width):not(.hidden)) { justify-self: end; }
      `;
      sectionTarget.shadowRoot.append(style);
      binding = sectionTarget[sectionColumnsKey] = {style,owners:new Set()};
    }
    binding.owners.add(runtime);
    runtime.sectionColumns = {target:sectionTarget,binding};
  }
}
