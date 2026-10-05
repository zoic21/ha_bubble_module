const assert = require('node:assert/strict');
const {before, after} = require('node:test');
const {chromium} = require('playwright');
const {setup} = require('./fixtures.cjs');

// Node isolates test files: each suite owns one browser, each fixture a context.
let browser;
before(async () => {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BUBBLE_STYLE_BROWSER_PATH ? {executablePath: process.env.BUBBLE_STYLE_BROWSER_PATH} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
});
after(async () => { await browser?.close(); });

async function fixture(t, {prepare = setup, ...options} = {}) {
  const context = await browser.newContext({viewport: {width: 1400, height: 1400}, ...options});
  const errors = [];
  // Includes secondary pages in this context, not just the initial fixture page.
  context.on('weberror', error => errors.push(error.error().message));
  let page;
  t.after(async () => {
    try {
      if (page && !page.isClosed()) await page.evaluate(async () => {
        for (const ctx of window.contexts || []) await ctx.teardown?.();
        window.contexts = [];
      });
    } finally {
      await context.close();
      assert.deepEqual(errors, [], 'Unhandled browser errors in ' + t.name);
    }
  });
  page = await context.newPage();
  if (prepare) await prepare(page);
  return page;
}

module.exports = {fixture};
