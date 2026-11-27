import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { colorFigures, createGame, games } from '../games.mjs';

test('GitHub Pages precaches every possible spoken prompt from the project subdirectory', async () => {
  const scope = 'https://example.github.io/education-games/';
  const worker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  let install;
  let requested;
  runInNewContext(worker, {
    self: {
      registration: { scope },
      addEventListener(type, handler) {
        if (type === 'install') install = handler;
      },
    },
    URL,
    Request,
    caches: {
      async open() {
        return { async addAll(requests) { requested = requests; } };
      },
    },
  });
  let ready;
  install({ waitUntil(promise) { ready = promise; } });
  await ready;

  const paths = Array.from(requested, request => {
    assert.ok(request.url.startsWith(scope));
    return request.url.slice(scope.length);
  });
  const clips = new Set([
    ...colorFigures.map(figure => figure.id),
    ...Object.keys(games).flatMap(id => createGame(id).rounds.map(round => round.clip)),
    'retry', 'correct', 'finish',
  ]);
  assert.equal(colorFigures.length, 40);
  assert.equal(colorFigures.find(({ id }) => id === 'color-star-blue').prompt, 'Нажми на синюю звезду');
  for (const clip of clips) {
    assert.ok(paths.includes('assets/voice/' + clip + '.wav'), 'missing clip: ' + clip);
  }
  for (const path of paths) {
    const file = await readFile(new URL('../' + path, import.meta.url));
    assert.ok(file.length > 0, path);
    if (path.endsWith('.wav')) {
      assert.equal(file.toString('ascii', 0, 4), 'RIFF', path);
      assert.equal(file.toString('ascii', 8, 12), 'WAVE', path);
    }
  }
});
