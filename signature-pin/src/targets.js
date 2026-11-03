// Bubble 3.4 numbers explicit groups before individual buttons, main then bottom.
// Keep hidden buttons in the list: visibility must never shift a saved target.
const pinSubButtons = config => {
  const sub = config?.sub_button, buttons = [];
  const collect = list => {
    const items = Array.isArray(list) ? list.filter(Boolean) : [];
    items.forEach(item => { if (Array.isArray(item.group)) buttons.push(...item.group.filter(Boolean)); });
    items.forEach(item => { if (!Array.isArray(item.group)) buttons.push(item); });
  };
  if (config?.card_type !== 'sub-buttons') collect(Array.isArray(sub) ? sub : sub?.main);
  collect(Array.isArray(sub) ? [] : sub?.bottom);
  return buttons;
};
const pinButtonIndex = node => {
  for (const name of node?.classList || []) {
    const match = /^bubble-sub-button-(?:slider-)?(\d+)$/.exec(name);
    if (match) return Number(match[1]);
  }
  return 0;
};
