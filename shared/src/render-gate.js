// Call after resolving live entity/template inputs, never around those reads.
// Own keys force the first paint after runtime replacement, even if Bubble's
// per-module gate still remembers the previous DOM. Older Bubble versions use
// the same comparison locally. JSON keeps field boundaries unambiguous.
const renderChanged = (label, ...values) => {
  const keys = runtime.renderKeys || (runtime.renderKeys = new Map());
  const key = JSON.stringify(values), first = !keys.has(label);
  const previous = keys.get(label);
  keys.set(label,key);
  const changed = typeof hasChanged === 'function'
    ? hasChanged('signature-render:'+label,key) : previous !== key;
  return first || changed;
};
