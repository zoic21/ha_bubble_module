const isTemplate = value => /\{[\{%#]/.test(value);
const renderValue = (value, entity) => {
  const input = String(value ?? '');
  return isTemplate(input) ? (typeof renderTemplate === 'function' ? String(renderTemplate(input,entity) ?? '') : '') : input;
};
// This is a reference heuristic, not a Jinja parser. Multi-entity templates keep
// the first explicit reference; callers can supply their own action target.
const sourceFor = (value, mainEntity) => {
  const input = String(value ?? '').trim();
  const template = isTemplate(input);
  const direct = !template && /^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/.test(input);
  const match = template ? input.match(/(['"])([a-z_][a-z0-9_]*\.[a-z0-9_]+)\1|\bstates\.([a-z_][a-z0-9_]*\.[a-z0-9_]+)\b|\b(?:states|state_attr|is_state|is_state_attr|has_value)\s*\(\s*(entity)\s*[,)]/) : null;
  const main = !!match?.[4];
  return {input,template,direct,main,entity:direct ? input : main ? mainEntity : match?.[2] || match?.[3]};
};
