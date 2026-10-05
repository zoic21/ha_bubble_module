const CleanCSS = require('clean-css');
const assert = require('node:assert/strict');
const normalizer = new CleanCSS({inline: false, rebase: false, level: {1: {all: false, removeWhitespace: true, specialComments: 0}}});

function normalizeCSS(css) {
  const result = normalizer.minify(css);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  return result.styles;
}

module.exports = {normalizeCSS};
