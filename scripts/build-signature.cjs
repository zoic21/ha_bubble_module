const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');
const {minify} = require('terser');
const {readSource} = require('./source-files.cjs');
const {minifyModule, serializeModule} = require('./minify-module.cjs');

const root = path.resolve(__dirname, '..');
const layouts = ['square', 'compact', 'room', 'header'];
const read = readSource;
const shared = name => read('signature-shared/src/' + name + '.js');
const specific = (layout, name) => read('signature-' + layout + '/src/' + name + '.js');

async function build(layout) {
  const id = 'signature_' + layout;
  const supported = layout === 'compact'
    ? "['button','cover','climate'].includes(kind) && c.button_type !== 'slider'"
    : layout === 'header'
      ? "kind === 'separator' || (kind === 'button' && c.button_type === 'name')"
      : "kind === 'button' && !['switch','slider'].includes(c.button_type)";
  const chunks = [shared('editor'), `
    const c = this.config;
    const o = c.${id} || {};
    const root = this.card;
    const kind = c.card_type || 'button';
    const tileEnabled = root && (${supported});
  `, shared('lifecycle')];
  // Media uses Compact's theme styling without creating a tile runtime or
  // transforming Bubble's artwork, controls and native dimensions.
  chunks.push(layout === 'compact'
    ? "if (!tileEnabled && !(root && kind === 'media-player')) return '';"
    : "if (!tileEnabled) return '';", shared('helpers'));
  if (layout === 'compact') chunks.push(specific(layout, 'media'));
  if (layout !== 'room') chunks.push(shared('color-thresholds'));
  chunks.push(shared('structure'));
  if (layout === 'header') chunks.push(specific(layout, 'title'));
  if (layout !== 'header') {
    chunks.push(shared('value-config'));
    chunks.push(layout === 'compact' ? specific(layout, 'number') : 'const numberEnabled = false;');
    chunks.push(shared('value-render'));
    if (layout === 'compact') chunks.push(shared('value-observer'));
    if (layout === 'room') chunks.push(specific(layout, 'room-temperature'));
    chunks.push(shared('secondary'), shared('actions'));
  } else {
    chunks.push(`
      const compactValue = false;
      const autoHeight = false;
      const numberEnabled = false;
      const valueTrailing = false;
      const secondary = '', multiline = false, visibleState = false;
      const entityState = hass.states[c.entity];
      attr('data-dp-layout',layout);
      attr('data-dp-kind',kind);
    `);
  }
  chunks.push(shared('appearance'));
  chunks.push(layout === 'room' ? specific(layout, 'room-geometry') : `
    const roles = [], roomColumns = 4, roomRows = 1, roomHeaderMeasures = false;
  `);
  chunks.push(shared('sub-buttons'));
  const css = [shared('base.css'), specific(layout, 'presentation.css')];
  if (layout === 'square') css.push(specific(layout, 'extras.css'));
  css.push(shared('visibility.css'));
  chunks.push(`
    const styleKey = [layout,kind,surface,${layout === 'room' ? 'roomColumns,roomRows,roomHeaderMeasures,' : ''}autoHeight,numberEnabled,o.controls === 'measure',compactValue,valueTrailing,!!secondary,multiline].join('\u0001');
    if (runtime.styleKey !== styleKey) {
      runtime.styleCSS = ${css.join(' + ')};
      runtime.styleKey = styleKey;
    }
    return runtime.styleCSS + css;
  `);
  // Each distribution owns its lifecycle. Shared CSS data attributes describe the
  // presentation; install only one presentation module on a card.
  const namespace = '_signature' + layout[0].toUpperCase() + layout.slice(1);
  const constants = {layout};
  if (layout !== 'compact') Object.assign(constants, {compactValue:false, numberEnabled:false, valueTrailing:false});
  if (layout !== 'square') constants.autoHeight = false;
  let body = chunks.join('\n');
  for (const name of Object.keys(constants).filter(name => name !== 'layout'))
    body = body.replace(new RegExp('const ' + name + '\\s*=[^;]*;'), '');
  const expression = '(() => {\n' + body
    .replace(/this\._dp/g, 'this.' + namespace)
    .replace(/c\.signature\b/g, 'c.' + id) + '\n})()';
  // Preserve the expression's return value: minifying a bare IIFE statement may
  // legitimately discard its result, whereas Bubble expects the returned CSS.
  const source = 'function signaturePresentation() { return ' + expression + '; }';
  // Constant folding removes other layouts' JS branches, without mangling names,
  // unsafe optimizations, runtime imports or JavaScript theme-variable reads.
  const result = await minify(source, {
    mangle: false,
    compress: {global_defs: constants, unsafe: false, passes: 3},
    format: {beautify: true, comments: false, keep_quoted_props: true}
  });
  const definition = YAML.parse(read('signature-' + layout + '/src/module.yaml'));
  definition.code = '${(' + result.code.replace(/\u0001/g, '\\u0001').replace(/[ \t]+$/gm, '') + ').call(this)}';
  definition.code = await minifyModule(definition.code);
  const content = serializeModule(id, definition);
  return {file: 'signature-' + layout + '/dist/signature-' + layout + '.yaml', content};
}

async function main() {
  const check = process.argv.includes('--check');
  for (const layout of layouts) {
    const output = await build(layout);
    const dest = path.join(root, output.file);
    if (check) {
      if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== output.content) throw new Error(output.file + ' is stale; run npm run build:signature');
    } else {
      fs.mkdirSync(path.dirname(dest), {recursive: true});
      fs.writeFileSync(dest, output.content);
    }
    console.log((check ? 'Verified ' : 'Built ') + output.file + ' (' + Buffer.byteLength(output.content) + ' bytes)');
  }
}

if (require.main === module) main().catch(error => {console.error(error);process.exitCode = 1;});
module.exports = {build, layouts};
