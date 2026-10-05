// A dedicated secondary node leaves Bubble's native line and event handlers intact.
let secondaryEl = runtime.secondaryEl;
if (secondaryEl && !root.contains(secondaryEl)) secondaryEl = null;
// Bubble caches action handlers on first use; a new target needs a new node.
if (secondaryEl && runtime.secondaryTarget !== secondaryEntity) { secondaryEl.remove(); secondaryEl = null; }
runtime.secondaryTarget = secondaryEntity;
if (secondary && nameBox && content) {
  if (!secondaryEl) { secondaryEl = document.createElement('div'); secondaryEl.className = 'dp-secondary'; }
  const parent = ['square','room'].includes(layout) ? content : nameBox;
  if (secondaryEl.parentElement !== parent) parent.appendChild(secondaryEl);
  // Opt-in emphasis only: never interpret HTML from templates or entity states.
  const secondaryBold = o.secondary_bold === true;
  const signature = JSON.stringify([secondaryBold, secondary]);
  if (secondaryEl.dataset.dpSecondarySignature !== signature) {
    const fragment = document.createDocumentFragment();
    const pattern = /\*\*([^*\r\n]+)\*\*/g;
    let cursor = 0;
    if (secondaryBold) {
      for (const match of secondary.matchAll(pattern)) {
        fragment.appendChild(document.createTextNode(secondary.slice(cursor, match.index)));
        const strong = document.createElement('strong');
        strong.textContent = match[1];
        fragment.appendChild(strong);
        cursor = match.index + match[0].length;
      }
    }
    fragment.appendChild(document.createTextNode(secondary.slice(cursor)));
    secondaryEl.replaceChildren(fragment);
    secondaryEl.dataset.dpSecondarySignature = signature;
  }
} else { secondaryEl?.remove(); secondaryEl = null; }
runtime.secondaryEl = secondaryEl;
