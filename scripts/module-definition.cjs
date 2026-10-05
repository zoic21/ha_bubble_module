const YAML = require('yaml');
const {readSource} = require('./source-files.cjs');

// Build-only field references. Overrides replace whole properties; no implicit
// deep merge, module defaults or changes to the order of editor fields.
function resolveFields(value, fields, stack = [], resolved = new WeakMap()) {
  if (!value || typeof value !== 'object') return value;
  if (resolved.has(value)) return resolved.get(value);
  if (Array.isArray(value)) {
    const result = value.map(item => resolveFields(item,fields,stack,resolved));
    resolved.set(value,result);
    return result;
  }
  const local = {...value};
  let common = {};
  if (Object.hasOwn(local,'$field')) {
    const name = local.$field;
    if (typeof name !== 'string' || !Object.hasOwn(fields,name)) throw new Error('Unknown shared editor field: ' + name);
    if (stack.includes(name)) throw new Error('Circular shared editor field: ' + [...stack,name].join(' -> '));
    const definition = fields[name];
    if (!definition || typeof definition !== 'object' || Array.isArray(definition))
      throw new Error('Shared editor field must be an object: ' + name);
    common = resolveFields(definition,fields,[...stack,name],resolved);
    delete local.$field;
  }
  const result = Object.fromEntries(Object.entries({...common,...local})
    .map(([key,item]) => [key,resolveFields(item,fields,stack,resolved)]));
  // Preserve YAML aliases, particularly Flow slots and Alert Manager packs.
  resolved.set(value,result);
  return result;
}

function readModuleDefinition(file) {
  const definition = YAML.parse(readSource(file));
  const fields = YAML.parse(readSource('shared/src/editor-fields/presentation.yaml'));
  if (definition?.editor) definition.editor = resolveFields(definition.editor,fields);
  return definition;
}

module.exports = {readModuleDefinition,resolveFields};
