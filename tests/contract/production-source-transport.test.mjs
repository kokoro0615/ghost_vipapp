import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { restoreDeploymentSource, vercelApi } from '../../scripts/lib/production-source-attestation.mjs';

const auth = { token: 'synthetic-token', teamId: 'synthetic-team' };
const json = value => new Response(JSON.stringify(value));
const roots = async () => (await readdir(tmpdir())).filter(name => name.startsWith('ghost-vip-source-attestation-'));

async function withFetch(fetchImpl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try { return await run(); } finally { globalThis.fetch = original; }
}

function delayedJson(value, signal, delayMs) {
  return new Response(new ReadableStream({
    start(controller) {
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        controller.enqueue(new TextEncoder().encode(JSON.stringify(value)));
        controller.close();
      }, delayMs);
      function abort() {
        clearTimeout(timer);
        controller.error(signal.reason);
      }
      signal.addEventListener('abort', abort, { once: true });
    },
  }));
}

test('failed restore removes its temporary root and still rejects a wrong SHA-1', async () => {
  const before = await roots();
  await withFetch(async url => String(url).includes('/v6/')
    ? json([{ name: 'fixture.txt', type: 'file', uid: '0000000000000000000000000000000000000000' }])
    : json({ data: Buffer.from('fixture').toString('base64') }), async () => {
    await assert.rejects(restoreDeploymentSource('fixture', auth), /content_digest_mismatch/);
  });
  assert.deepEqual(await roots(), before);
});

test('ordinary JSON keeps the default deadline through streamed body consumption', async () => {
  const budgets = [];
  let attempts = 0;
  await assert.rejects(vercelApi('/fixture', auth, {
    fetchImpl: async (_url, { signal }) => {
      attempts += 1;
      return delayedJson({ ok: true }, signal, 100);
    },
    timeoutSignal(ms) { budgets.push(ms); return AbortSignal.timeout(5); },
    waitImpl: async () => {},
    nowMs: () => 0,
  }), { name: 'TimeoutError' });
  assert.equal(attempts, 1);
  assert.deepEqual(budgets, [120_000]);
});

test('blob gets a longer finite budget and retains verified source bytes', async () => {
  const body = Buffer.from('synthetic verified source');
  const uid = createHash('sha1').update(body).digest('hex');
  const budgets = [];
  const restored = await restoreDeploymentSource('fixture', auth, {
    api: (pathname, credentials, options) => vercelApi(pathname, credentials, {
      ...options,
      fetchImpl: async (url, { signal }) => String(url).includes('/v6/')
        ? json([{ name: 'fixture.txt', type: 'file', uid }])
        : delayedJson({ data: body.toString('base64') }, signal, 25),
      timeoutSignal(ms) { budgets.push(ms); return AbortSignal.timeout(ms === 600_000 ? 500 : 5); },
      waitImpl: async () => {},
      nowMs: () => 0,
    }),
  });
  try {
    assert.deepEqual(budgets, [120_000, 600_000]);
    assert.deepEqual(await readFile(path.join(restored.root, 'fixture.txt')), body);
  } finally { await restored.cleanup(); }
});

test('transient transport failure retries without dropping auth or team scope', async () => {
  let attempts = 0;
  const delays = [];
  assert.deepEqual(await vercelApi('/fixture', auth, {
    fetchImpl: async (url, options) => {
      assert.equal(url.searchParams.get('teamId'), auth.teamId);
      assert.equal(options.headers.Authorization, `Bearer ${auth.token}`);
      if (++attempts === 1) throw new TypeError('fetch failed');
      return json({ ok: true });
    },
    waitImpl: async ms => delays.push(ms),
  }), { ok: true });
  assert.equal(attempts, 2);
  assert.deepEqual(delays, [250]);
});

test('retryable HTTP responses release their streams and cap retry-after delays', async () => {
  const delays = [];
  let attempts = 0;
  let canceled = 0;
  const value = await vercelApi('/fixture', auth, {
    fetchImpl: async () => ++attempts < 3
      ? new Response(new ReadableStream({ cancel() { canceled += 1; } }), {
        status: attempts === 1 ? 429 : 503, headers: { 'retry-after': '9999999' },
      })
      : json({ ok: true }),
    waitImpl: async ms => delays.push(ms),
  });
  assert.deepEqual(value, { ok: true });
  assert.equal(canceled, 2);
  assert.deepEqual(delays, [30_000, 30_000]);
});

test('nonretryable HTTP and malformed JSON fail without transport retries', async () => {
  for (const response of [new Response('denied', { status: 403 }), new Response('{invalid')]) {
    let attempts = 0;
    await assert.rejects(vercelApi('/fixture', auth, {
      fetchImpl: async () => { attempts += 1; return response; },
      waitImpl: async () => assert.fail('unexpected retry'),
    }));
    assert.equal(attempts, 1);
  }
});

test('transport retries consume one total budget instead of restarting the deadline', async () => {
  let clock = 0;
  const budgets = [];
  let attempts = 0;
  await assert.rejects(vercelApi('/fixture', auth, {
    timeoutMs: 1_000,
    nowMs: () => clock,
    timeoutSignal(ms) { budgets.push(ms); return new AbortController().signal; },
    fetchImpl: async () => {
      attempts += 1;
      clock += 375;
      throw new TypeError('fetch failed');
    },
    waitImpl: async ms => { clock += ms; },
  }), /retries_exhausted/);
  assert.equal(attempts, 2);
  assert.deepEqual(budgets, [1_000]);
  assert.equal(clock, 1_000);
});

test('a terminated response body retries with the same overall signal', async () => {
  let attempts = 0;
  const signals = [];
  const result = await vercelApi('/fixture', auth, {
    fetchImpl: async (_url, { signal }) => {
      signals.push(signal);
      if (++attempts === 1) return new Response(new ReadableStream({
        start(controller) { controller.error(new TypeError('terminated')); },
      }));
      return json({ ok: true });
    },
    waitImpl: async () => {},
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(attempts, 2);
  assert.equal(signals[0], signals[1]);
});

test('overall timeout interrupts retry backoff without another request', async () => {
  let attempts = 0;
  await assert.rejects(vercelApi('/fixture', auth, {
    fetchImpl: async () => { attempts += 1; return new Response('', { status: 503 }); },
    timeoutSignal: () => AbortSignal.timeout(5),
  }), { name: 'AbortError' });
  assert.equal(attempts, 1);
});
