// The native label keeps its handlers; only its line count is configurable.
const twoLineName = compactValue && Number(o.name_lines) === 2;
if (twoLineName) attr('data-dp-name-lines','2');
else root.removeAttribute('data-dp-name-lines');
