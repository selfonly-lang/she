import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createAuthHandler } from '../lib/auth.js';

const EXISTING = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const SELF_ID = '33333333-3333-4333-8333-333333333333';
const SITE = 'https://she.self.com.tw';
const DB = 'https://tlpsqaywjcgowprhauod.supabase.co';
const env = {
  LINE_LOGIN_CHANNEL_ID: 'TEST_ONLY_LOGIN_CHANNEL',
  LINE_LOGIN_CHANNEL_SECRET: 'test-only-not-a-real-channel-secret',
  SHE_SUPABASE_SERVICE_ROLE_KEY: 'test-only-not-a-real-service-key',
  SELF_OAUTH_CLIENT_ID: 'TEST_ONLY_SELF_CLIENT',
  SELF_OAUTH_CLIENT_SECRET: 'test-only-not-a-real-oauth-secret',
};
const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

function fixture(overrides = {}) {
  const f = {
    time: 1800000000000, events: [], identities: [], profiles: [], consents: [], links: new Map(), users: new Map([
      [EXISTING, { id: EXISTING, email: 'existing@example.invalid', user_metadata: {} }],
      [OTHER, { id: OTHER, email: 'other@example.invalid', user_metadata: {} }],
    ]), sub: 'U' + '1'.repeat(32), storage: true, ...overrides,
  };
  f.fetcher = async (input, options = {}) => {
    const url = new URL(input), method = options.method || 'GET';
    const headers = new Headers(options.headers);
    const data = options.body && headers.get('Content-Type') === 'application/json' ? JSON.parse(options.body) : options.body;
    f.events.push({ url, method, data });
    if (url.origin === 'https://api.line.me') {
      const form = new URLSearchParams(options.body);
      if (url.pathname.endsWith('/token')) {
        assert.equal(form.get('redirect_uri'), SITE + '/api/auth?action=line-callback');
        assert.equal(createHash('sha256').update(form.get('code_verifier')).digest('base64url'), f.challenge);
        return response({ id_token: 'TEST_ONLY_ID_TOKEN' });
      }
      return response({ iss: 'https://access.line.me', aud: env.LINE_LOGIN_CHANNEL_ID, nonce: form.get('nonce'), sub: f.sub, name: '測試會員', picture: 'https://example.invalid/avatar.png', exp: Math.floor(f.time / 1000) + 300, ...f.claims });
    }
    if (url.origin === 'https://llyjfsxpdylaejqlcyac.supabase.co') {
      if (url.pathname.endsWith('/oauth-token')) {
        assert.equal(data.redirect_uri, SITE + '/api/auth?action=self-callback');
        assert.equal(createHash('sha256').update(data.code_verifier).digest('base64url'), f.selfChallenge);
        return response({ access_token: 'TEST_ONLY_SELF_ACCESS', refresh_token: 'TEST_ONLY_SELF_REFRESH' });
      }
      if (url.pathname.endsWith('/oauth-userinfo')) return response({ sub: SELF_ID, id: SELF_ID, name: 'SELF 測試會員', ...f.selfClaims });
      if (url.pathname.endsWith('/oauth-revoke')) return response({ revoked: true });
    }
    assert.equal(url.origin, DB, 'Unexpected network destination');
    const path = url.pathname;
    if (path === '/auth/v1/user') {
      const uid = headers.get('Authorization') === 'Bearer TEST_ONLY_EXISTING_SESSION' ? EXISTING : headers.get('Authorization') === 'Bearer TEST_ONLY_OTHER_SESSION' ? OTHER : null;
      return uid ? response(f.users.get(uid)) : response({}, 401);
    }
    if (path === '/rest/v1/she_auth_identities') {
      if (!f.storage) return response({}, 404);
      if (method === 'POST') {
        if (f.race) {
          f.race = false;
          f.identities.push({ provider: data.provider, subject: data.subject, user_id: EXISTING });
          return response({}, 409);
        }
        if (f.identities.some(row => row.provider === data.provider && (row.subject === data.subject || row.user_id === data.user_id))) return response({}, 409);
        f.identities.push(data); return response([], 201);
      }
      let rows = f.identities;
      for (const field of ['provider', 'subject', 'user_id']) {
        if (url.searchParams.has(field)) rows = rows.filter(row => row[field] === url.searchParams.get(field).slice(3));
      }
      return response(url.searchParams.get('limit') === '0' ? [] : rows);
    }
    if (path === '/auth/v1/admin/users' && method === 'POST') {
      const user = { id: randomUUID(), ...data };
      f.users.set(user.id, user); return response(user, 201);
    }
    if (path.startsWith('/auth/v1/admin/users/')) {
      const id = path.split('/').at(-1);
      if (method === 'DELETE') { f.users.delete(id); return response({}); }
      return f.users.has(id) ? response(f.users.get(id)) : response({}, 404);
    }
    if (path === '/rest/v1/she_profiles' && method === 'POST') { f.profiles.push(data); return response([], 201); }
    if (path === '/rest/v1/she_consents') {
      if (method === 'POST') { f.consents.push(data); return response([], 201); }
      return response(f.consents.filter(row => row.user_id === url.searchParams.get('user_id').slice(3)));
    }
    if (path === '/auth/v1/admin/generate_link') {
      const user = [...f.users.values()].find(user => user.email === data.email);
      assert.ok(user, 'Magic link must belong to the mapped account');
      const hash = 'TEST_ONLY_HASH_' + randomUUID();
      f.links.set(hash, user.id); return response({ hashed_token: hash, user });
    }
    if (path === '/auth/v1/verify') {
      const uid = f.links.get(data.token_hash);
      if (!uid) return response({}, 403);
      f.links.delete(data.token_hash);
      return response({ access_token: 'TEST_ONLY_ACCESS', refresh_token: 'TEST_ONLY_REFRESH', user: f.users.get(uid) });
    }
    throw Error('Unhandled fixture request: ' + path);
  };
  f.handler = createAuthHandler({ env: { ...env, ...f.env }, fetcher: f.fetcher, now: () => f.time });
  return f;
}

async function call(f, action, { method = 'POST', body = {}, cookie, auth, origin = SITE, extra = '' } = {}) {
  const req = { method, url: '/api/auth?action=' + action + extra, headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...(auth ? { authorization: 'Bearer ' + auth } : {}) }, body };
  const result = { headers: {} };
  const res = { statusCode: 200, setHeader(name, value) { result.headers[name.toLowerCase()] = value; }, end(value) { result.status = this.statusCode; result.text = value || ''; } };
  await f.handler(req, res);
  if (result.headers['content-type']?.includes('json')) result.body = JSON.parse(result.text);
  return result;
}
function getCookie(result, name = '__Host-she_auth_tx') {
  const values = [result.headers['set-cookie']].flat();
  return values.find(s => s?.startsWith(name + '=') && !s.includes('Max-Age=0')).split(';')[0];
}
async function startLine(f, link = false) {
  const result = await call(f, 'line-start', { body: { consent: true, policy_version: 'she-2026-10', ...(link ? { link: true } : {}) }, ...(link ? { auth: 'TEST_ONLY_EXISTING_SESSION' } : {}) });
  assert.equal(result.status, 200);
  const url = new URL(result.body.url);
  f.challenge = url.searchParams.get('code_challenge');
  return { result, cookie: getCookie(result), state: url.searchParams.get('state'), url };
}
async function lineCallback(f, start, extra = '') {
  return call(f, 'line-callback', { method: 'GET', cookie: start.cookie, extra: '&state=' + start.state + '&code=TEST_ONLY_CODE' + extra });
}
async function startSelf(f) {
  const result = await call(f, 'self-start', { auth: 'TEST_ONLY_EXISTING_SESSION' });
  assert.equal(result.status, 200);
  const url = new URL(result.body.url); f.selfChallenge = url.searchParams.get('code_challenge');
  return { result, cookie: getCookie(result), state: url.searchParams.get('state'), url };
}
async function selfCallback(f, start) { return call(f, 'self-callback', { method: 'GET', cookie: start.cookie, extra: '&state=' + start.state + '&code=TEST_ONLY_SELF_CODE' }); }

test('unconfigured or unavailable storage never advertises social login readiness', async () => {
  const absent = fixture({ env: { SHE_SUPABASE_SERVICE_ROLE_KEY: undefined } });
  const result = await call(absent, 'status', { method: 'GET' });
  assert.deepEqual(result.body, { line: { enabled: false, setup: { missing_environment: ['SHE_SUPABASE_SERVICE_ROLE_KEY'], identity_storage: 'unchecked' } }, self: { enabled: false } });
  assert.equal(absent.events.length, 0);
  const missing = fixture({ storage: false });
  assert.equal((await call(missing, 'status', { method: 'GET' })).body.line.enabled, false);
  assert.equal((await call(missing, 'line-start', { body: { consent: true, policy_version: 'she-2026-10' } })).status, 503);
});

test('readiness identifies each missing setting and separates storage failure without disclosing credentials', async () => {
  const names = ['LINE_LOGIN_CHANNEL_ID', 'LINE_LOGIN_CHANNEL_SECRET', 'SHE_SUPABASE_SERVICE_ROLE_KEY'];
  for (const name of names) {
    const f = fixture({ env: { [name]: undefined } });
    const result = await call(f, 'status', { method: 'GET' });
    assert.equal(result.body.line.enabled, false);
    assert.deepEqual(result.body.line.setup.missing_environment, [name]);
    assert.equal(result.body.line.setup.identity_storage, name === 'SHE_SUPABASE_SERVICE_ROLE_KEY' ? 'unchecked' : 'ready');
    for (const value of Object.values(env)) assert.ok(!result.text.includes(value));
    assert.ok(f.events.every(event => event.method === 'GET' && event.url.pathname === '/rest/v1/she_auth_identities' && event.url.searchParams.get('limit') === '0'));
  }
  const missing = await call(fixture({ storage: false }), 'status', { method: 'GET' });
  assert.deepEqual(missing.body.line.setup, { missing_environment: [], identity_storage: 'unavailable' });
  assert.equal(missing.body.line.enabled, false);
  const ready = await call(fixture(), 'status', { method: 'GET' });
  assert.equal(ready.body.line.enabled, true);
  assert.deepEqual(ready.body.line.setup, { missing_environment: [], identity_storage: 'ready' });
});

test('POST rejects foreign/missing origins and missing explicit consent before contacting providers', async () => {
  const f = fixture();
  for (const origin of ['https://attacker.example.invalid', undefined]) {
    const result = await call(f, 'line-start', { origin: origin || '' });
    assert.equal(result.status, 403);
  }
  assert.equal((await call(f, 'line-start', { body: { consent: false } })).body.error, 'consent_required');
  assert.equal(f.events.length, 0);
});

test('LINE start uses exact callback, minimal scopes, PKCE and opaque protected transaction cookie', async () => {
  const f = fixture(), start = await startLine(f);
  assert.equal(start.url.origin, 'https://access.line.me');
  assert.equal(start.url.searchParams.get('redirect_uri'), SITE + '/api/auth?action=line-callback');
  assert.equal(start.url.searchParams.get('scope'), 'openid profile');
  assert.equal(start.url.searchParams.get('code_challenge_method'), 'S256');
  assert.match(start.result.headers['set-cookie'][0], /HttpOnly; Secure; SameSite=Lax/);
  assert.ok(!start.cookie.includes(start.state));
  assert.ok(!start.result.text.includes(env.LINE_LOGIN_CHANNEL_SECRET));
  assert.equal(start.result.headers['cache-control'], 'no-store');
});

test('missing, expired, tampered or mismatched state cannot reach token exchange', async () => {
  const f = fixture(), start = await startLine(f);
  const baseline = f.events.length;
  const missing = await call(f, 'line-callback', { method: 'GET', extra: '&state=' + start.state + '&code=TEST' });
  assert.equal(missing.headers.location, '/admin/?auth_error=expired');
  const tampered = await lineCallback(f, { ...start, cookie: start.cookie.slice(0, -5) + 'AAAAA' });
  assert.equal(tampered.headers.location, '/admin/?auth_error=expired');
  const mismatch = await lineCallback(f, { ...start, state: 'wrong-state' });
  assert.equal(mismatch.headers.location, '/admin/?auth_error=expired');
  const duplicate = await lineCallback(f, start, '&state=' + start.state);
  assert.equal(duplicate.headers.location, '/admin/?auth_error=expired');
  f.time += 601000;
  assert.equal((await lineCallback(f, start)).headers.location, '/admin/?auth_error=expired');
  assert.equal(f.events.length, baseline);
});

test('provider denial creates no account and returns a retryable cancellation', async () => {
  const f = fixture(), start = await startLine(f);
  const result = await call(f, 'line-callback', { method: 'GET', cookie: start.cookie, extra: '&state=' + start.state + '&error=access_denied' });
  assert.equal(result.headers.location, '/admin/?auth_error=cancelled');
  assert.equal(f.users.size, 2);
  assert.equal(f.identities.length, 0);
});

for (const [field, value] of [['nonce', 'wrong-nonce'], ['aud', 'another-channel'], ['iss', 'https://attacker.example.invalid'], ['exp', 1]]) {
  test('LINE verification rejects invalid ' + field + ' before creating any identity', async () => {
    const f = fixture({ claims: { [field]: value } }), start = await startLine(f);
    const result = await lineCallback(f, start);
    assert.equal(result.headers.location, '/admin/?auth_error=unavailable');
    assert.equal(f.users.size, 2);
    assert.equal(f.identities.length, 0);
  });
}

test('first LINE sign-in creates a private basic profile and one-use same-origin session handoff', async () => {
  const f = fixture(), start = await startLine(f), callback = await lineCallback(f, start);
  assert.equal(callback.headers.location, '/admin/?line=complete');
  assert.equal(f.profiles.length, 1);
  assert.deepEqual(Object.keys(f.profiles[0]).sort(), ['display_name', 'id', 'member_tier']);
  assert.equal(f.profiles[0].member_tier, 'member');
  assert.equal(f.profiles[0].display_name, '測試會員');
  assert.equal(f.consents.length, 1);
  const cookie = getCookie(callback, '__Host-she_auth_finish');
  assert.ok(!cookie.includes([...f.links.keys()][0]));
  const finish = await call(f, 'line-complete', { cookie });
  assert.equal(finish.status, 200);
  assert.deepEqual(finish.body, { session: { access_token: 'TEST_ONLY_ACCESS', refresh_token: 'TEST_ONLY_REFRESH' }, new_user: true });
  assert.equal(finish.headers['cache-control'], 'no-store');
  assert.equal((await call(f, 'line-complete', { cookie })).status, 503);
  const writes = f.events.filter(e => e.method !== 'GET' && e.url.pathname.startsWith('/rest/v1/'));
  assert.ok(writes.every(e => ['she_auth_identities', 'she_profiles', 'she_consents'].includes(e.url.pathname.split('/').at(-1))));
});

test('returning LINE sign-in reuses immutable identity and never overwrites an existing profile', async () => {
  const f = fixture(); f.identities.push({ provider: 'line', subject: f.sub, user_id: EXISTING });
  f.profiles.push({ id: EXISTING, display_name: '原本姓名', member_tier: 'paid' });
  const callback = await lineCallback(f, await startLine(f));
  const result = await call(f, 'line-complete', { cookie: getCookie(callback, '__Host-she_auth_finish') });
  assert.equal(result.status, 200); assert.equal(result.body.new_user, false);
  assert.equal(f.users.size, 2);
  assert.deepEqual(f.profiles, [{ id: EXISTING, display_name: '原本姓名', member_tier: 'paid' }]);
});

test('same display name/email never merges another LINE identity with an existing Email account', async () => {
  const f = fixture({ claims: { email: 'existing@example.invalid', name: 'Existing member' } });
  await lineCallback(f, await startLine(f));
  assert.notEqual(f.identities[0].user_id, EXISTING);
  assert.equal(f.users.get(EXISTING).email, 'existing@example.invalid');
});

test('a racing first sign-in preserves the winning identity and removes only its own disposable user', async () => {
  const f = fixture({ race: true });
  const callback = await lineCallback(f, await startLine(f));
  assert.equal(callback.headers.location, '/admin/?line=complete');
  assert.equal(f.users.size, 2);
  assert.equal(f.identities[0].user_id, EXISTING);
  assert.equal(f.profiles.length, 0);
});

test('existing Email account can explicitly link LINE without creating a second account or session', async () => {
  const f = fixture(), start = await startLine(f, true), callback = await lineCallback(f, start);
  assert.equal(callback.headers.location, '/admin/?line_link=confirm');
  assert.equal(f.identities.length, 0);
  const cookie = getCookie(callback, '__Host-she_auth_finish');
  assert.equal((await call(f, 'line-complete', { cookie, auth: 'TEST_ONLY_OTHER_SESSION' })).body.error, 'account_changed');
  assert.equal(f.identities.length, 0);
  const result = await call(f, 'line-complete', { cookie, auth: 'TEST_ONLY_EXISTING_SESSION' });
  assert.deepEqual(result.body, { linked: true });
  assert.equal(f.identities[0].user_id, EXISTING);
  assert.equal(f.users.size, 2);
  assert.equal(f.links.size, 0);
});

test('LINE linking refuses an identity already belonging to another SHE member', async () => {
  const f = fixture(); f.identities.push({ provider: 'line', subject: f.sub, user_id: OTHER });
  const callback = await lineCallback(f, await startLine(f, true));
  const result = await call(f, 'line-complete', { cookie: getCookie(callback, '__Host-she_auth_finish'), auth: 'TEST_ONLY_EXISTING_SESSION' });
  assert.equal(result.status, 409);
  assert.equal(f.identities[0].user_id, OTHER);
});

test('SELF linking requires an authenticated SHE account, explicit OAuth/PKCE and same-account confirmation', async () => {
  const f = fixture();
  assert.equal((await call(f, 'self-start')).status, 401);
  const start = await startSelf(f);
  assert.equal(start.url.origin, 'https://www.self.com.tw');
  assert.equal(start.url.searchParams.get('scope'), 'profile');
  assert.equal(start.url.searchParams.get('auto_approve'), null);
  const callback = await selfCallback(f, start);
  assert.equal(callback.headers.location, '/admin/?self=confirm');
  assert.equal(f.identities.length, 0);
  assert.equal(f.events.filter(e => e.url.pathname.endsWith('/oauth-revoke')).length, 2);
  const cookie = getCookie(callback, '__Host-she_auth_finish');
  assert.equal((await call(f, 'self-complete', { cookie, auth: 'TEST_ONLY_OTHER_SESSION' })).status, 409);
  assert.equal(f.identities.length, 0);
  assert.equal((await call(f, 'self-complete', { cookie, auth: 'TEST_ONLY_EXISTING_SESSION' })).status, 200);
  assert.deepEqual(f.identities, [{ provider: 'self', subject: SELF_ID, user_id: EXISTING }]);
  assert.ok(!f.events.some(e => e.method !== 'GET' && /she_(member_links|profiles|prices|commissions|staff_roles)/.test(e.url.pathname)));
});

test('SELF identity cannot be stolen or silently replaced', async () => {
  const f = fixture(); f.identities.push({ provider: 'self', subject: SELF_ID, user_id: OTHER });
  const callback = await selfCallback(f, await startSelf(f));
  const result = await call(f, 'self-complete', { cookie: getCookie(callback, '__Host-she_auth_finish'), auth: 'TEST_ONLY_EXISTING_SESSION' });
  assert.equal(result.status, 409);
  assert.deepEqual(f.identities, [{ provider: 'self', subject: SELF_ID, user_id: OTHER }]);
});

test('SELF userinfo without a verified immutable subject is refused', async () => {
  const f = fixture({ selfClaims: { sub: null, email: 'existing@example.invalid' } });
  const result = await selfCallback(f, await startSelf(f));
  assert.equal(result.headers.location, '/admin/?auth_error=unavailable');
  assert.equal(f.identities.length, 0);
});

test('link status requires authentication and reveals no provider subjects or member IDs', async () => {
  const f = fixture(); f.identities.push({ provider: 'self', subject: SELF_ID, user_id: EXISTING });
  assert.equal((await call(f, 'links', { method: 'GET' })).status, 401);
  const result = await call(f, 'links', { method: 'GET', auth: 'TEST_ONLY_EXISTING_SESSION' });
  assert.deepEqual(result.body, { line_linked: false, self_linked: true });
  assert.ok(!result.text.includes(EXISTING) && !result.text.includes(SELF_ID));
});
