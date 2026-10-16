// Inspect configuration, never the rendered cards: closed popups need no body.
const normalize = (conditions, entity) => (Array.isArray(conditions) ? conditions : []).map(condition => {
  const result = {...condition};
  if (entity && !result.entity && ['state','numeric_state'].includes(result.condition)) result.entity = entity;
  if (Array.isArray(result.conditions)) result.conditions = normalize(result.conditions, entity);
  return result;
});
const collect = (cards, parents = [], result = []) => {
  for (const card of cards || []) {
    if (!card || typeof card !== 'object') continue;
    const guards = [...parents, ...normalize(card.visibility, card.entity)];
    if (card.type === 'conditional') {
      collect([card.card], [...guards, ...normalize(card.conditions, card.card?.entity)], result);
    } else if (card.card_type === 'pop-up') {
      continue; // A nested popup is a destination, not another activity.
    } else if (Array.isArray(card.cards)) {
      collect(card.cards, guards, result);
    } else if (!['heading','markdown'].includes(card.type) && card.card_type !== 'separator') {
      result.push({card, guards});
    }
  }
  return result;
};
const activeItems = source => {
  if (source.cards !== source.owner.config.cards) {
    source.cards = source.owner.config.cards;
    source.items = collect(source.cards);
  }
  return source.items.filter(item => !item.guards.length || checkConditionsMet(item.guards, hass));
};
const labelFor = item => {
  const card = item.card;
  const raw = card.name ?? card.title;
  const rendered = raw == null ? '' : String(renderTemplate(raw, card.entity) ?? '').trim();
  return rendered || hass.states[card.entity]?.attributes?.friendly_name || card.entity || 'Équipement';
};
