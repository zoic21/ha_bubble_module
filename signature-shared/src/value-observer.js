// Inspect the displayed text, not the raw entity: templates can turn numbers into labels.
// Observe native asynchronous rendering without rewriting Bubble's state or its actions.
let valueWatch = this._dpValueWatch;
if (valueWatch && (!compactValue || valueWatch.el !== stateEl || valueWatch.root !== root)) {
  valueWatch.observer.disconnect();
  valueWatch.root.removeAttribute('data-dp-value-text');
  delete this._dpValueWatch;
  valueWatch = null;
}
if (compactValue && stateEl) {
  if (!valueWatch) {
    const update = () => {
      const valueNode = stateEl.querySelector('.dp-value');
      const text = (valueNode || stateEl).textContent.trim().replace(/\s+/g, ' ');
      // Decimal/grouping separators, signs and a unit (°C, kWh, µS/cm…) stay large.
      const numeric = /^[+\-−]?(?:\d+(?:[ .,'’]\d+)*|[.,]\d+)(?:[eE][+\-]?\d+)?(?:\s*[^\d\s]+)?$/.test(text);
      if (!text || numeric || text === '—' || stateEl.querySelector('.dp-duration-unit')) root.removeAttribute('data-dp-value-text');
      else attr('data-dp-value-text', 'yes');
    };
    const observer = new MutationObserver(update);
    observer.observe(stateEl, {childList:true, characterData:true, subtree:true});
    valueWatch = this._dpValueWatch = {el:stateEl, root, observer, update};
  }
  valueWatch.update();
} else root.removeAttribute('data-dp-value-text');
