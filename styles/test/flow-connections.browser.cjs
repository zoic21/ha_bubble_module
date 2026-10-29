const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {render} = require('./fixtures.cjs');

test('upper and lower right Flow connections have equal lengths around the centered middle row', async t => {
  const page = await fixture(t);
  for (const width of [288, 328, 468, 760]) for (const mode of ['light', 'dark']) for (const plain of [false, true]) {
    const result = await render(page, {width, mode, plain});
    assert.deepEqual(result.errors, []);
    const geometry = await page.evaluate(() => {
      const shadow = document.querySelector('[data-id="flow"]').shadowRoot;
      const ctx = window.contexts.find(ctx => ctx.card === shadow.querySelector('ha-card'));
      const flow = ctx._signatureFlow;
      const canvas = flow.canvas.getBoundingClientRect();
      const rects = Object.fromEntries([2, 4, 5, 6].map(id => [id, flow.nodes[id].el.getBoundingClientRect().toJSON()]));
      return {
        middle: (rects[5].top + rects[5].bottom) / 2 - canvas.top,
        leftMiddle: (rects[2].top + rects[2].bottom) / 2 - canvas.top,
        center: canvas.height / 2,
        junction: Number(flow.junction.getAttribute('cy')),
        upper: rects[5].top - rects[4].bottom,
        lower: rects[6].top - rects[5].bottom,
        lengths: [4, 6].map(id => flow.edges[id].length),
        strokes: [4, 6].map(id => getComputedStyle(flow.edges[id].line).strokeWidth)
      };
    });
    const detail = JSON.stringify({width, mode, plain, geometry});
    assert.ok(Math.abs(geometry.upper - geometry.lower) < .1, detail);
    assert.ok(Math.abs(geometry.lengths[0] - geometry.lengths[1]) < .1, detail);
    for (const y of [geometry.middle, geometry.leftMiddle, geometry.junction]) assert.ok(Math.abs(y - geometry.center) < .1, detail);
    assert.deepEqual(geometry.strokes, ['1.7px', '1.7px']);
    assert.ok(geometry.upper > 0 && geometry.lower > 0, detail);
  }
});
