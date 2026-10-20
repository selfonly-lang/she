(() => {
  'use strict';
  const page = document.documentElement.dataset.shePage;
  document.documentElement.classList.add('she-editorial');
  document.documentElement.classList.add('she-enhanced');
  const nav = [
    ['/', '首頁', 'home'], ['/women/', '女性人物', 'women'],
    ['/#story', '女力觀點', 'story'], ['/catalog/', '品牌精選', 'catalog'],
    ['/studio/', '創作專頁', 'studio'], ['/admin/', '會員中心', 'admin'],
  ];
  const active = page === 'people' ? 'women' : page === 'manage-products' ? 'admin' : page;
  const legacyHeader = document.querySelector('body > header:not(.she-masthead)');
  const existingMasthead = document.querySelector('.she-masthead');
  const masthead = existingMasthead || document.createElement('header');
  masthead.className = 'she-masthead';
  masthead.dataset.menuOpen = 'false';
  if (!existingMasthead) masthead.innerHTML = `<div class="she-brand-row"><div class="she-edition">THE ENTREPRENEUR EDIT<span>女性・風格・事業的可能</span></div><a class="she-wordmark" href="/" aria-label="SHE 首頁">SHE<span>STYLE. HER. EMPIRE.</span></a><div class="she-account"><a class="she-account-link" href="/admin/">會員登入 <span aria-hidden="true">↗</span></a></div><button class="she-menu-toggle" type="button" aria-label="開啟主選單" aria-expanded="false" aria-controls="she-main-nav"><i aria-hidden="true"></i><i aria-hidden="true"></i></button></div>`;
  const links = masthead.querySelector('#she-main-nav') || document.createElement('nav');
  links.id = 'she-main-nav'; links.className = 'she-main-nav'; links.setAttribute('aria-label', '主導覽');
  for (const [href, label, key] of (existingMasthead ? [] : nav)) {
    const a = document.createElement('a'); a.href = href; a.textContent = label;
    if (key === active) a.setAttribute('aria-current', 'page');
    links.append(a);
  }
  masthead.append(links);
  if (!existingMasthead) document.body.prepend(masthead);
  if (legacyHeader) legacyHeader.classList.add('she-original-header');
  const account = masthead.querySelector('.she-account');
  const homeLogin = document.getElementById('memberLogin');
  if (homeLogin) { account.replaceChildren(homeLogin); homeLogin.textContent = '會員登入 ↗'; }
  if (page === 'admin') {
    account.replaceChildren();
    for (const id of ['signed-user', 'logout']) { const el = document.getElementById(id); if (el) account.append(el); }
  }
  const menu = masthead.querySelector('.she-menu-toggle');
  function closeMenu() {
    masthead.dataset.menuOpen = 'false'; menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', '開啟主選單');
  }
  menu.addEventListener('click', () => {
    const open = masthead.dataset.menuOpen !== 'true'; masthead.dataset.menuOpen = String(open);
    menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? '關閉主選單' : '開啟主選單');
  });
  links.addEventListener('click', closeMenu);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && masthead.dataset.menuOpen === 'true') { closeMenu(); menu.focus(); } });
  document.addEventListener('click', event => { if (!masthead.contains(event.target)) closeMenu(); });
  const profileModal = document.getElementById('modal');
  if (profileModal) {
    const panel = profileModal.querySelector('.modal-panel');
    let trigger = null;
    const rememberTrigger = event => {
      const element = event.target.closest('[data-person],#sheLeadOpen');
      if (element) trigger = element;
    };
    document.addEventListener('click', rememberTrigger, true);
    document.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') rememberTrigger(event); }, true);
    panel?.setAttribute('role', 'dialog'); panel?.setAttribute('aria-modal', 'true');
    new MutationObserver(() => {
      if (profileModal.classList.contains('open')) {
        if (document.getElementById('modalTitle')) panel?.setAttribute('aria-labelledby', 'modalTitle');
      } else if (trigger?.isConnected) { trigger.focus(); trigger = null; }
    }).observe(profileModal, { attributes: true, attributeFilter: ['class'] });
    profileModal.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const focusable = [...profileModal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),[tabindex="0"]')].filter(element => element.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
  }
  const main = document.querySelector('main') || document.querySelector('.hero');
  if (main) {
    if (!main.id) main.id = 'she-content';
    main.tabIndex = -1;
    const skip = document.createElement('a'); skip.className = 'she-skip'; skip.href = '#' + main.id; skip.textContent = '跳到主要內容'; document.body.prepend(skip);
  }
  const pageTitles = {
    catalog: ['THE SHE SELECTION', 'Considered. Curated. SHE.', '品牌精選，為生活與事業挑選更好的可能。'],
    women: ['WOMEN WITH VISION', 'Her story. Her influence.', '女性人物・專業故事・事業影響力'],
    studio: ['THE PERSONAL EDIT', 'Your story. Your signature.', '從一張封面開始，編輯妳的故事與品牌。'],
    'manage-products': ['BUSINESS DESK', 'The business behind the beauty.', '商品、價格與刊登管理'],
  };
  if (pageTitles[page] && !document.querySelector('.she-page-heading')) {
    const [kicker, title, description] = pageTitles[page];
    let heading = document.querySelector('main > h1');
    const block = document.createElement('div'); block.className = 'she-page-heading';
    const overline = document.createElement('p'); overline.className = 'she-page-kicker'; overline.textContent = kicker;
    if (heading) heading.before(block); else main?.prepend(block);
    if (!heading) heading = document.createElement('h1');
    heading.textContent = title;
    const text = document.createElement('p'); text.textContent = description;
    block.append(overline, heading, text);
  }
  if (page === 'admin') {
    const auth = document.getElementById('auth-panel');
    const existingLayout = document.getElementById('she-auth-layout');
    const layout = existingLayout || document.createElement('div'); layout.className = 'she-auth-layout'; layout.id = 'she-auth-layout';
    const story = document.createElement('aside'); story.className = 'she-auth-story';
    story.innerHTML = '<div><p class="she-kicker">THE SHE MEMBERS CLUB</p><h2>A space<br> to <em>become.</em></h2><p>讓專業被看見，讓故事有舞台。<br>妳的下一章，從這裡開始。</p></div><div class="she-auth-story-foot">YOUR STORY. YOUR NETWORK. YOUR NEXT CHAPTER.</div>';
    if (!existingLayout) { auth.before(layout); layout.append(story, auth); }
    const observer = new MutationObserver(() => { layout.hidden = auth.classList.contains('hidden'); });
    observer.observe(auth, { attributes: true, attributeFilter: ['class'] });
    const app = document.getElementById('app');
    const heading = app.querySelector('.she-member-heading') || document.createElement('div'); heading.className = 'she-member-heading';
    heading.innerHTML = '<p class="she-kicker">THE MEMBERS EDIT</p><h1>Make it your own.</h1>';
    app.prepend(heading);
    document.getElementById('she-profile-cta')?.addEventListener('click', () => document.querySelector('[data-tab="account"]')?.click());
  }
  if (page === 'catalog') {
    const cards = document.getElementById('cards');
    const toolbar = document.createElement('div'); toolbar.className = 'she-catalog-toolbar';
    toolbar.innerHTML = '<input type="search" aria-label="搜尋品牌或產品" placeholder="搜尋品牌、產品…" autocomplete="off"><select aria-label="產品分類"><option value="">所有分類</option></select><span class="she-catalog-count" role="status" aria-live="polite"></span>';
    cards.before(toolbar);
    const search = toolbar.querySelector('input'), category = toolbar.querySelector('select'), count = toolbar.querySelector('span');
    function filter() {
      const query = search.value.trim().toLocaleLowerCase(); let total = 0;
      for (const article of cards.querySelectorAll('article')) {
        const matches = (!query || article.textContent.toLocaleLowerCase().includes(query)) && (!category.value || article.querySelector('.chip')?.textContent === category.value);
        article.hidden = !matches; if (matches) total++;
      }
      count.textContent = `${total} 項精選`;
      let empty = document.getElementById('she-no-products');
      if (!total && cards.querySelector('article')) {
        if (!empty) { empty = document.createElement('p'); empty.id = 'she-no-products'; empty.className = 'she-empty-state'; empty.textContent = '找不到符合的產品，試試其他關鍵字或分類。'; cards.append(empty); }
      } else if (empty) empty.remove();
    }
    function refresh() {
      const existing = new Set([...category.options].map(option => option.value));
      for (const tag of cards.querySelectorAll('.chip')) if (tag.textContent && !existing.has(tag.textContent)) { const option = document.createElement('option'); option.value = option.textContent = tag.textContent; category.append(option); existing.add(tag.textContent); }
      filter();
    }
    // Observe new product elements; filtering only changes attributes and cannot loop this observer.
    new MutationObserver(records => { if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1 && n.tagName === 'ARTICLE'))) refresh(); }).observe(cards, { childList: true });
    search.addEventListener('input', filter); category.addEventListener('change', filter); refresh();
  }
  if (page === 'women') {
    const cards = document.getElementById('cards');
    const empty = () => {
      if (cards.dataset.emptyDecorated || cards.querySelector('article') || cards.textContent.includes('讀取精選')) return;
      const text = cards.textContent, failed = text.startsWith('專頁讀取失敗'); cards.dataset.emptyDecorated = 'true'; cards.classList.add('she-empty-state');
      const p = document.createElement('p'); p.textContent = failed ? '暫時無法載入人物故事，請稍後再試。' : text;
      const link = document.createElement('a'); link.className = 'she-text-link'; link.href = failed ? '/' : '/studio/'; link.textContent = failed ? '回到 SHE 首頁 ↗' : '開始編輯我的故事 ↗'; cards.replaceChildren(p, link);
    };
    new MutationObserver(empty).observe(cards, { childList: true }); empty();
  }
  if (page === 'people') {
    const name = document.getElementById('name');
    const empty = () => {
      if (!name.textContent.includes('找不到') || document.getElementById('she-people-return')) return;
      const link = document.createElement('a'); link.id = 'she-people-return'; link.className = 'she-text-link'; link.href = '/women/'; link.textContent = '返回女性人物 ↗'; document.querySelector('#main .body')?.append(link);
    };
    new MutationObserver(empty).observe(name, { childList: true }); empty();
  }
  if (page === 'studio' || page === 'manage-products') {
    const prompt = document.createElement('div'); prompt.className = 'she-login-prompt'; prompt.hidden = true;
    prompt.innerHTML = '<span>登入後，即可繼續使用會員服務。</span><a class="she-text-link" href="/admin/?next=' + encodeURIComponent('/' + page + '/') + '">登入並繼續 ↗</a>';
    const status = document.getElementById('status'); status?.after(prompt);
    const refresh = () => { prompt.hidden = !/請先|尚未登入|未登入/.test(status?.textContent || ''); };
    if (status) new MutationObserver(refresh).observe(status, { childList: true }); refresh();
  }
  const oldFooter = document.querySelector('body > footer:not(.she-footer)');
  if (oldFooter) oldFooter.classList.add('she-original-footer');
  if (page === 'home') {
    for (const node of document.querySelectorAll('body > a[style], body > aside[style], body > div[style]')) {
      if ((node.tagName === 'A' && node.getAttribute('href') === '/admin/' && node.style.position === 'fixed') || node.textContent.includes('SHE STORIES') || node.textContent.includes('SHE SELECTED')) node.classList.add('she-legacy-promo');
    }
  }
  const footer = document.querySelector('.she-footer') || document.createElement('footer'); footer.className = 'she-footer';
  footer.innerHTML = '<div class="she-footer-top"><div><a class="she-footer-brand" href="/">SHE</a><p class="she-footer-tagline">Style. Her. Empire.</p><p class="she-footer-label">THE ENTREPRENEUR EDIT</p></div><div><p class="she-footer-label">EXPLORE</p><nav class="she-footer-links" aria-label="探索 SHE"><a href="/women/">女性人物</a><a href="/catalog/">品牌精選</a><a href="/studio/">創作專頁</a></nav></div><div><p class="she-footer-label">CONNECT</p><nav class="she-footer-links" aria-label="聯絡與會員"><a href="/admin/">會員中心</a><a href="https://line.me/R/ti/p/@673opbay" target="_blank" rel="noopener noreferrer">官方 LINE ↗</a><a href="/policies/">會員條款與資料使用</a></nav></div></div><div class="she-footer-bottom"><span>SHE · 女性時尚與事業平台</span><span>A SELF COMMUNITY</span></div><div class="she-footer-tools"></div>';
  const tools = footer.querySelector('.she-footer-tools');
  for (const selector of ['.read-controls', '.demo-label']) { const node = document.querySelector(selector); if (node) tools.append(node); }
  document.body.append(footer);
  const top = document.createElement('button'); top.className = 'she-back-top'; top.type = 'button'; top.textContent = '↑'; top.setAttribute('aria-label', '回到頁面頂端');
  top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
  document.body.append(top);
  window.addEventListener('scroll', () => top.classList.toggle('is-visible', window.scrollY > 700), { passive: true });
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.remove('is-pending'); observer.unobserve(entry.target); } }, { rootMargin: '0px 0px 60px 0px', threshold: .03 });
    for (const element of document.querySelectorAll('.section-top,.team-card,.brand-card')) if (element.getBoundingClientRect().top > innerHeight) { element.classList.add('she-reveal', 'is-pending'); observer.observe(element); }
  }
})();
