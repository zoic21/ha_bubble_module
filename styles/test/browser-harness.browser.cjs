const assert = require('node:assert/strict');
const {execFile} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');

test('browser fixtures isolate cookies and finish teardown before closing every page', async t => {
  let page, secondary, disposed = 0;
  await t.test('isolated contexts', async child => {
    page = await fixture(child, {viewport: {width: 900, height: 500}, hasTouch: true});
    const other = await fixture(child);
    assert.notEqual(page.context(), other.context());
    assert.deepEqual(page.viewportSize(), {width: 900, height: 500});
    assert.equal(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), true);
    await page.context().addCookies([{name: 'fixture', value: 'first', url: 'http://fixture.test'}]);
    assert.equal((await page.context().cookies()).length, 1);
    assert.deepEqual(await other.context().cookies(), []);
    secondary = await page.context().newPage();
    await page.exposeFunction('recordDisposal', () => { disposed++; });
    await page.evaluate(() => { window.contexts = [{teardown: () => window.recordDisposal()}]; });
  });
  assert.equal(disposed, 1);
  assert.equal(page.isClosed(), true);
  assert.equal(secondary.isClosed(), true);
});

test('the browser harness rejects uncaught secondary-page exceptions and caught module render errors', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bubble-browser-errors-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const file = path.join(directory, 'errors.cjs');
  // Expected failures run in a child test runner, with real Chromium and the
  // same harness. They must fail independently of each test's own assertions.
  fs.writeFileSync(file, `
    const {test} = require('node:test');
    const {fixture} = require(${JSON.stringify(require.resolve('./browser.cjs'))});
    const {render} = require(${JSON.stringify(require.resolve('./fixtures.cjs'))});
    test('uncaught secondary-page error', async t => {
      const page = await fixture(t);
      const secondary = await page.context().newPage();
      const error = secondary.waitForEvent('pageerror');
      await secondary.evaluate(() => setTimeout(() => { throw new Error('injected-uncaught-error'); }, 0));
      await error;
    });
    test('caught module render error', async t => {
      const page = await fixture(t);
      await page.evaluate(() => {
        window.Function = new Proxy(Function, {construct() { throw new Error('injected-module-error'); }});
      });
      await render(page);
    });
  `);
  const env = {...process.env};
  // The child is an independent runner, not another worker of this test file.
  delete env.NODE_TEST_CONTEXT;
  const child = await new Promise(resolve => {
    execFile(process.execPath, ['--test', '--test-reporter=tap', file], {env, timeout: 30000}, (error, stdout, stderr) => {
      resolve({code: error?.code || 0, output: stdout + stderr});
    });
  });
  assert.equal(child.code, 1, child.output);
  assert.match(child.output, /not ok \d+ - uncaught secondary-page error/);
  assert.match(child.output, /Unhandled browser errors in uncaught secondary-page error/);
  assert.match(child.output, /injected-uncaught-error/);
  assert.match(child.output, /not ok \d+ - caught module render error/);
  assert.match(child.output, /Module errors in browser fixtures/);
  assert.match(child.output, /injected-module-error/);
});
