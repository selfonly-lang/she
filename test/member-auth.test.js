import test from 'node:test';
import assert from 'node:assert/strict';
import { setupMemberAuth } from '../assets/member-auth.js';

test('logout clears OAuth first, signs out SHE, clears return path and navigates to a clean document', async t => {
  const events = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    events.push('cancel');
    assert.equal(url, '/api/auth?action=cancel');
    assert.equal(options.credentials, 'same-origin');
    return new Response('{"cleared":true}');
  });
  const oldLocation = globalThis.location, oldStorage = globalThis.sessionStorage;
  globalThis.location = { href: 'https://she.self.com.tw/admin/?line_link=confirm', replace: path => events.push(path) };
  globalThis.sessionStorage = { removeItem: key => events.push(key) };
  t.after(() => { globalThis.location = oldLocation; globalThis.sessionStorage = oldStorage; });
  const sb = { auth: { signOut: async () => { events.push('signOut'); return { error: null }; } } };
  await setupMemberAuth({ sb }).signOut();
  assert.deepEqual(events, ['cancel', 'signOut', 'she-login-return', '/admin/']);
});

test('logout cancellation failure never reports success or navigates with pending OAuth cookies', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{"error":"service_unavailable"}', { status: 503 }));
  const oldLocation = globalThis.location;
  globalThis.location = { href: 'https://she.self.com.tw/admin/', replace: () => assert.fail('must not navigate') };
  t.after(() => { globalThis.location = oldLocation; });
  const sb = { auth: { signOut: async () => assert.fail('must clear OAuth first') } };
  await assert.rejects(setupMemberAuth({ sb }).signOut(), /service_unavailable/);
});
