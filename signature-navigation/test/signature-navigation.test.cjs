const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const YAML = require('yaml');
const base = path.resolve(__dirname, '..');
const definition = YAML.parse(fs.readFileSync(path.join(base, 'dist/signature-navigation.yaml'), 'utf8')).signature_navigation;
const example = YAML.parse(fs.readFileSync(path.join(base, 'examples/home.yaml'), 'utf8'));

function fixture(config = structuredClone(example), pathname = '/lovelace/summary-home') {
  const location = {pathname};
  const render = vm.runInNewContext('(function(){ return `' + definition.code + '`; })', {window: {location}});
  return {config, location, run: () => render.call({config})};
}
function selected(css) {
  return [...css.matchAll(/\.bubble-sub-button\.bubble-sub-button-(\d+)\s*\{/g)].map(match => Number(match[1]));
}

test('distribution, native example and documentation are complete', () => {
  assert.equal(definition.version, '1.0.8');
  assert.deepEqual(definition.supported, ['sub-buttons']);
  assert.deepEqual(example.modules, ['signature_navigation']);
  assert.equal(example.card_type, 'sub-buttons');
  assert.equal(example.footer_mode, true);
  assert.equal(example.styles, undefined);
  assert.ok(example.sub_button.bottom.every(button => !button.css_class && button.tap_action.action === 'navigate'));
  for (const doc of [path.join(base, 'doc/README.md'), path.resolve(base, '../README.md')]) {
    const text = fs.readFileSync(doc, 'utf8');
    for (const [,link] of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (!/^(https?:|#)/.test(link)) assert.ok(fs.existsSync(path.resolve(path.dirname(doc), link.split('#')[0])), link);
    }
    for (const [,yaml] of text.matchAll(/```yaml\n([\s\S]*?)```/g)) assert.doesNotThrow(() => YAML.parse(yaml));
  }
});

test('selects all six dashboards and their other views without mutating native actions', () => {
  const config = structuredClone(example);
  const before = structuredClone(config);
  for (const [index, button] of config.sub_button.bottom.entries()) {
    const dashboard = button.tap_action.navigation_path.split('/')[1];
    for (const view of ['summary', 'room-details']) {
      assert.deepEqual(selected(fixture(config, '/' + dashboard + '/' + view).run()), [index + 1]);
    }
  }
  assert.deepEqual(config, before);
});

test('matches dashboard segments exactly and reevaluates route changes on the same card', () => {
  const f = fixture();
  assert.deepEqual(selected(f.run()), [1]);
  f.location.pathname = '/dashboard-etage/areas-salon';
  assert.deepEqual(selected(f.run()), [2]);
  f.location.pathname = '/dashboard-etage-bis/summary';
  assert.deepEqual(selected(f.run()), []);
  f.config.sub_button.bottom[1].tap_action.navigation_path = '/dashboard-etage-bis/summary?mode=light#details';
  assert.deepEqual(selected(f.run()), [2]);
});

test('other native actions are not treated as navigation and first matching route wins', () => {
  const config = structuredClone(example);
  config.sub_button.bottom[0].tap_action.action = 'more-info';
  assert.deepEqual(selected(fixture(config).run()), []);
  config.sub_button.bottom[0].tap_action = {action: 'navigate', navigation_path: '/dashboard-etage/another-view'};
  assert.deepEqual(selected(fixture(config, '/dashboard-etage/summary').run()), [1]);
});

test('does not restyle unsupported card types, inline menus or grouped layouts', () => {
  for (const change of [
    {card_type: 'button'}, {footer_mode: false},
    {sub_button: {main: [{icon: 'mdi:home'}], bottom: example.sub_button.bottom}},
    {sub_button: {main: [], bottom: [{group: example.sub_button.bottom}]}},
    {sub_button: {main: []}}
  ]) assert.equal(fixture({...structuredClone(example), ...change}).run().trim(), '');
});

test('visual options support zero, update on the same card and preserve native width', () => {
  const f = fixture();
  let css = f.run();
  assert.match(css, /--signature-nav-margin:\s*24px/);
  assert.match(css, /blur\(18px\) saturate\(180%\)/);
  assert.match(css, /--signature-nav-surface\) 45%/);
  f.config.signature_navigation = {mobile_margin: 0, blur: 0, opacity: 0};
  f.config.footer_width = 480;
  css = f.run();
  assert.match(css, /--signature-nav-margin:\s*0px/);
  assert.match(css, /blur\(0px\)/);
  assert.match(css, /--signature-nav-surface\) 0%/);
  assert.match(css, /--bubble-footer-width:\s*480px/);
  f.config.signature_navigation = {mobile_margin: 100, blur: -1, opacity: 150};
  css = f.run();
  assert.match(css, /--signature-nav-margin:\s*48px/);
  assert.match(css, /blur\(0px\)/);
  assert.match(css, /--signature-nav-surface\) 100%/);
});

test('theme variables remain live and editor defaults match the runtime', () => {
  const css = fixture().run();
  for (const token of ['signature-card-background', 'signature-card-border-radius', 'signature-font-family', 'primary-text-color', 'secondary-text-color']) {
    assert.ok(css.includes('var(--' + token), token);
  }
  assert.deepEqual(Object.fromEntries(definition.editor.filter(field => field.name).map(field => [field.name, field.default])),
    {mobile_margin: 24, blur: 18, opacity: 45});
});
