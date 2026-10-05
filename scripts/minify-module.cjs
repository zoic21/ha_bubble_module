const {minify} = require('terser');
const CleanCSS = require('clean-css');
const YAML = require('yaml');

// Whitespace only: keep the cascade, custom-property values, units, fallbacks
// and browser-specific declarations. CSS is compacted once, during the build.
const cssMinifier = new CleanCSS({
  inline: false, rebase: false,
  level: {1: {all: false, removeWhitespace: true, specialComments: 0}}
});

function looksLikeCSS(value) {
  const text = value.replace(/\/\*[\s\S]*?\*\//g, '').trimStart();
  const header = text.slice(0, text.indexOf('{'));
  return text.includes('{') && /^[\w.#:[*@]/.test(header) && !/[<=`]/.test(header.replace(/\[[^\]]*\]/g, ''))
    && cssContext(value).complete;
}

function compactCSS(value) {
  const result = cssMinifier.minify(value);
  if (result.errors.length || result.warnings.length)
    throw new Error('Cannot compact module CSS: ' + [...result.errors, ...result.warnings].join('; '));
  return result.styles;
}

// Expressions can stand for a value, a declaration or an entire rule. Give
// the CSS parser valid placeholders, then put every original AST expression
// back in its original order. Never evaluate a module while building it.
function cssContext(css) {
  const blocks = ['rules'];
  let quote = '', comment = false, header = '', parentheses = 0;
  for (let i = 0; i < css.length; i++) {
    const char = css[i], next = css[i + 1];
    if (comment) { if (char === '*' && next === '/') { comment = false; i++; } continue; }
    if (quote) { if (char === '\\') i++; else if (char === quote) quote = ''; continue; }
    if (char === '/' && next === '*') { comment = true; i++; continue; }
    if (char === '"' || char === "'") { quote = char; header += char; continue; }
    if (char === '(' || char === '[') parentheses++;
    if (char === ')' || char === ']') parentheses--;
    if (!parentheses && char === '{') {
      blocks.push(/^\s*@(?:media|supports|container|layer|(?:-\w+-)?keyframes)\b/.test(header) ? 'rules' : 'declarations');
      header = '';
    } else if (!parentheses && char === '}') { blocks.pop(); header = ''; }
    else if (!parentheses && char === ';') header = '';
    else header += char;
  }
  return {
    kind: quote || parentheses || header.trim() ? 'value' : blocks.at(-1),
    complete: blocks.length === 1 && !quote && !comment && !parentheses && !header.trim()
  };
}

function compactTemplateCSS(node) {
  let input = '';
  const markers = [];
  for (const segment of node.segments) {
    if (segment.TYPE === 'TemplateSegment') input += segment.value;
    else {
      const name = '__bubble_build_' + markers.length + '__';
      if (node.segments.some(part => part.TYPE === 'TemplateSegment' && part.value.includes(name)))
        throw new Error('CSS build placeholder collision');
      const {kind} = cssContext(input);
      const marker = kind === 'rules' ? '.' + name + '{--v:0}'
        : kind === 'declarations' ? '--' + name + ':0;' : name;
      markers.push(marker);
      input += marker;
    }
  }
  if (!looksLikeCSS(input)) return;
  let output = compactCSS(input);
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    // The printer omits a declaration's final semicolon before a closing brace.
    const variants = marker.endsWith(';') ? [marker, marker.slice(0, -1)] : [marker];
    const found = variants.find(value => output.includes(value));
    if (!found || output.indexOf(found) !== output.lastIndexOf(found))
      throw new Error('CSS minification lost or duplicated an expression');
    const offset = output.indexOf(found);
    node.segments[i * 2].value = output.slice(0, offset);
    output = output.slice(offset + found.length);
  }
  node.segments.at(-1).value = output;
}

function compactCSSNodes(ast) {
  const visited = new Set();
  function visit(node) {
    if (!node?.TYPE || visited.has(node)) return;
    visited.add(node);
    // Tagged templates expose their raw spelling to user code.
    if (node.TYPE === 'PrefixedTemplateString') return;
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value?.TYPE) visit(value);
    }
    if (node.TYPE === 'TemplateString') compactTemplateCSS(node);
    else if (node.TYPE === 'String' && looksLikeCSS(node.value)) node.value = compactCSS(node.value);
  }
  visit(ast);
}

async function minifyModule(code) {
  const source = 'function bubbleModule(){return `' + code + '`;}';
  const parsed = await minify(source, {compress: false, mangle: false, format: {ast: true, code: false}});
  compactCSSNodes(parsed.ast);
  const result = await minify(parsed.ast, {
    // HA tracks property reads. Preserve getters and external property names;
    // only local identifiers are shortened, without unsafe transformations.
    compress: {passes: 3, pure_getters: false, unsafe: false},
    mangle: true,
    format: {ast: true, code: false, comments: false}
  });
  const template = result.ast.body[0].body[0].value;
  if (!['TemplateString', 'String'].includes(template.TYPE)) throw new Error('Expected a Bubble CSS template');
  const compact = (template.TYPE === 'String'
    ? template.value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
    : template.print_to_string({beautify: false, comments: false}).slice(1, -1)).trim();
  new Function('hass', 'onTeardown', 'renderTemplate', 'return `' + compact + '`;');
  return compact;
}

function serializeModule(id, definition) {
  const document = new YAML.Document({[id]: definition});
  for (const pair of document.contents.items[0].value.items)
    if (pair.key.value !== 'code' && YAML.isCollection(pair.value)) pair.value.flow = true;
  return document.toString({lineWidth: 0, indent: 1, blockQuote: 'literal', flowCollectionPadding: false});
}

module.exports = {minifyModule, serializeModule};
