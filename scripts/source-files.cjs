const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
// Includes are repository-relative, on their own line, and resolved at build
// time. Bubble receives ordinary CSS/JavaScript without an include runtime.
const directive = /^([ \t]*)\/\* @include ([a-zA-Z0-9_./-]+)(?: (\{[^\r\n]*\}))? \*\/[ \t]*$/gm;
const defaultsDirective = /^\/\* @defaults (\{[^\r\n]*\}) \*\/\r?\n/;

function parameters(json, file) {
  let value;
  try { value = JSON.parse(json); } catch { throw new Error('Invalid include parameters in ' + file); }
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
      Object.entries(value).some(([key, item]) => !/^[A-Z_]+$/.test(key) || typeof item !== 'string' || /[\r\n]/.test(item)))
    throw new Error('Include parameters must be named, single-line strings in ' + file);
  return value;
}

function readSource(file, stack = [], supplied = {}) {
  const absolute = path.resolve(root, file);
  const relative = path.relative(root, absolute);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
    throw new Error('Source outside repository: ' + file);
  if (stack.includes(relative)) throw new Error('Circular source include: ' + [...stack, relative].join(' -> '));
  let source = fs.readFileSync(absolute, 'utf8');
  const defaults = source.match(defaultsDirective);
  const options = {...(defaults ? parameters(defaults[1], file) : {}), ...supplied};
  if (defaults) source = source.slice(defaults[0].length);
  const used = new Set();
  source = source.replace(/@@([A-Z_]+)@@/g, (token, key) => {
    if (!Object.hasOwn(options, key)) {
      if (defaults || Object.keys(supplied).length) throw new Error('Missing include parameter ' + key + ' in ' + file);
      return token; // MODULE_VERSION is filled by the module builder.
    }
    used.add(key);
    return options[key];
  });
  for (const key of Object.keys(options))
    if (!used.has(key)) throw new Error('Unused include parameter ' + key + ' in ' + file);
  const expanded = source.replace(directive, (_, indent, included, json) => {
    const expanded = readSource(included, [...stack, relative], json ? parameters(json, file) : {}).replace(/\n$/, '');
    return expanded.split('\n').map(line => line ? indent + line : '').join('\n');
  });
  if (/\/\*\s*@(?:include|defaults)\b/.test(expanded)) throw new Error('Malformed source directive in ' + file);
  return expanded;
}

module.exports = {root, readSource};
