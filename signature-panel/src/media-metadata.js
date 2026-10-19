if (kind === 'media-player') {
  // Read Bubble's resolved text, including its app/series fallbacks. previousText
  // keeps one copy when the native scrolling animation repeats its DOM content.
  const normalizeMediaText = value => String(value ?? '').replace(/\s+/g,' ').trim().toLowerCase();
  const mediaText = node => normalizeMediaText(node?.previousText ?? node?.textContent);
  const {title,artist,mediaInfoContainer} = this.elements || {};
  // An explicit module state owns the middle row, using the native title role.
  attr('data-dp-media-custom-state',custom && owned ? 'yes' : 'no');
  const metadataVisible = !(custom && owned) && mediaInfoContainer && mediaInfoContainer.style.display !== 'none';
  const titleText = metadataVisible ? mediaText(title) : '';
  const artistText = metadataVisible ? mediaText(artist) : '';
  attr('data-dp-media-artist-duplicate',titleText && titleText === artistText ? 'yes' : 'no');
  const nativeText = new Set([titleText,artistText]);
  if (stateEl && !stateEl.classList.contains('hidden') && stateEl.getAttribute('hidden') === null) nativeText.add(mediaText(stateEl));
  // Details use middle dots between independent pieces (e.g. volume and source).
  // Remove exact repeated pieces only; retain distinct metadata and quantities.
  secondary = secondary.split('·').map(part => part.trim())
    .filter(part => part && !nativeText.has(normalizeMediaText(part))).join(' · ');
  attr('data-dp-secondary',secondary ? 'yes' : 'no');
}
