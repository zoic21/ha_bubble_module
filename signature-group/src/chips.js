// Opt-in presentation. Keep the native background, ripple and action handlers;
// the strip is descriptive and pointer-transparent, including its +N and arrow.
if (!runtime.strip) {
  const node = (tag, className, parent) => {
    const el = document.createElement(tag);
    el.className = className;
    parent.appendChild(el);
    return el;
  };
  runtime.strip = node('div', 'sg-strip', this.elements.mainContainer || root);
  runtime.strip.setAttribute('role', 'group');
  runtime.track = node('div', 'sg-track', runtime.strip);
  runtime.list = node('div', 'sg-items', runtime.track);
  runtime.message = node('span', 'sg-message', runtime.track);
  runtime.more = node('span', 'sg-more', runtime.strip);
  runtime.arrow = node('ha-icon', 'sg-arrow', runtime.strip);
  runtime.arrow.icon = 'mdi:chevron-right';
  runtime.arrow.setAttribute('aria-hidden', 'true');
  runtime.more.setAttribute('aria-hidden', 'true');
  runtime.list.setAttribute('aria-hidden', 'true');
  const current = runtime;
  current.scheduleLayout = () => {
    if (current.disposed || current.frame != null) return;
    current.frame = requestAnimationFrame(() => {
      current.frame = null;
      if (!current.disposed) current.layout();
    });
  };
  current.layout = () => {
    const nodes = current.nodes || [];
    const available = current.track.getBoundingClientRect().width;
    if (!available) return; // Hidden grid slots are recalculated when revealed.
    const widths = nodes.map(node => node.getBoundingClientRect().width);
    const prefixes = [0];
    widths.forEach((width, i) => prefixes.push(prefixes[i] + width + (i ? 8 : 0)));
    let visible = nodes.length;
    if (prefixes[visible] > available + 0.25) {
      // Measure at most once per number of digits, never once per equipment.
      const badgeWidths = new Map();
      for (visible = nodes.length - 1; visible >= 0; visible--) {
        const text = '+' + (nodes.length - visible);
        if (!badgeWidths.has(text.length)) {
          current.more.textContent = text;
          badgeWidths.set(text.length, current.more.getBoundingClientRect().width);
        }
        if (prefixes[visible] + (visible ? 8 : 0) + badgeWidths.get(text.length) <= available + 0.25) break;
      }
      visible = Math.max(0, visible);
    }
    for (let i = 0; i < nodes.length; i++) {
      const visibility = i < visible ? 'visible' : 'hidden';
      if (nodes[i].style.visibility !== visibility) nodes[i].style.visibility = visibility;
    }
    const remaining = nodes.length - visible;
    current.more.textContent = remaining ? '+' + remaining : '';
    current.more.style.visibility = remaining ? 'visible' : 'hidden';
    current.visibleCount = visible;
  };
  // One observer, only on this strip's geometry. No viewport listener or polling.
  if (typeof ResizeObserver === 'function') {
    current.resize = new ResizeObserver(current.scheduleLayout);
    current.resize.observe(current.track);
    current.resize.observe(current.list);
    current.resize.observe(current.more);
  }
}
const labels = items?.map(labelFor) || [];
const message = !items ? 'Popup non initialisée' : !items.length ? 'Aucune activité' : '';
let layoutChanged = runtime.message.textContent !== message || runtime.nodes?.length !== labels.length;
runtime.message.textContent = message;
runtime.message.hidden = !message;
runtime.strip.setAttribute('aria-label', items
  ? items.length + ' activité' + (items.length === 1 ? '' : 's') + (labels.length ? ' : ' + labels.join(', ') : '')
  : message);
runtime.strip.title = labels.join(', ') || message;
runtime.nodes ||= [];
while (runtime.nodes.length > labels.length) {
  const chip = runtime.nodes.pop(); runtime.resize?.unobserve(chip); chip.remove();
}
const number = (value, fallback, min, max) => {
  const raw = String(value ?? fallback).trim();
  const n = raw === '' ? NaN : Number(raw);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
/* @include shared/src/media-artwork.js */
for (let i = 0; i < labels.length; i++) {
  const card = items[i].card;
  let chip = runtime.nodes[i];
  if (!chip) {
    chip = document.createElement('span');
    chip.className = 'sg-item';
    chip.style.visibility = 'hidden';
    const art = document.createElement('span');
    art.className = 'sg-art';
    const icon = document.createElement('ha-icon');
    icon.className = 'sg-icon';
    const label = document.createElement('span');
    label.className = 'sg-label';
    chip.append(art, icon, label);
    chip.art = art; chip.icon = icon; chip.label = label;
    runtime.list.appendChild(chip);
    runtime.nodes.push(chip);
    // Individual widths can change while their total stays the same (fonts).
    // Reuse the one observer and release each target when its chip disappears.
    runtime.resize?.observe(chip,{box:'border-box'});
  }
  if (chip.label.textContent !== labels[i]) { chip.label.textContent = labels[i]; layoutChanged = true; }
  // Reuse the popup card's illustration contract, including its atlas crop and
  // effective HA theme. No second list of equipment or installation-specific art.
  const square = card.signature_panel || card.signature_square;
  const configuredArt = (square || card.signature_room)?.illustration || {};
  const mediaArtwork = mediaArtworkFor(card, configuredArt);
  const illustration = mediaArtwork ? {image: mediaArtwork} : configuredArt;
  const renderArt = value => String(renderTemplate(value, card.entity) ?? '').trim();
  const dark = hass?.themes?.darkMode;
  const imageVariant = renderArt((dark === true ? illustration.image_dark : dark === false ? illustration.image_light : undefined) ?? '');
  const validImage = image => /^(?:\/(?!\/)|https?:\/\/)/i.test(image) && !/[\u0000-\u001f\u007f]/.test(image);
  const image = validImage(imageVariant) ? imageVariant : renderArt(illustration.image ?? '');
  const columns = Math.trunc(number(renderArt(illustration.columns ?? 1), 1, 1, 16));
  const rows = Math.trunc(number(renderArt(illustration.rows ?? 1), 1, 1, 16));
  const spriteDark = !!square && dark === true;
  const rawIndex = renderArt((spriteDark ? illustration.index_dark : undefined) ?? illustration.index ?? 0);
  const index = rawIndex === '' ? NaN : Math.trunc(Number(rawIndex));
  const illustrated = validImage(image) && Number.isFinite(index) && index >= 0 && index < columns * rows;
  chip.art.hidden = !illustrated;
  chip.icon.hidden = illustrated;
  if (illustrated) {
    const offsetX = number(renderArt(illustration.offset_x ?? 0), 0, -50, 50);
    const offsetY = number(renderArt((spriteDark ? illustration.offset_y_dark : undefined) ?? illustration.offset_y ?? 0), 0, -50, 50);
    chip.art.style.backgroundImage = 'url(' + JSON.stringify(image) + ')';
    chip.art.style.backgroundSize = mediaArtwork ? 'contain' : columns * 100 + '% ' + rows * 100 + '%';
    chip.art.style.backgroundPosition = mediaArtwork ? 'center' : (columns === 1 ? 0 : ((index % columns) + offsetX / 100) * 100 / (columns - 1)) + '% '
      + (rows === 1 ? 0 : (Math.floor(index / columns) + offsetY / 100) * 100 / (rows - 1)) + '%';
  } else {
    chip.art.style.backgroundImage = '';
    chip.icon.icon = renderArt(card.icon ?? hass.states[card.entity]?.attributes?.icon ?? 'mdi:shape-outline');
  }
}
root.setAttribute('data-signature-group', 'chips');
// ResizeObserver already follows fonts, theme geometry and available width.
// Without it, retain the render-driven fallback for older environments.
if (layoutChanged || !runtime.resize) runtime.scheduleLayout();
