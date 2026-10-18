import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

const DB = 'https://tlpsqaywjcgowprhauod.supabase.co';
const SELF_API = 'https://llyjfsxpdylaejqlcyac.supabase.co/functions/v1';
const POLICY = 'she-2026-10';
const TX = '__Host-she_auth_tx';
const FINISH = '__Host-she_auth_finish';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class AuthError extends Error {
  constructor(code, status = 400) { super(code); this.status = status; }
}

const fail = (code, status) => { throw new AuthError(code, status); };
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const digest = text => createHash('sha256').update(text).digest('base64url');

export function createAuthHandler({ env = process.env, fetcher = fetch, now = () => Date.now() } = {}) {
  const origin = 'https://she.self.com.tw';
  const serviceKey = env.SHE_SUPABASE_SERVICE_ROLE_KEY;
  const lineConfigured = Boolean(serviceKey && env.LINE_LOGIN_CHANNEL_ID && env.LINE_LOGIN_CHANNEL_SECRET);
  const selfConfigured = Boolean(serviceKey && env.SELF_OAUTH_CLIENT_ID && env.SELF_OAUTH_CLIENT_SECRET);
  const cookieSecret = provider => provider === 'line' ? env.LINE_LOGIN_CHANNEL_SECRET : env.SELF_OAUTH_CLIENT_SECRET;
  const cookie = (name, value, age) => `${name}=${value}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
  const clear = name => cookie(name, '', 0);

  function seal(provider, purpose, data, seconds) {
    const iv = randomBytes(12);
    const key = createHash('sha256').update(`she-cookie-v1:${provider}:${purpose}:${cookieSecret(provider)}`).digest();
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const payload = JSON.stringify({ ...data, provider, purpose, issued: now(), expires: now() + seconds * 1000 });
    const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
    return [provider, iv.toString('base64url'), encrypted.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
  }

  function unseal(req, name, provider, purpose) {
    const matches = String(req.headers.cookie || '').split(';').map(s => s.trim()).filter(s => s.startsWith(name + '='));
    if (matches.length !== 1) fail('invalid_transaction');
    const value = matches[0].slice(name.length + 1);
    if (value.length > 4096) fail('invalid_transaction');
    try {
      const parts = value.split('.');
      if (parts.length !== 4 || parts[0] !== provider || !cookieSecret(provider)) fail('invalid_transaction');
      const key = createHash('sha256').update(`she-cookie-v1:${provider}:${purpose}:${cookieSecret(provider)}`).digest();
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(parts[1], 'base64url'));
      decipher.setAuthTag(Buffer.from(parts[3], 'base64url'));
      const data = JSON.parse(Buffer.concat([decipher.update(Buffer.from(parts[2], 'base64url')), decipher.final()]).toString());
      if (data.provider !== provider || data.purpose !== purpose || !Number.isFinite(data.issued) || !Number.isFinite(data.expires) || data.issued > now() + 30000 || data.expires <= now() || data.expires - data.issued > 600000) fail('invalid_transaction');
      return data;
    } catch { fail('invalid_transaction'); }
  }

  async function request(url, options = {}) {
    const response = await fetcher(url, { ...options, signal: AbortSignal.timeout(15000) });
    let body;
    try { body = await response.json(); } catch { body = null; }
    return { response, body };
  }

  async function database(path, { method = 'GET', body, query, prefer } = {}) {
    if (!serviceKey) fail('not_configured', 503);
    const url = new URL(DB + path);
    if (query) url.search = new URLSearchParams(query).toString();
    const result = await request(url.toString(), {
      method,
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!result.response.ok) fail(result.response.status === 409 ? 'identity_conflict' : 'service_unavailable', result.response.status === 409 ? 409 : 503);
    return result.body;
  }

  async function identity(provider, subject) {
    const rows = await database('/rest/v1/she_auth_identities', { query: { select: 'user_id', provider: `eq.${provider}`, subject: `eq.${subject}`, limit: '1' } });
    return rows?.[0]?.user_id || null;
  }

  async function attachIdentity(provider, subject, uid) {
    const existing = await identity(provider, subject);
    if (existing && existing !== uid) fail('identity_conflict', 409);
    const current = await database('/rest/v1/she_auth_identities', { query: { select: 'subject', provider: `eq.${provider}`, user_id: `eq.${uid}`, limit: '1' } });
    if (current?.[0] && current[0].subject !== subject) fail('identity_conflict', 409);
    if (!existing) await database('/rest/v1/she_auth_identities', { method: 'POST', body: { provider, subject, user_id: uid } });
  }

  async function recordConsent(uid) {
    const consents = await database('/rest/v1/she_consents', { query: { select: 'user_id', user_id: `eq.${uid}`, policy_version: `eq.${POLICY}`, limit: '1' } });
    if (!consents?.length) await database('/rest/v1/she_consents', { method: 'POST', body: { user_id: uid, policy_version: POLICY } });
  }

  async function authenticatedUser(req) {
    const authorization = String(req.headers.authorization || '');
    if (!authorization.startsWith('Bearer ') || authorization.length > 12000) fail('sign_in_required', 401);
    const { response, body } = await request(DB + '/auth/v1/user', { headers: { apikey: serviceKey || '', Authorization: authorization } });
    if (!response.ok || !UUID.test(body?.id || '')) fail('sign_in_required', 401);
    return body.id;
  }

  async function lineUser(claims) {
    let uid = await identity('line', claims.sub);
    let created = false;
    if (!uid) {
      // Never merge accounts by provider email/name. A fresh server-created
      // address prevents pre-registered email/password accounts being adopted.
      const authUser = await database('/auth/v1/admin/users', { method: 'POST', body: {
        email: `line_${randomUUID()}@members.she.self.com.tw`, email_confirm: true,
        user_metadata: { display_name: String(claims.name || 'SHE 會員').slice(0, 80), avatar_url: /^https:\/\//.test(claims.picture || '') ? claims.picture : null, signup_source: 'line' },
      } });
      uid = authUser?.id || authUser?.user?.id;
      if (!UUID.test(uid || '')) fail('service_unavailable', 503);
      const generated = uid;
      try {
        await database('/rest/v1/she_auth_identities', { method: 'POST', body: { provider: 'line', subject: claims.sub, user_id: uid } });
        created = true;
      } catch (error) {
        // A racing sign-in may have installed the same immutable mapping.
        // Remove only the disposable user generated by this request.
        const winner = error.message === 'identity_conflict' ? await identity('line', claims.sub) : null;
        await database('/auth/v1/admin/users/' + generated, { method: 'DELETE' });
        if (!winner) throw error;
        uid = winner;
      }
      if (created) {
        await database('/rest/v1/she_profiles', { method: 'POST', query: { on_conflict: 'id' }, prefer: 'resolution=ignore-duplicates', body: { id: uid, display_name: String(claims.name || 'SHE 會員').slice(0, 80), member_tier: 'member' } });
      }
    }
    await recordConsent(uid);
    const user = await database('/auth/v1/admin/users/' + uid);
    const email = user?.email || user?.user?.email;
    if (!email) fail('service_unavailable', 503);
    const link = await database('/auth/v1/admin/generate_link', { method: 'POST', body: { type: 'magiclink', email } });
    const tokenHash = link?.hashed_token || link?.properties?.hashed_token;
    if (typeof tokenHash !== 'string' || tokenHash.length < 16) fail('service_unavailable', 503);
    return { tokenHash, created, uid };
  }

  async function readBody(req) {
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) fail('invalid_request', 415);
    let body = req.body;
    if (body === undefined) {
      let text = '';
      for await (const part of req) {
        text += part;
        if (Buffer.byteLength(text) > 4096) fail('invalid_request', 413);
      }
      body = text;
    }
    if (typeof body === 'string') {
      if (Buffer.byteLength(body) > 4096) fail('invalid_request', 413);
      try { body = JSON.parse(body); } catch { fail('invalid_request'); }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 4096) fail('invalid_request');
    return body;
  }

  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const url = new URL(req.url, origin);
    const action = url.searchParams.get('action');
    const json = (status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); };
    const redirect = location => { res.statusCode = 303; res.setHeader('Location', location); res.end(); };
    try {
      if (url.searchParams.getAll('action').length !== 1) fail('invalid_request');
      if (req.method === 'POST' && req.headers.origin !== origin) fail('invalid_origin', 403);
      if (req.method === 'GET' && action === 'status') {
        let storage = false;
        if (serviceKey) {
          try { await database('/rest/v1/she_auth_identities', { query: { select: 'id', limit: '0' } }); storage = true; } catch { /* Unconfigured storage keeps social login disabled. */ }
        }
        return json(200, { line: { enabled: lineConfigured && storage }, self: { enabled: selfConfigured && storage } });
      }
      if (req.method === 'POST' && action === 'line-start') {
        if (!lineConfigured) fail('not_configured', 503);
        const body = await readBody(req);
        if (body.consent !== true || body.policy_version !== POLICY) fail('consent_required');
        if (body.link !== undefined && typeof body.link !== 'boolean') fail('invalid_request');
        const uid = body.link ? await authenticatedUser(req) : undefined;
        await database('/rest/v1/she_auth_identities', { query: { select: 'id', limit: '0' } });
        const state = randomBytes(32).toString('base64url');
        const nonce = randomBytes(32).toString('base64url');
        const verifier = randomBytes(32).toString('base64url');
        res.setHeader('Set-Cookie', [cookie(TX, seal('line', 'transaction', { state, nonce, verifier, policy: POLICY, uid }, 600), 600), clear(FINISH)]);
        const params = new URLSearchParams({ response_type: 'code', client_id: env.LINE_LOGIN_CHANNEL_ID, redirect_uri: origin + '/api/auth?action=line-callback', state, nonce, scope: 'openid profile', code_challenge: digest(verifier), code_challenge_method: 'S256' });
        return json(200, { url: 'https://access.line.me/oauth2/v2.1/authorize?' + params });
      }
      if (req.method === 'GET' && action === 'line-callback') {
        if (!lineConfigured) fail('not_configured', 503);
        res.setHeader('Set-Cookie', [clear(TX), clear(FINISH)]);
        const tx = unseal(req, TX, 'line', 'transaction');
        if (url.searchParams.getAll('state').length !== 1 || !equal(tx.state, url.searchParams.get('state')) || tx.policy !== POLICY) fail('invalid_transaction');
        if (url.searchParams.has('error')) return redirect('/admin/?auth_error=cancelled');
        const code = url.searchParams.get('code');
        if (url.searchParams.getAll('code').length !== 1 || !code || code.length > 2000) fail('invalid_transaction');
        const token = await request('https://api.line.me/oauth2/v2.1/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: origin + '/api/auth?action=line-callback', client_id: env.LINE_LOGIN_CHANNEL_ID, client_secret: env.LINE_LOGIN_CHANNEL_SECRET, code_verifier: tx.verifier }).toString() });
        if (!token.response.ok || !token.body?.id_token) fail('provider_failed');
        const verified = await request('https://api.line.me/oauth2/v2.1/verify', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ id_token: token.body.id_token, client_id: env.LINE_LOGIN_CHANNEL_ID, nonce: tx.nonce }).toString() });
        const claims = verified.body;
        if (!verified.response.ok || claims?.iss !== 'https://access.line.me' || claims.aud !== env.LINE_LOGIN_CHANNEL_ID || !equal(claims.nonce, tx.nonce) || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255 || !Number.isFinite(claims.exp) || claims.exp * 1000 <= now()) fail('provider_failed');
        if (tx.uid) {
          res.setHeader('Set-Cookie', [clear(TX), cookie(FINISH, seal('line', 'finish', { uid: tx.uid, subject: claims.sub, link: true }, 120), 120)]);
          return redirect('/admin/?line_link=confirm');
        }
        const account = await lineUser(claims);
        res.setHeader('Set-Cookie', [clear(TX), cookie(FINISH, seal('line', 'finish', account, 120), 120)]);
        return redirect('/admin/?line=complete');
      }
      if (req.method === 'POST' && action === 'line-complete') {
        if (!lineConfigured) fail('not_configured', 503);
        await readBody(req);
        const finish = unseal(req, FINISH, 'line', 'finish');
        if (finish.link) {
          const uid = await authenticatedUser(req);
          if (!equal(uid, finish.uid)) fail('account_changed', 409);
          await attachIdentity('line', finish.subject, uid);
          await recordConsent(uid);
          res.setHeader('Set-Cookie', clear(FINISH));
          return json(200, { linked: true });
        }
        res.setHeader('Set-Cookie', clear(FINISH));
        const session = await database('/auth/v1/verify', { method: 'POST', body: { type: 'magiclink', token_hash: finish.tokenHash } });
        if (!session?.access_token || !session.refresh_token || session.user?.id !== finish.uid) fail('session_failed');
        return json(200, { session: { access_token: session.access_token, refresh_token: session.refresh_token }, new_user: finish.created });
      }
      if (req.method === 'GET' && action === 'links') {
        const uid = await authenticatedUser(req);
        const links = await database('/rest/v1/she_auth_identities', { query: { select: 'provider', user_id: `eq.${uid}` } });
        return json(200, { self_linked: links.some(row => row.provider === 'self'), line_linked: links.some(row => row.provider === 'line') });
      }
      if (req.method === 'POST' && action === 'self-start') {
        if (!selfConfigured) fail('not_configured', 503);
        await readBody(req);
        const uid = await authenticatedUser(req);
        const state = randomBytes(32).toString('base64url');
        const verifier = randomBytes(32).toString('base64url');
        res.setHeader('Set-Cookie', [cookie(TX, seal('self', 'transaction', { uid, state, verifier }, 600), 600), clear(FINISH)]);
        const params = new URLSearchParams({ client_id: env.SELF_OAUTH_CLIENT_ID, redirect_uri: origin + '/api/auth?action=self-callback', response_type: 'code', scope: 'profile', state, code_challenge: digest(verifier), code_challenge_method: 'S256' });
        return json(200, { url: 'https://www.self.com.tw/oauth/authorize?' + params });
      }
      if (req.method === 'GET' && action === 'self-callback') {
        if (!selfConfigured) fail('not_configured', 503);
        res.setHeader('Set-Cookie', [clear(TX), clear(FINISH)]);
        const tx = unseal(req, TX, 'self', 'transaction');
        if (url.searchParams.getAll('state').length !== 1 || !equal(tx.state, url.searchParams.get('state'))) fail('invalid_transaction');
        if (url.searchParams.has('error')) return redirect('/admin/?auth_error=cancelled');
        const code = url.searchParams.get('code');
        if (url.searchParams.getAll('code').length !== 1 || !code || code.length > 2000) fail('invalid_transaction');
        const token = await request(SELF_API + '/oauth-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grant_type: 'authorization_code', code, client_id: env.SELF_OAUTH_CLIENT_ID, client_secret: env.SELF_OAUTH_CLIENT_SECRET, redirect_uri: origin + '/api/auth?action=self-callback', code_verifier: tx.verifier }) });
        if (!token.response.ok || !token.body?.access_token) fail('provider_failed');
        let profile;
        try {
          const result = await request(SELF_API + '/oauth-userinfo', { headers: { Authorization: 'Bearer ' + token.body.access_token } });
          if (!result.response.ok || !UUID.test(result.body?.sub || '') || (result.body.id && result.body.id !== result.body.sub)) fail('provider_failed');
          profile = result.body;
        } finally {
          await Promise.all([token.body.access_token, token.body.refresh_token].filter(Boolean).map(value => request(SELF_API + '/oauth-revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: value }) }).catch(() => null)));
        }
        res.setHeader('Set-Cookie', [clear(TX), cookie(FINISH, seal('self', 'finish', { uid: tx.uid, subject: profile.sub }, 300), 300)]);
        return redirect('/admin/?self=confirm');
      }
      if (req.method === 'POST' && action === 'self-complete') {
        if (!selfConfigured) fail('not_configured', 503);
        await readBody(req);
        const uid = await authenticatedUser(req);
        const finish = unseal(req, FINISH, 'self', 'finish');
        if (!equal(uid, finish.uid)) fail('account_changed', 409);
        await attachIdentity('self', finish.subject, uid);
        res.setHeader('Set-Cookie', clear(FINISH));
        return json(200, { linked: true });
      }
      fail('not_found', 404);
    } catch (error) {
      if (action === 'line-callback' || action === 'self-callback') {
        res.setHeader('Set-Cookie', [clear(TX), clear(FINISH)]);
        return redirect('/admin/?auth_error=' + (error.message === 'invalid_transaction' ? 'expired' : 'unavailable'));
      }
      return json(error instanceof AuthError ? error.status : 503, { error: error instanceof AuthError ? error.message : 'service_unavailable' });
    }
  };
}
