const attr = (el,key,value) => {
  value = String(value);
  if (el.getAttribute(key) !== value) el.setAttribute(key,value);
};
const text = (el,value) => {
  value = String(value);
  if (el.textContent !== value) el.textContent = value;
};
const create = (tag,cls,svg = false) => {
  const el = svg ? document.createElementNS('http://www.w3.org/2000/svg',tag) : document.createElement(tag);
  if (cls) attr(el,'class',cls);
  return el;
};
