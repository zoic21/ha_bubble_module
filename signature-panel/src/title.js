// A card heading is separate from the native first metric name and its actions.
const panelTitleText = kind === 'button' ? render(o.title).trim() : '';
let panelTitle = runtime.panelTitle;
if (panelTitle && !root.contains(panelTitle)) panelTitle = null;
if (panelTitleText && content) {
  if (!panelTitle) {
    panelTitle = document.createElement('div'); panelTitle.className = 'dp-panel-title';
    content.appendChild(panelTitle);
  }
  if (panelTitle.textContent !== panelTitleText) panelTitle.textContent = panelTitleText;
} else if (panelTitle) {
  runtime.roomBadges?.dispose(); panelTitle.remove(); panelTitle = null;
}
runtime.panelTitle = panelTitle;
attr('data-dp-panel-title', panelTitle ? 'yes' : 'no');
if (!runtime.panelTitleCleanup) {
  const dispose = runtime.dispose;
  runtime.dispose = () => {
    if (this._dpRuntime !== runtime) return;
    runtime.panelTitle?.remove(); dispose();
  };
  runtime.panelTitleCleanup = true;
}
