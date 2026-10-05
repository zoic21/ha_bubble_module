const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync, spawnSync} = require('node:child_process');
const {test} = require('node:test');

const script = path.resolve(__dirname, '../../scripts/build-and-commit.sh');
function fixture(t, {current = false, branch = 'main'} = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bubble-autobuild-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const remote = path.join(directory, 'remote.git'), work = path.join(directory, 'work'), bin = path.join(directory, 'bin');
  fs.mkdirSync(work); fs.mkdirSync(bin);
  const git = (cwd, ...args) => execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  git(directory, 'init', '--bare', '--quiet', remote);
  git(work, 'init', '--quiet', '--initial-branch=' + branch);
  const identity = cwd => {git(cwd, 'config', 'user.name', 'Build fixture'); git(cwd, 'config', 'user.email', 'fixture@example.invalid');};
  identity(work);
  fs.mkdirSync(path.join(work, 'demo/src'), {recursive: true});
  fs.mkdirSync(path.join(work, 'demo/dist'), {recursive: true});
  fs.writeFileSync(path.join(work, 'demo/src/input.txt'), 'one\n');
  fs.writeFileSync(path.join(work, 'demo/dist/demo.yaml'), current ? 'one\n' : 'old\n');
  fs.writeFileSync(path.join(work, 'README.md'), 'Original documentation\n');
  git(work, 'add', '.'); git(work, 'commit', '--quiet', '-m', 'Initial source');
  git(work, 'remote', 'add', 'origin', remote); git(work, 'push', '--quiet', 'origin', 'HEAD:refs/heads/' + branch);
  fs.writeFileSync(path.join(bin, 'npm'), `#!/usr/bin/env bash
set -Eeuo pipefail
case "$*" in
  'ci --ignore-scripts --no-audit --no-fund') ;;
  'run build:modules')
    if [[ "\${FAIL_BUILD:-}" == 'true' ]]; then exit 2; fi
    cp demo/src/input.txt demo/dist/demo.yaml
    ;;
  'run check:modules') cmp demo/src/input.txt demo/dist/demo.yaml ;;
  'test')
    if [[ -n "\${RACE_WORKSPACE:-}" && ! -e "$RACE_MARKER" ]]; then
      printf 'two\\n' > "$RACE_WORKSPACE/demo/src/input.txt"
      printf 'Concurrent documentation\\n' > "$RACE_WORKSPACE/README.md"
      git -C "$RACE_WORKSPACE" add .
      git -C "$RACE_WORKSPACE" commit --quiet -m 'Concurrent source and documentation'
      git -C "$RACE_WORKSPACE" push --quiet origin "HEAD:refs/heads/$BUILD_BRANCH"
      touch "$RACE_MARKER"
    fi
    ;;
  *) echo 'Unexpected npm command' >&2; exit 1 ;;
esac
`, {mode: 0o755});
  const run = extra => spawnSync('bash', [script], {cwd: work, encoding: 'utf8', env: {
    ...process.env, GITHUB_ACTIONS: 'true', BUILD_BRANCH: branch, PATH: bin + path.delimiter + process.env.PATH, ...extra
  }});
  const read = file => git(remote, 'show', branch + ':' + file);
  return {directory, remote, work, branch, git, identity, run, read};
}

test('automatic build publishes only regenerated YAML on the originating branch', t => {
  const f = fixture(t, {branch: 'feature/module-build'});
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.read('demo/dist/demo.yaml'), 'one');
  assert.equal(f.read('demo/src/input.txt'), 'one');
  assert.equal(f.git(f.remote, 'diff', '--name-only', f.branch + '^', f.branch), 'demo/dist/demo.yaml');
  assert.equal(f.git(f.remote, 'show', '-s', '--format=%an', f.branch), 'github-actions[bot]');
});

test('automatic build creates no commit when distributions are current', t => {
  const f = fixture(t, {current: true});
  const before = f.git(f.remote, 'rev-parse', f.branch);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git(f.remote, 'rev-parse', f.branch), before);
  assert.match(result.stdout, /no commit needed/);
});

test('a failed automatic build leaves the remote source and distribution untouched', t => {
  const f = fixture(t);
  const before = f.git(f.remote, 'rev-parse', f.branch);
  const result = f.run({FAIL_BUILD: 'true'});
  assert.notEqual(result.status, 0);
  assert.equal(f.git(f.remote, 'rev-parse', f.branch), before);
  assert.equal(f.read('demo/dist/demo.yaml'), 'old');
});

test('a concurrent push is retained and rebuilt before generated YAML is published', t => {
  const f = fixture(t), writer = path.join(f.directory, 'writer');
  f.git(f.directory, 'clone', '--quiet', '--branch', f.branch, f.remote, writer);
  f.identity(writer);
  const result = f.run({RACE_WORKSPACE: writer, RACE_MARKER: path.join(f.directory, 'race-complete')});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /attempt 1\/3/);
  assert.equal(f.read('demo/src/input.txt'), 'two');
  assert.equal(f.read('demo/dist/demo.yaml'), 'two');
  assert.equal(f.read('README.md'), 'Concurrent documentation');
  assert.equal(f.git(f.remote, 'rev-list', '--count', f.branch), '3');
  assert.equal(f.git(f.remote, 'diff', '--name-only', f.branch + '^', f.branch), 'demo/dist/demo.yaml');
});
