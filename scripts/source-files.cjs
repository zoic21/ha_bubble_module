const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
// Includes are repository-relative, on their own line, and resolved at build
// time. Bubble receives ordinary CSS/JavaScript without an include runtime.
const directive = /^([ \t]*)\/\* @include ([a-zA-Z0-9_./-]+) \*\/[ \t]*$/gm;

function readSource(file, stack = []) {
  const absolute = path.resolve(root, file);
  const relative = path.relative(root, absolute);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
    throw new Error('Source outside repository: ' + file);
  if (stack.includes(relative)) throw new Error('Circular source include: ' + [...stack, relative].join(' -> '));
  const source = fs.readFileSync(absolute, 'utf8');
  return source.replace(directive, (_, indent, included) => {
    const expanded = readSource(included, [...stack, relative]).replace(/\n$/, '');
    return expanded.split('\n').map(line => line ? indent + line : '').join('\n');
  });
}

module.exports = {root, readSource};
