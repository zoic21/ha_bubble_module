const assert = require('node:assert/strict');
const {test} = require('node:test');
const YAML = require('yaml');
const {minifyModule, serializeModule} = require('../../scripts/minify-module.cjs');
const {normalizeCSS} = require('./css.cjs');
const compile = code => new Function('hass', 'onTeardown', 'renderTemplate', 'return `' + code + '`;');

test('build minification preserves dynamic CSS values, selectors, declarations and nested rules', async () => {
  const code = '\n/* stylesheet */\nha-card[data-value="${hass.value}"] :is(.name,.state) {'
    + 'width: calc(100% - ${hass.gap}px); --fallback: var(--theme, 0px);'
    + 'content: "${hass.label}"; ${hass.declarations}}'
    + '${hass.extra ? `.extra { padding: ${hass.gap}px; }` : ""}'
    + '@media (max-width: 600px) { ${hass.extra ? `.nested { color: red; }` : ""} }';
  const compact = await minifyModule(code);
  for (const extra of [false, true]) {
    const hass = {value:'ready',gap:12,label:'a b',declarations:'display: block;',extra};
    assert.equal(normalizeCSS(compile(compact)(hass)), normalizeCSS(compile(code)(hass)));
  }
  assert.ok(compact.length < code.length);
});

test('minification retains tracked reads and public configuration/property names', async () => {
  const code = '${(() => { const unused = hass.states["sensor.extra"]; const longRuntimeName = this.config.signature_flow; this._runtime = {version: "test", longRuntimeName}; return `ha-card { color: ${longRuntimeName.color}; }`; })()}';
  const compact = await minifyModule(code);
  const reads=[];
  const hass={states:new Proxy({}, {get(_target,key){reads.push(key);return undefined;}})};
  const card={config:{signature_flow:{color:'red'}}};
  assert.equal(normalizeCSS(compile(compact).call(card,hass)), 'ha-card{color:red}');
  assert.deepEqual(reads,['sensor.extra']);
  assert.deepEqual(card._runtime,{version:'test',longRuntimeName:{color:'red'}});
  assert.ok(!compact.includes('const longRuntimeName'));
});

test('CSS quotes, escapes and tagged-template raw spelling survive the build', async () => {
  const code = '${String.raw`ha-card { content: "a\\\\b"; }`}';
  assert.equal(compile(await minifyModule(code))(), compile(code)());
  const css = 'ha-card { content: "a b\\\\c"; width: calc(100% - 2px); }';
  assert.equal(normalizeCSS(compile(await minifyModule(css))()), normalizeCSS(compile(css)()));
});

test('compact YAML retains all metadata and editor values on import', () => {
  const definition={name:'Test',version:'1.0.0',supported:['button'],description:'Deux lignes\navec des espaces',
    editor:[{name:'options',fields:{flag:{default:false},count:{default:0},text:{default:'a, b: c'}}}],
    code:'ha-card{content:"a b"}\n${this.config.options?.flag ? "" : ""}'};
  const output=serializeModule('test',definition);
  assert.deepEqual(YAML.parse(output),{test:definition});
  assert.ok(Buffer.byteLength(output)<Buffer.byteLength(YAML.stringify({test:definition},{lineWidth:0,blockQuote:'literal'})));
});
