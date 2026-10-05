// Keep named accents tied to live theme variables; explicit CSS stays literal.
const colorPalette = {blue:'#2196f3',indigo:'#7986cb',amber:'#ffc107',orange:'#ff9800',green:'#4caf50',red:'#f44336',grey:'#9e9e9e',teal:'#009688',purple:'#9c27b0','light-blue':'#03a9f4',cyan:'#00bcd4',pink:'#e91e63',yellow:'#ffeb3b'};
const colorFor = (input, fallback) => {
  if (typeof input !== 'string') return fallback;
  let value = input.trim();
  const name = value.toLowerCase();
  if (Object.hasOwn(colorPalette,name)) value = 'var(--'+name+'-color, '+colorPalette[name]+')';
  return value && globalThis.CSS?.supports('color',value) ? value : fallback;
};
