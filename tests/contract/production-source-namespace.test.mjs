import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { restoreDeploymentSource } from '../../scripts/lib/production-source-attestation.mjs';

function fixture(children, bodies = new Map()) {
  const calls = [];
  return { calls, api: async (url) => {
    calls.push(url);
    if (url.startsWith('/v6/')) return [
      { name: 'src', type: 'directory', children },
      { name: 'out', type: 'directory', children: [{ name: 'index', type: 'lambda', uid: 'not-a-source-blob' }] },
    ];
    const body = bodies.get(url.split('/').at(-1));
    assert.ok(body, 'only declared source content may be fetched');
    return { data: body.toString('base64') };
  } };
}
function blob(name, body) {
  const uid = createHash('sha1').update(body).digest('hex');
  return { entry: { name, type: 'file', uid }, bodies: new Map([[uid, body]]) };
}

test('actual src/out shape restores only input and retains repository src nesting', async (t) => {
  const b = blob('app.ts', Buffer.from('source bytes'));
  const f = fixture([{ name: 'src', type: 'directory', children: [b.entry] }], b.bodies);
  const restored = await restoreDeploymentSource('dpl_fixture', {}, f);
  t.after(restored.cleanup);
  assert.deepEqual(readFileSync(path.join(restored.root, 'src/app.ts')), Buffer.from('source bytes'));
  assert.equal(f.calls.length, 2);
  assert.equal(restored.form, 'tree');
});

test('archive input retains archive validation and byte verification', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'ghost-namespace-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'src'));
  writeFileSync(path.join(root, 'src/app.ts'), 'archived source');
  const b = blob('source.tgz.part1', execFileSync('tar', ['czf', '-', '-C', root, '.']));
  const f = fixture([{ name: '.vercel', type: 'directory', children: [b.entry] }], b.bodies);
  const restored = await restoreDeploymentSource('dpl_fixture', {}, f);
  t.after(restored.cleanup);
  assert.equal(restored.form, 'archive');
  assert.equal(readFileSync(path.join(restored.root, 'src/app.ts'), 'utf8'), 'archived source');
});

test('missing, duplicate, or non-directory input namespace fails closed', async () => {
  for (const roots of [[], [{ name: 'out', type: 'directory', children: [] }], [{ name: 'src', type: 'file' }],
    [{ name: 'src', type: 'directory', children: [] }, { name: 'src', type: 'directory', children: [] }]]) {
    await assert.rejects(restoreDeploymentSource('dpl_fixture', {}, { api: async () => roots }), /namespace_invalid/);
  }
});

test('unsafe paths, duplicate paths and non-file input cannot hide in src', async () => {
  for (const name of ['..', '.', '../escape', 'nested/file', 'bad\\name', 'bad\0name']) {
    await assert.rejects(restoreDeploymentSource('dpl_fixture', {}, fixture([{ name, type: 'file', uid: 'a'.repeat(40) }])), /path_invalid/);
  }
  await assert.rejects(restoreDeploymentSource('dpl_fixture', {}, fixture([
    { name: 'same', type: 'directory', children: [] }, { name: 'same', type: 'directory', children: [] },
  ])), /path_invalid/);
  await assert.rejects(restoreDeploymentSource('dpl_fixture', {}, fixture([{ name: 'index', type: 'lambda', uid: 'a'.repeat(40) }])), /entry_invalid/);
});
