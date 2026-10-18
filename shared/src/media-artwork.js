// Shared by the Panel and its Group chip. Read on every native HA update;
// keep the configured illustration intact for missing/invalid artwork.
const mediaArtworkFor = (card, illustration) => {
  if (card.card_type !== 'media-player' || illustration?.media_artwork !== true) return '';
  const picture = hass.states[card.entity]?.attributes?.entity_picture;
  if (typeof picture !== 'string' || /[\u0000-\u001f\u007f]/.test(picture)) return '';
  const image = picture.trim();
  return /^(?:\/(?!\/)|https?:\/\/)/i.test(image) ? image : '';
};
