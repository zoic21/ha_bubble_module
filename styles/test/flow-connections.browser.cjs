const assert = require('node:assert/strict');
const {test} = require('node:test');
const {fixture} = require('./browser.cjs');
const {render} = require('./fixtures.cjs');
const {loadModule} = require('../../shared/test/module.cjs');

test('upper and lower sources stay aligned when the upper right slot toggles across responsive widths', async t => {
  const page = await fixture(t);
  const code = loadModule('signature-flow').code;
  for (const mode of ['light', 'dark']) for (const plain of [false, true]) {
    await render(page, {width: 328, mode, plain, value: 1794});
    for (const width of [328, 489, 490, 491, 760, 468, 328]) for (const visible of [true, false, true]) {
      const geometry = await page.evaluate(async ({width, visible, code}) => {
        const shell = document.querySelector('[data-id="flow"]');
        const ctx = window.contexts.find(ctx => ctx.card === shell.shadowRoot.querySelector('ha-card'));
        const flow = ctx._signatureFlow;
        ctx.alignmentNodes ??= [flow.nodes[1].el, flow.nodes[3].el];
        shell.style.width = width + 'px';
        ctx.config.signature_flow.slots[4].enabled = visible;
        new Function('hass', 'onTeardown', 'renderTemplate', 'return `' + code + '`;')
          .call(ctx, ctx._hass, fn => ctx.teardown = fn, value => value);
        flow.draw();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const rects = [1, 3, 4].map(id => flow.nodes[id].el.getBoundingClientRect().toJSON());
        const canvas = flow.canvas.getBoundingClientRect();
        return {
          narrow: flow.canvas.classList.contains('sf-narrow'),
          centers: rects.slice(0, 2).map(r => (r.left + r.right) / 2 - canvas.left),
          lefts: rects.slice(0, 2).map(r => r.left - canvas.left),
          center: canvas.width / 2,
          overlap: visible && rects[0].right > rects[2].left + .1,
          upperBottom: rects[0].bottom - canvas.top,
          lowerTop: rects[1].top - canvas.top,
          points: [1, 3].map(id => flow.edges[id].points),
          sameNodes: ctx.alignmentNodes.every((el, i) => el === flow.nodes[[1, 3][i]].el),
          upperRightHidden: flow.nodes[4].el.hidden
        };
      }, {width, visible, code});
      const detail = JSON.stringify({width, mode, plain, visible, geometry});
      assert.equal(geometry.narrow, width < 490, detail);
      assert.equal(geometry.overlap, false, detail);
      assert.equal(geometry.sameNodes, true, detail);
      assert.equal(geometry.upperRightHidden, !visible, detail);
      assert.ok(Math.abs(geometry.centers[0] - geometry.centers[1]) < .1, detail);
      if (geometry.narrow) {
        assert.ok(geometry.lefts.every(left => Math.abs(left) < .1), detail);
        assert.ok(geometry.points.every(points => points.length === 3), detail);
      } else {
        assert.ok(geometry.centers.every(center => Math.abs(center - geometry.center) < .1), detail);
        assert.ok(geometry.points.every(points => points.length === 2 && points.every(p => Math.abs(p[0] - geometry.center) < .1)), detail);
        assert.ok(Math.abs(geometry.points[0][0][1] - geometry.upperBottom) < .1, detail);
        assert.ok(Math.abs(geometry.points[1][0][1] - geometry.lowerTop) < .1, detail);
      }
    }
  }
});

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
      const valueBottom = id => Math.max(flow.nodes[id].number.getBoundingClientRect().bottom,
        flow.nodes[id].unit.getBoundingClientRect().bottom) - canvas.top;
      const labelTop = id => flow.nodes[id].label.getBoundingClientRect().top - canvas.top;
      return {
        middle: (rects[5].top + rects[5].bottom) / 2 - canvas.top,
        leftMiddle: (rects[2].top + rects[2].bottom) / 2 - canvas.top,
        center: canvas.height / 2,
        junction: Number(flow.junction.getAttribute('cy')),
        upper: rects[5].top - rects[4].bottom,
        lower: rects[6].top - rects[5].bottom,
        lengths: [4, 6].map(id => flow.edges[id].length),
        strokes: [4, 6].map(id => getComputedStyle(flow.edges[id].line).strokeWidth),
        sourceGaps: [flow.edges[4].points[0][1] - valueBottom(4), labelTop(6) - flow.edges[6].points[0][1]],
        houseGaps: [labelTop(5) - flow.edges[4].points[1][1], flow.edges[6].points[1][1] - valueBottom(5)],
        upperBackground: getComputedStyle(flow.nodes[4].el).backgroundColor
      };
    });
    const detail = JSON.stringify({width, mode, plain, geometry});
    assert.ok(Math.abs(geometry.upper - geometry.lower) < .1, detail);
    assert.ok(Math.abs(geometry.lengths[0] - geometry.lengths[1]) < .1, detail);
    for (const y of [geometry.middle, geometry.leftMiddle, geometry.junction]) assert.ok(Math.abs(y - geometry.center) < .1, detail);
    assert.deepEqual(geometry.strokes, ['1.7px', '1.7px']);
    assert.ok(Math.abs(geometry.sourceGaps[0] - geometry.sourceGaps[1]) < .1, detail);
    assert.ok(geometry.sourceGaps[0] < geometry.houseGaps[0], detail);
    assert.equal(geometry.upperBackground, 'rgba(0, 0, 0, 0)');
    assert.ok(geometry.upper > 0 && geometry.lower > 0, detail);
  }
});
