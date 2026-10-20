export const POLICY_VERSION = 'she-2026-10';

const messages = {
  consent_required: '請先閱讀並勾選會員條款與資料使用說明。',
  invalid_transaction: '登入連結已失效，請重新開始 LINE 登入。',
  not_configured: '這項登入服務正在準備中，請先使用電子郵件登入。',
  identity_conflict: '這個會員身分已連結其他帳號，請透過官方 LINE 聯絡我們協助核對。',
  account_changed: '目前 SHE 帳號與開始連結時不同，請登入原帳號再確認。',
  sign_in_required: '請先登入 SHE，再連結 SELF 會員。',
};

export function setupMemberAuth({ sb, notify, showAccount }) {
  const q = selector => document.querySelector(selector);
  let features = { line: { enabled: false }, self: { enabled: false } };
  let newLineUser = false;
  let selfLinked = false;
  let lineLinked = false;
  let pendingLine = new URL(location.href).searchParams.get('line_link') === 'confirm';
  let pendingSelf = new URL(location.href).searchParams.get('self') === 'confirm';
  const returnPaths = new Set(['/studio/', '/manage-products/']);
  const returnKey = 'she-login-return';

  function rememberReturnPath() {
    const params = new URL(location.href).searchParams;
    if (!params.has('next')) return;
    try {
      const path = params.get('next');
      if (returnPaths.has(path)) sessionStorage.setItem(returnKey, JSON.stringify({ path, expires: Date.now() + 600000 }));
      else sessionStorage.removeItem(returnKey);
    } catch { /* Restricted storage never prevents sign-in. */ }
  }

  function continueToRequestedPage() {
    try {
      const target = JSON.parse(sessionStorage.getItem(returnKey) || 'null');
      sessionStorage.removeItem(returnKey);
      if (returnPaths.has(target?.path) && target.expires > Date.now()) {
        location.assign(target.path); return true;
      }
    } catch { /* Use the member dashboard when storage is unavailable. */ }
    return false;
  }

  function explain(error) { return messages[error?.message] || '目前無法完成連線，請稍後重試；現有會員帳號不受影響。'; }
  function cleanQuery(...names) {
    const url = new URL(location.href);
    for (const name of names) url.searchParams.delete(name);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  async function api(action, body, authenticated = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (authenticated) {
      const { data, error } = await sb.auth.getSession();
      if (error || !data.session?.access_token) throw Error('sign_in_required');
      headers.Authorization = 'Bearer ' + data.session.access_token;
    }
    const response = await fetch('/api/auth?action=' + action, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      cache: 'no-store', headers, signal: AbortSignal.timeout(body === undefined ? 8000 : 20000),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let data;
    try { data = await response.json(); } catch { throw Error('service_unavailable'); }
    if (!response.ok) throw Error(data.error || 'service_unavailable');
    return data;
  }

  function selectEmailTab(mode) {
    const activeForm = q('#email-login-panel').hidden ? q('#signup-form') : q('#login-form');
    const nextForm = mode === 'signup' ? q('#signup-form') : q('#login-form');
    if (activeForm !== nextForm) {
      for (const name of ['email', 'password']) {
        if (activeForm.elements[name].value && !nextForm.elements[name].value) nextForm.elements[name].value = activeForm.elements[name].value;
      }
      // Never leave a previously revealed password visible when switching forms.
      for (const button of document.querySelectorAll('[data-password-toggle]')) hidePassword(button);
      q('#auth-message').textContent = '';
      q('#auth-message').classList.remove('success');
    }
    for (const tab of document.querySelectorAll('[data-auth-tab]')) {
      const selected = tab.dataset.authTab === mode;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    q('#email-login-panel').hidden = mode !== 'login';
    q('#email-signup-panel').hidden = mode !== 'signup';
  }

  function hidePassword(button) {
    q('#' + button.getAttribute('aria-controls')).type = 'password';
    button.setAttribute('aria-pressed', 'false');
    button.textContent = '顯示';
    button.setAttribute('aria-label', button.getAttribute('aria-label').replace('隱藏', '顯示'));
  }

  function clearPasswords() {
    for (const input of document.querySelectorAll('#auth-panel input[name="password"]')) input.value = '';
    for (const button of document.querySelectorAll('[data-password-toggle]')) hidePassword(button);
  }

  async function refreshFeatures() {
    try { features = await api('status'); } catch { /* Email remains immediately available. */ }
    const enabled = features.line?.enabled === true;
    q('#line-access').hidden = !enabled;
    q('#line-login').disabled = !enabled;
    q('#line-status').textContent = enabled ? '名稱與頭像會帶入私人檔案，之後可修改。' : '';
    q('#social-availability').textContent = enabled ? '需要協助？' : 'LINE 登入準備中';
    renderLine(); renderSelf();
  }

  async function initialize() {
    if (location.hostname.endsWith('.vercel.app')) {
      location.replace('https://she.self.com.tw' + location.pathname + location.search);
      return new Promise(() => {});
    }
    rememberReturnPath();
    selectEmailTab(new URL(location.href).searchParams.get('mode') === 'signup' ? 'signup' : 'login');
    for (const button of document.querySelectorAll('[data-password-toggle]')) {
      button.addEventListener('click', () => {
        const input = q('#' + button.getAttribute('aria-controls'));
        const reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';
        button.textContent = reveal ? '隱藏' : '顯示';
        button.setAttribute('aria-pressed', String(reveal));
        button.setAttribute('aria-label', button.getAttribute('aria-label').replace(reveal ? '顯示' : '隱藏', reveal ? '隱藏' : '顯示'));
      });
    }
    for (const tab of document.querySelectorAll('[data-auth-tab]')) {
      tab.addEventListener('click', () => selectEmailTab(tab.dataset.authTab));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const mode = event.key === 'Home' ? 'login' : event.key === 'End' ? 'signup' : tab.dataset.authTab === 'login' ? 'signup' : 'login';
        selectEmailTab(mode);
        q(`[data-auth-tab="${mode}"]`).focus();
      });
    }
    const params = new URL(location.href).searchParams;
    if (params.has('auth_error')) {
      q('#auth-message').textContent = params.get('auth_error') === 'cancelled' ? '你已取消授權，尚未變更會員身分。可以重新登入或使用電子郵件。' : '授權未完成或已過期，請重新開始登入。';
      cleanQuery('auth_error');
    }
    if (params.get('line') === 'complete') {
      q('#auth-message').textContent = '正在安全完成 LINE 登入…';
      try {
        const result = await api('line-complete', {});
        const { error } = await sb.auth.setSession(result.session);
        if (error) throw error;
        newLineUser = result.new_user;
        q('#auth-message').textContent = '';
      } catch (error) { q('#auth-message').textContent = explain(error); }
      cleanQuery('line');
    }
    // Provider readiness must not delay Email login or restoring an existing session.
    void refreshFeatures();
    q('#line-login').addEventListener('click', async () => {
      if (!q('#line-consent').checked) {
        q('#auth-message').textContent = messages.consent_required;
        q('#line-consent').focus(); return;
      }
      const button = q('#line-login'); button.disabled = true;
      q('#auth-message').textContent = '正在前往 LINE 安全登入…';
      try {
        const result = await api('line-start', { consent: true, policy_version: POLICY_VERSION });
        const url = new URL(result.url);
        if (url.origin !== 'https://access.line.me') throw Error('service_unavailable');
        location.assign(url.toString());
      } catch (error) { q('#auth-message').textContent = explain(error); button.disabled = false; }
    });
    q('#connect-self').addEventListener('click', async () => {
      const button = q('#connect-self'); button.disabled = true;
      try {
        if (pendingSelf) {
          await api('self-complete', {}, true);
          pendingSelf = false; selfLinked = true; cleanQuery('self');
          renderSelf(); notify('已連結 SELF 會員身分；既有會員權益維持原審核方式。');
        } else {
          const result = await api('self-start', {}, true);
          const url = new URL(result.url);
          if (url.origin !== 'https://www.self.com.tw') throw Error('service_unavailable');
          location.assign(url.toString());
        }
      } catch (error) { q('#self-auth-status').textContent = explain(error); button.disabled = false; }
    });
    q('#connect-line').addEventListener('click', async () => {
      const button = q('#connect-line');
      if (!pendingLine && !q('#profile-line-consent').checked) {
        q('#line-link-status').textContent = messages.consent_required;
        q('#profile-line-consent').focus(); return;
      }
      button.disabled = true;
      try {
        if (pendingLine) {
          await api('line-complete', {}, true);
          pendingLine = false; lineLinked = true; cleanQuery('line_link');
          renderLine(); notify('已將 LINE 連結到目前 SHE 帳號，原會員資料保留。');
        } else {
          const result = await api('line-start', { consent: true, policy_version: POLICY_VERSION, link: true }, true);
          const url = new URL(result.url);
          if (url.origin !== 'https://access.line.me') throw Error('service_unavailable');
          location.assign(url.toString());
        }
      } catch (error) { q('#line-link-status').textContent = explain(error); button.disabled = false; }
    });
  }

  function renderLine() {
    q('#connect-line').disabled = lineLinked || !features.line.enabled;
    q('#connect-line').textContent = lineLinked ? '已連結 LINE' : pendingLine ? '確認連結至目前 SHE 帳號' : '為這個帳號連結 LINE';
    q('#profile-line-agreement').hidden = lineLinked || pendingLine;
    q('#line-link-status').textContent = lineLinked ? '下次可以直接使用 LINE 登入這個 SHE 帳號。' : pendingLine ? '已取得 LINE 授權，請確認要連結目前的 SHE 帳號。' : '已有 Email 帳號的會員，可在這裡連結 LINE，保留原本的會員檔案。';
  }

  function renderSelf() {
    const button = q('#connect-self');
    button.disabled = selfLinked || !features.self.enabled;
    button.textContent = selfLinked ? '已連結 SELF 會員' : pendingSelf ? '確認連結目前的 SHE 帳號' : '連結我的 SELF 會員';
    q('#self-auth-status').textContent = selfLinked ? '已確認你的 SELF 會員身分。付費、商務資格仍依既有規則核實，不會因連結而自動升級。' : pendingSelf ? 'SELF 授權已完成，請確認連結至目前的 SHE 帳號。' : features.self.enabled ? '登入 SELF 並同意授權後，即可將兩邊的會員身分連結。' : 'SELF 會員連結準備中。你可以先完成 SHE 檔案，稍後再回來連結。';
  }

  function renderProfile(user, profile) {
    const completed = ['display_name', 'city', 'category', 'headline'].filter(key => String(profile[key] || '').trim()).length;
    q('#profile-progress').textContent = `已填寫 ${completed} / 4 項基本資料；簡介與其他內容可以稍後再補。`;
    const image = q('#profile-avatar');
    try {
      const url = new URL(user.user_metadata?.avatar_url || '');
      if (url.protocol !== 'https:') throw Error();
      image.src = url.toString(); image.hidden = false;
    } catch { image.hidden = true; image.removeAttribute('src'); }
  }

  async function afterSignIn(user) {
    if (!newLineUser && !pendingSelf && !pendingLine && continueToRequestedPage()) return;
    if (newLineUser || pendingSelf || pendingLine) { showAccount(); newLineUser = false; }
    try { const links = await api('links', undefined, true); selfLinked = links.self_linked; lineLinked = links.line_linked; } catch { selfLinked = false; lineLinked = false; }
    renderSelf(); renderLine();
  }

  return { initialize, afterSignIn, renderProfile, showAccount, selectEmailTab, clearPasswords, explain };
}
