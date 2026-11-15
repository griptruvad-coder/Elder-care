/* =========================================================
   ApnaSa — accounts: login / signup, family, companion and admin dashboards.
   Uses helpers from app.js (pages, pageTitles, PH, img, plans, onCleanup).
   ========================================================= */

/* ---------- helpers ---------- */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rupees = paise => '₹' + (Number(paise || 0) / 100).toLocaleString('en-IN');
const when = d => {
  if (!d) return '';
  const dt = new Date(d), diff = (Date.now() - dt) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + dt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};
const PLAN_LABEL = { basic: 'Basic', premium: 'Premium', super_premium: 'Super Premium' };
const PLAN_PRICE = { basic: 599900, premium: 799900, super_premium: 1199900 };
const MOOD = { great: ['😄', 'Bahut khush'], good: ['🙂', 'Achha din'], okay: ['😐', 'Theek-thaak'], low: ['😔', 'Thoda udaas'] };
const STATUS = {
  active: ['Active', 'ok'], authenticated: ['Starting', 'ok'], created: ['Payment pending', 'warn'], pending: ['Payment retrying', 'warn'],
  halted: ['Payment failed', 'bad'], cancel_requested: ['Ends this month', 'warn'], cancelled: ['Cancelled', 'muted'], completed: ['Completed', 'muted']
};
const badge = s => { const [t, c] = STATUS[s] || [s, 'muted']; return `<span class="badge ${c}">${esc(t)}</span>`; };

async function api(method, path, body) {
  const res = await fetch('/api' + path, {
    method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Something went wrong. Please try again.'); e.status = res.status; throw e; }
  return data;
}

function toast(msg, type = 'ok') {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.append(box); }
  const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = msg;
  box.append(t); setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3700);
}

window.burstPetals = function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div'); layer.className = 'burst'; layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 36; i++) {
    const p = document.createElement('i');
    const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 260;
    p.style.setProperty('--x', `${Math.cos(a) * d}px`); p.style.setProperty('--y', `${Math.sin(a) * d - 120}px`);
    p.style.setProperty('--r', `${Math.random() * 720 - 360}deg`); p.style.animationDelay = `${Math.random() * 120}ms`;
    layer.append(p);
  }
  document.body.append(layer); setTimeout(() => layer.remove(), 1900);
};

function countUp(root) {
  root.querySelectorAll('[data-count]').forEach(el => {
    const target = Number(el.dataset.count), money = el.dataset.money === '1';
    const fmt = n => money ? rupees(n) : Math.round(n).toLocaleString('en-IN');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(target); return; }
    const start = performance.now(), dur = 1100;
    const step = t => { const k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(target * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

function modal(html, { wide = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><button class="modal-x" aria-label="Close">×</button>${html}</div>`;
  const close = () => { wrap.classList.add('closing'); setTimeout(() => wrap.remove(), 260); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.modal-x')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(wrap);
  setTimeout(() => wrap.querySelector('input,select,textarea,button:not(.modal-x)')?.focus(), 50);
  return { el: wrap, close };
}

function loadScript(src) {
  return new Promise((ok, fail) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = () => fail(new Error('Could not load ' + src)); document.head.append(s);
  });
}

const formData = form => Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
async function busy(btn, fn) {
  btn.disabled = true; btn.classList.add('loading');
  try { return await fn(); } finally { btn.disabled = false; btn.classList.remove('loading'); }
}

/* ---------- session ---------- */
const session = { user: null, config: {}, ready: null };
session.ready = Promise.all([
  api('GET', '/auth/me').then(r => { session.user = r.user; }).catch(() => {}),
  api('GET', '/config').then(c => { session.config = c; }).catch(() => {})
]).then(updateHeader);

function updateHeader() {
  const a = document.querySelector('#navAccount'); if (!a) return;
  const u = session.user;
  if (u) {
    const initial = esc((u.name || '?').trim()[0].toUpperCase());
    a.href = '#dashboard';
    a.innerHTML = u.avatarUrl ? `<img class="nav-avatar" src="${esc(u.avatarUrl)}" alt="" referrerpolicy="no-referrer">Dashboard` : `<span class="nav-avatar">${initial}</span>Dashboard`;
  } else { a.href = '#login'; a.textContent = 'Login'; }
}

async function logout() {
  await api('POST', '/auth/logout').catch(() => {});
  session.user = null; updateHeader(); toast('Logged out. Phir milenge! 👋'); location.hash = '#home';
}

/* ---------- LOGIN / SIGNUP page ---------- */
pages.login = () => `
<section class="auth wrap">
  <div class="auth-art reveal">
    ${img(PH.beads, { lazy: false })}
    <div class="auth-quote"><span class="hand">“Ab beta roz ki khabar padh leta hai.”</span><small>— the peace of mind ApnaSa brings</small></div>
  </div>
  <div class="auth-card reveal" style="--d:120ms">
    <span class="eyebrow">WELCOME TO THE APNASA FAMILY</span>
    <h1 class="auth-title" id="authTitle">Namaste! 🙏</h1>
    <p id="authSub">Log in to see your parent’s daily updates and manage their care.</p>
    <div class="auth-tabs" role="tablist">
      <button role="tab" data-mode="login" class="on">Log in</button>
      <button role="tab" data-mode="signup">Create account</button>
      <span class="tab-pill" aria-hidden="true"></span>
    </div>
    <div id="googleBox" class="google-box"></div>
    <div class="or" id="orLine"><span>or with email</span></div>
    <form id="authForm" novalidate>
      <label class="only-signup">Your name<input name="name" autocomplete="name" placeholder="e.g. Riya Sharma"></label>
      <label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label>
      <label class="only-signup">Phone (WhatsApp)<input name="phone" type="tel" autocomplete="tel" placeholder="+91 98xxxxxxx"></label>
      <label>Password<span class="pw"><input name="password" type="password" autocomplete="current-password" required minlength="8" placeholder="At least 8 characters"><button type="button" class="pw-eye" aria-label="Show password">👁</button></span></label>
      <div class="form-error" id="authError" role="alert"></div>
      <button class="button full big" type="submit" id="authBtn">Log in →</button>
    </form>
    <p class="tiny center">Companions: use the email your coordinator registered.</p>
  </div>
</section>`;
pageTitles.login = 'Log in';

function setupLogin(query) {
  const params = new URLSearchParams(query);
  const next = params.get('next') || 'dashboard';
  const card = app.querySelector('.auth-card'), form = app.querySelector('#authForm');
  let mode = 'login';
  const setMode = m => {
    mode = m;
    card.classList.toggle('signup', m === 'signup');
    app.querySelectorAll('.auth-tabs button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    app.querySelector('#authTitle').textContent = m === 'signup' ? 'Chaliye, shuru karein ✨' : 'Namaste! 🙏';
    app.querySelector('#authSub').textContent = m === 'signup' ? 'Create a free account. You can add your parents and choose a plan after this.' : 'Log in to see your parent’s daily updates and manage their care.';
    app.querySelector('#authBtn').textContent = m === 'signup' ? 'Create my account →' : 'Log in →';
    form.password.autocomplete = m === 'signup' ? 'new-password' : 'current-password';
    app.querySelector('#authError').textContent = '';
  };
  app.querySelectorAll('.auth-tabs button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  if (params.get('mode') === 'signup') setMode('signup');
  if (params.get('plan')) app.querySelector('#authSub').textContent = `Log in or create an account to start the ${PLAN_LABEL[params.get('plan')] || ''} plan.`;
  app.querySelector('.pw-eye').addEventListener('click', e => { const i = form.password; i.type = i.type === 'password' ? 'text' : 'password'; e.currentTarget.classList.toggle('on'); });

  const done = user => {
    session.user = user; updateHeader(); window.burstPetals();
    toast(`Welcome${mode === 'signup' ? '' : ' back'}, ${user.name.split(' ')[0]}! ♡`);
    location.hash = '#' + next;
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = app.querySelector('#authError'); err.textContent = '';
    const d = formData(form);
    if (mode === 'signup' && (!d.name || d.name.length < 2)) { err.textContent = 'Please enter your name.'; card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 500); return; }
    try {
      const r = await busy(app.querySelector('#authBtn'), () => api('POST', mode === 'signup' ? '/auth/signup' : '/auth/login',
        mode === 'signup' ? d : { email: d.email, password: d.password }));
      done(r.user);
    } catch (ex) { err.textContent = ex.message; card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 500); }
  });

  session.ready.then(async () => {
    if (session.user) { location.hash = '#' + next; return; }
    const cid = session.config.googleClientId;
    if (!cid) { app.querySelector('#googleBox').remove(); app.querySelector('#orLine').remove(); return; }
    try {
      await loadScript('https://accounts.google.com/gsi/client');
      google.accounts.id.initialize({
        client_id: cid,
        callback: async ({ credential }) => {
          try { const r = await api('POST', '/auth/google', { credential }); done(r.user); }
          catch (ex) { app.querySelector('#authError').textContent = ex.message; }
        }
      });
      const box = app.querySelector('#googleBox');
      if (box) google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: Math.min(360, box.clientWidth || 320) });
    } catch { app.querySelector('#googleBox')?.remove(); app.querySelector('#orLine')?.remove(); }
  });
}

/* ---------- DASHBOARD (shell) ---------- */
pages.dashboard = () => `<section class="dash wrap"><div id="dashRoot">
  <div class="dash-head skeleton-line w40"></div><div class="dash-sub skeleton-line w60"></div>
  <div class="dash-grid">${'<div class="skeleton-card"></div>'.repeat(3)}</div></div></section>`;
pageTitles.dashboard = 'My dashboard';

const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Suprabhat' : h < 17 ? 'Namaste' : 'Shubh sandhya'; };
const dashHead = (title, sub, extra = '') => `<div class="dash-top pop" style="--d:0ms">
  <div><span class="eyebrow">${esc(sub)}</span><h1 class="dash-title">${title}</h1></div>
  <div class="dash-actions">${extra}<button class="button outline small" id="logoutBtn">Log out</button></div></div>`;

async function setupDashboard(query) {
  await session.ready;
  // Always re-check the session: an admin may have changed this person's role since login.
  try { session.user = (await api('GET', '/auth/me')).user; } catch { /* keep what we had */ }
  updateHeader();
  if (!session.user) { location.hash = '#login?next=' + encodeURIComponent('dashboard' + (query ? '?' + query : '')) + (query ? '&' + query : ''); return; }
  const root = app.querySelector('#dashRoot'); if (!root) return;
  const role = session.user.role;
  try {
    if (role === 'admin') await adminDash(root, query);
    else if (role === 'companion') await companionDash(root);
    else await familyDash(root, query);
  } catch (ex) {
    if (ex.status === 401) { session.user = null; updateHeader(); location.hash = '#login'; return; }
    root.innerHTML = `<div class="empty pop"><b>Could not load your dashboard.</b><p>${esc(ex.message)}</p><button class="button" id="retryBtn">Try again</button></div>`;
    root.querySelector('#retryBtn').addEventListener('click', () => setupDashboard(query));
  }
  app.querySelector('#logoutBtn')?.addEventListener('click', logout);
}

/* ---------- FAMILY dashboard ---------- */
async function familyDash(root, query) {
  const params = new URLSearchParams(query);
  const [{ parents }, { subscriptions }] = await Promise.all([api('GET', '/parents'), api('GET', '/subscriptions')]);
  const first = esc(session.user.name.split(' ')[0]);

  root.innerHTML = `${dashHead(`${greet()}, ${first} <span class="wave">👋</span>`, 'YOUR FAMILY DASHBOARD', `<button class="button small" id="addParentBtn">+ Add parent</button>`)}
  ${parents.length ? '' : `<div class="welcome-card pop" style="--d:100ms">
      ${diya()}<div><h2>Pehla kadam: apne Maa-Papa ke baare mein bataiye.</h2>
      <p>Add your parent’s details, choose a plan, and we’ll introduce their companion. It takes 2 minutes.</p>
      <button class="button big" id="addParentBtn2">Add my parent →</button></div></div>`}
  <div class="parent-grid">${parents.map((p, i) => parentCard(p, i)).join('')}</div>
  <div class="dash-cols">
    <section class="panel pop" style="--d:200ms" id="notesPanel">
      <h3>Daily updates</h3>
      ${parents.length ? `<div class="chip-row" id="noteTabs">${parents.map((p, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-pid="${p.id}">${esc(p.name)}</button>`).join('')}</div><div id="notesList" class="notes-list"></div>`
      : '<p class="muted">Updates from the companion will appear here after visits begin.</p>'}
    </section>
    <section class="panel pop" style="--d:280ms">
      <h3>Plans &amp; payments</h3>
      ${subscriptions.length ? `<ul class="sub-list">${subscriptions.map(s => `<li>
        <div><b>${esc(PLAN_LABEL[s.plan])}</b> for ${esc(s.parent_name)}<small>${rupees(s.amount_paise)}/month${s.current_end ? ' · renews ' + new Date(s.current_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</small></div>
        <div class="sub-right">${badge(s.status)}${['active', 'authenticated', 'pending', 'halted'].includes(s.status) ? `<button class="linkish" data-cancel="${s.id}">Cancel</button>` : ''}</div></li>`).join('')}</ul>`
      : `<p class="muted">No plan yet. Plans start at ₹5,999/month.</p><a class="button outline small" href="#plans">Compare plans</a>`}
    </section>
  </div>`;

  root.querySelectorAll('#addParentBtn, #addParentBtn2').forEach(b => b.addEventListener('click', () => parentForm(null, query)));
  root.querySelectorAll('[data-plan-for]').forEach(b => b.addEventListener('click', () => planPicker(parents, Number(b.dataset.planFor))));
  root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => parentForm(parents.find(p => p.id === Number(b.dataset.edit)), query)));
  root.querySelectorAll('[data-notes]').forEach(b => b.addEventListener('click', () => { showNotes(Number(b.dataset.notes)); root.querySelector('#notesPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  root.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Cancel this plan? Care continues until the end of the current paid month.')) return;
    try { await busy(b, () => api('POST', `/subscriptions/${b.dataset.cancel}/cancel`)); toast('Plan will end after this month.'); setupDashboard(query); }
    catch (ex) { toast(ex.message, 'bad'); }
  }));
  const tabs = root.querySelectorAll('#noteTabs .chip');
  tabs.forEach(t => t.addEventListener('click', () => showNotes(Number(t.dataset.pid))));
  async function showNotes(pid) {
    tabs.forEach(t => t.classList.toggle('on', Number(t.dataset.pid) === pid));
    const list = root.querySelector('#notesList'); if (!list) return;
    list.innerHTML = '<div class="skeleton-line"></div><div class="skeleton-line w60"></div>';
    try {
      const { notes } = await api('GET', `/parents/${pid}/notes`);
      list.innerHTML = notes.length ? notes.map((n, i) => noteItem(n, i)).join('')
        : '<div class="empty small"><span class="big-emoji">🌱</span><p>No visit notes yet. Once the companion starts, every visit shows up here.</p></div>';
    } catch (ex) { list.innerHTML = `<p class="muted">${esc(ex.message)}</p>`; }
  }
  if (parents.length) showNotes(parents[0].id);
  countUp(root);

  // Came here from a "Choose plan" button on the website.
  const wanted = params.get('plan');
  if (wanted && PLAN_LABEL[wanted]) {
    history.replaceState(null, '', '#dashboard');
    if (!parents.length) { toast('Pehle apne parent ki details add kijiye 🙂'); parentForm(null, '', wanted); }
    else planPicker(parents, null, wanted);
  }
}

function parentCard(p, i) {
  const s = p.subscription, active = s && ['active', 'authenticated', 'pending', 'cancel_requested'].includes(s.status);
  const last = p.last_note;
  return `<article class="parent-card pop" style="--d:${80 + i * 90}ms">
    <div class="pc-top"><span class="pc-avatar">${esc(p.name.trim()[0] || '♡')}</span>
      <div><h3>${esc(p.name)}</h3><small>${esc(p.age)} yrs · ${esc(p.city)}</small></div>
      <button class="linkish" data-edit="${p.id}" aria-label="Edit ${esc(p.name)}">Edit</button></div>
    <div class="pc-row"><span>Plan</span>${s ? `<b>${esc(PLAN_LABEL[s.plan])}</b> ${badge(s.status)}` : '<b class="muted">Not started</b>'}</div>
    <div class="pc-row"><span>Companion</span>${p.companion_name ? `<b>${esc(p.companion_name)}</b>` : `<b class="muted">${active ? 'Being matched…' : '—'}</b>`}</div>
    ${last ? `<div class="pc-last"><span>${MOOD[last.mood]?.[0] || '📝'}</span><p>${esc(last.note.slice(0, 110))}${last.note.length > 110 ? '…' : ''}</p><small>${when(last.created_at)}</small></div>` : ''}
    <div class="pc-actions">
      ${active ? `<button class="button outline small" data-notes="${p.id}">See updates</button>` : `<button class="button small" data-plan-for="${p.id}">Start a plan →</button>`}
    </div>
  </article>`;
}

function noteItem(n, i) {
  const [emo, label] = MOOD[n.mood] || ['📝', ''];
  return `<article class="note-item pop" style="--d:${i * 70}ms">
    <span class="note-mood" title="${esc(label)}">${emo}</span>
    <div><div class="note-meta"><b>${esc(label)}</b><small>${when(n.created_at)}${n.companion_name ? ' · ' + esc(n.companion_name) : ''}</small></div>
      <p>${esc(n.note)}</p>
      <div class="chip-row">${(n.activities || []).map(a => `<span class="chip static">${esc(a)}</span>`).join('')}${n.medicines_taken === true ? '<span class="chip static ok">💊 medicines taken</span>' : n.medicines_taken === false ? '<span class="chip static warn">💊 medicines missed</span>' : ''}</div>
    </div></article>`;
}

function parentForm(p, query, thenPlan) {
  const v = k => esc(p?.[k] ?? '');
  const opt = (name, list) => `<select name="${name}"><option value="">Choose…</option>${list.map(o => `<option ${p?.[name] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  const m = modal(`<h2>${p ? 'Edit details' : 'Tell us about them'} <span class="hand">♡</span></h2>
    <form id="parentForm" class="formgrid">
      <label>Name *<input name="name" required value="${v('name')}" placeholder="e.g. Kamla Devi"></label>
      <label>Age *<input name="age" type="number" min="40" max="120" required value="${v('age')}"></label>
      <label class="full">City and area *<input name="city" required value="${v('city')}" placeholder="e.g. Lajpat Nagar, Delhi"></label>
      <label class="full">Home address (shared only with their companion)<input name="address" value="${v('address')}"></label>
      <label>Living arrangement${opt('living', ['Alone', 'With a spouse', 'With family'])}</label>
      <label>Walking support${opt('walking', ['Walks independently', 'Uses a walker', 'Needs support'])}</label>
      <label>Preferred visit time${opt('preferred_time', ['Morning', 'Afternoon', 'Evening'])}</label>
      <label>Language<input name="language" value="${v('language')}" placeholder="Hindi, Punjabi…"></label>
      <label class="full">What makes them happy? Anything we should know?<textarea name="notes" placeholder="Favourite bhajans, morning walk route, chai with less sugar…">${v('notes')}</textarea></label>
      <div class="form-error full" role="alert"></div>
      <button class="button full big" type="submit">${p ? 'Save changes' : 'Add parent →'}</button>
    </form>`);
  const form = m.el.querySelector('#parentForm');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const d = formData(form);
      const r = await busy(form.querySelector('button[type=submit]'), () => p ? api('PUT', `/parents/${p.id}`, d) : api('POST', '/parents', d));
      m.close(); toast(p ? 'Details saved.' : `${d.name} added to your family ♡`);
      if (!p) window.burstPetals();
      await setupDashboard('');
      if (thenPlan && !p) { const { parents } = await api('GET', '/parents'); planPicker(parents, r.id, thenPlan); }
    } catch (ex) { form.querySelector('.form-error').textContent = ex.message; }
  });
}

function planPicker(parents, parentId, plan) {
  const eligible = parents.filter(p => !(p.subscription && ['active', 'authenticated', 'pending', 'cancel_requested'].includes(p.subscription.status)));
  if (!eligible.length) { toast('All your parents already have a plan 🙂'); return; }
  let chosen = plan && PLAN_LABEL[plan] ? plan : 'premium';
  const pid = parentId || eligible[0].id;
  const m = modal(`<h2>Choose a plan <span class="hand">♡</span></h2>
    <label class="full">For<select id="ppParent">${eligible.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
    <div class="plan-pick">${Object.keys(PLAN_LABEL).map(k => `<button class="pp ${k === chosen ? 'on' : ''}" data-k="${k}"><b>${PLAN_LABEL[k]}</b><span>${rupees(PLAN_PRICE[k])}<small>/month</small></span>
      <small>${plans.find(x => x.name === PLAN_LABEL[k])?.desc || ''}</small></button>`).join('')}</div>
    <p class="tiny">Monthly auto-pay via Razorpay (UPI, card or netbanking). Cancel anytime; care continues till the paid month ends.</p>
    <div class="form-error" role="alert"></div>
    <button class="button full big" id="payBtn">Continue to payment →</button>
    ${session.config.paymentsEnabled ? '' : '<p class="tiny center muted">Online payment is being set up. You can still send an enquiry and our team will help.</p>'}`, { wide: true });
  m.el.querySelectorAll('.pp').forEach(b => b.addEventListener('click', () => { chosen = b.dataset.k; m.el.querySelectorAll('.pp').forEach(x => x.classList.toggle('on', x === b)); }));
  m.el.querySelector('#payBtn').addEventListener('click', async e => {
    const btn = e.currentTarget, errBox = m.el.querySelector('.form-error'); errBox.textContent = '';
    try {
      const parentIdNow = Number(m.el.querySelector('#ppParent').value);
      const sub = await busy(btn, () => api('POST', '/subscriptions', { plan: chosen, parentId: parentIdNow }));
      await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      m.close();
      const rz = new Razorpay({
        key: sub.keyId,
        subscription_id: sub.subscriptionId,
        name: 'ApnaSa',
        description: `${sub.planName} care plan — monthly`,
        prefill: sub.prefill,
        theme: { color: '#7a2e1d' },
        handler: async resp => {
          try {
            await api('POST', '/subscriptions/verify', resp);
            celebrate(sub.planName);
          } catch (ex) { toast(ex.message, 'bad'); }
          setupDashboard('');
        },
        modal: { ondismiss: () => toast('Payment not completed. You can try again anytime.', 'warn') }
      });
      rz.on('payment.failed', r => toast(r.error?.description || 'Payment failed. Please try again.', 'bad'));
      rz.open();
    } catch (ex) { errBox.textContent = ex.message; }
  });
}

function celebrate(planName) {
  window.burstPetals();
  const m = modal(`<div class="celebrate">${diya()}<h2>Badhai ho! 🎉</h2>
    <p>Your <b>${esc(planName)}</b> plan is active. Our care coordinator will call you within one working day to introduce the companion.</p>
    <button class="button big" id="okBtn">Wonderful ♡</button></div>`);
  m.el.querySelector('#okBtn').addEventListener('click', m.close);
}

/* ---------- COMPANION dashboard ---------- */
async function companionDash(root) {
  const { parents } = await api('GET', '/companion/parents');
  const done = parents.filter(p => p.visited_today).length;
  root.innerHTML = `${dashHead(`${greet()}, ${esc(session.user.name.split(' ')[0])} 🌼`, 'COMPANION DASHBOARD')}
    <div class="progress-card pop" style="--d:80ms">
      <div class="ring" style="--p:${parents.length ? done / parents.length : 0}"><span>${done}/${parents.length}</span></div>
      <div><h3>Aaj ki visits</h3><p>${parents.length ? (done === parents.length ? 'Sab visits ho gayi! Shabash 👏' : `${parents.length - done} visit note${parents.length - done > 1 ? 's' : ''} baaki hain.`) : 'No parents assigned yet. Your coordinator will assign them soon.'}</p></div>
    </div>
    <div class="parent-grid">${parents.map((p, i) => `<article class="parent-card pop ${p.visited_today ? 'done' : ''}" style="--d:${120 + i * 90}ms">
      <div class="pc-top"><span class="pc-avatar">${esc(p.name.trim()[0])}</span><div><h3>${esc(p.name)}</h3><small>${esc(p.age)} yrs · ${esc(p.preferred_time || 'Any time')}</small></div>
        ${p.visited_today ? '<span class="badge ok">✓ Done</span>' : ''}</div>
      <div class="pc-row"><span>Address</span><b>${esc(p.address || p.city)}</b></div>
      ${p.walking ? `<div class="pc-row"><span>Walking</span><b>${esc(p.walking)}</b></div>` : ''}
      ${p.language ? `<div class="pc-row"><span>Language</span><b>${esc(p.language)}</b></div>` : ''}
      ${p.notes ? `<p class="pc-notes">“${esc(p.notes)}”</p>` : ''}
      <div class="pc-row"><span>Family</span><b>${esc(p.family_name)}${p.family_phone ? ` · <a href="tel:${esc(p.family_phone)}">${esc(p.family_phone)}</a>` : ''}</b></div>
      <div class="pc-actions"><button class="button small ${p.visited_today ? 'outline' : ''}" data-write="${p.id}">${p.visited_today ? 'Add another note' : 'Write visit note →'}</button>
        <button class="linkish" data-history="${p.id}">History</button></div>
    </article>`).join('')}</div>`;
  root.querySelectorAll('[data-write]').forEach(b => b.addEventListener('click', () => noteForm(parents.find(p => p.id === Number(b.dataset.write)))));
  root.querySelectorAll('[data-history]').forEach(b => b.addEventListener('click', async () => {
    const p = parents.find(x => x.id === Number(b.dataset.history));
    const { notes } = await api('GET', `/parents/${p.id}/notes`);
    modal(`<h2>${esc(p.name)} — past visits</h2><div class="notes-list">${notes.length ? notes.map(noteItem).join('') : '<p class="muted">No notes yet.</p>'}</div>`, { wide: true });
  }));
}

function noteForm(p) {
  const acts = session.config.activities || [];
  const m = modal(`<h2>Visit note for ${esc(p.name)}</h2>
    <form id="noteForm">
      <p class="label">Aaj ka mood kaisa tha?</p>
      <div class="mood-pick">${Object.entries(MOOD).map(([k, [e, l]]) => `<label><input type="radio" name="mood" value="${k}" ${k === 'good' ? 'checked' : ''}><span><i>${e}</i>${l}</span></label>`).join('')}</div>
      <p class="label">Kya kiya saath mein?</p>
      <div class="chip-row">${acts.map(a => `<label class="chip toggle"><input type="checkbox" name="activities" value="${esc(a)}"><span>${esc(a)}</span></label>`).join('')}</div>
      <p class="label">Dawai?</p>
      <div class="seg"><label><input type="radio" name="med" value="yes"><span>💊 Li</span></label><label><input type="radio" name="med" value="no"><span>Nahi li</span></label><label><input type="radio" name="med" value="na" checked><span>Lagu nahi</span></label></div>
      <label class="full">Family ke liye note *<textarea name="note" required minlength="5" placeholder="Aaj park tak walk ki, phir chai pe purani baatein… Maa ne kaha beta ko pyaar dena."></textarea></label>
      <div class="form-error" role="alert"></div>
      <button class="button full big" type="submit">Send to family →</button>
    </form>`, { wide: true });
  const form = m.el.querySelector('#noteForm');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const med = fd.get('med');
    try {
      await busy(form.querySelector('button[type=submit]'), () => api('POST', '/companion/notes', {
        parentId: p.id, mood: fd.get('mood'), activities: fd.getAll('activities'),
        medicinesTaken: med === 'yes' ? true : med === 'no' ? false : null, note: String(fd.get('note') || '').trim()
      }));
      m.close(); window.burstPetals(); toast(`Note sent to ${p.name}'s family ♡`); setupDashboard('');
    } catch (ex) { form.querySelector('.form-error').textContent = ex.message; }
  });
}

/* ---------- ADMIN dashboard ---------- */
async function adminDash(root, query) {
  const tab = new URLSearchParams(query).get('tab') || 'enquiries';
  const { stats } = await api('GET', '/admin/stats');
  const tiles = [
    ['New enquiries', stats.new_enquiries, '📨'], ['Active plans', stats.active_subscriptions, '🌼'],
    ['Monthly revenue', stats.monthly_revenue_paise, '₹', true], ['Parents', stats.parents, '👵'],
    ['Need a companion', stats.unassigned, '🧭'], ['Visit notes (7 days)', stats.notes_this_week, '📝']
  ];
  root.innerHTML = `${dashHead(`${greet()}, ${esc(session.user.name.split(' ')[0])}`, 'ADMIN · APNASA HQ')}
    <div class="stat-grid">${tiles.map((t, i) => `<div class="stat pop" style="--d:${i * 70}ms"><span class="stat-i">${t[2]}</span><b data-count="${t[1]}" ${t[3] ? 'data-money="1"' : ''}>0</b><small>${t[0]}</small></div>`).join('')}</div>
    <div class="admin-tabs pop" style="--d:420ms" role="tablist">${[['enquiries', 'Enquiries'], ['parents', 'Parents & companions'], ['users', 'People'], ['subscriptions', 'Payments']].map(([k, l]) => `<a role="tab" class="${k === tab ? 'on' : ''}" href="#dashboard?tab=${k}">${l}</a>`).join('')}</div>
    <div id="adminBody" class="panel pop" style="--d:480ms"><div class="skeleton-line"></div><div class="skeleton-line w60"></div></div>`;
  countUp(root);
  const body = root.querySelector('#adminBody');
  const reload = () => setupDashboard(query);

  if (tab === 'enquiries') {
    const { enquiries } = await api('GET', '/admin/enquiries');
    body.innerHTML = enquiries.length ? `<div class="table-wrap"><table><thead><tr><th>When</th><th>Parent</th><th>Contact</th><th>Plan</th><th>Status</th></tr></thead><tbody>
      ${enquiries.map(q => { const d = q.data || {}; return `<tr class="${q.status === 'new' ? 'is-new' : ''}">
        <td>${when(q.created_at)}</td>
        <td><b>${esc(d['Parent’s name'] || '—')}</b><small>${esc([d['Parent’s age'] && d['Parent’s age'] + ' yrs', d['City and area']].filter(Boolean).join(' · '))}</small>
          <button class="linkish" data-view="${q.id}">View all</button></td>
        <td>${esc(d['Your name'] || '')}<small>${d['Phone number'] ? `<a href="tel:${esc(d['Phone number'])}">${esc(d['Phone number'])}</a>` : ''} ${esc(d['Email address'] || '')}</small></td>
        <td>${esc(d['Preferred plan'] || '—')}</td>
        <td><select data-enq="${q.id}">${['new', 'contacted', 'converted', 'closed'].map(s => `<option ${s === q.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`; }).join('')}
      </tbody></table></div>` : '<div class="empty small"><span class="big-emoji">📭</span><p>No enquiries yet.</p></div>';
    body.querySelectorAll('[data-enq]').forEach(s => s.addEventListener('change', async () => {
      try { await api('PATCH', `/admin/enquiries/${s.dataset.enq}`, { status: s.value }); toast('Status updated'); s.closest('tr').classList.toggle('is-new', s.value === 'new'); }
      catch (ex) { toast(ex.message, 'bad'); }
    }));
    body.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
      const q = enquiries.find(x => x.id === Number(b.dataset.view));
      modal(`<h2>Enquiry #${q.id}</h2><dl class="kv">${Object.entries(q.data).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`, { wide: true });
    }));
  }

  if (tab === 'parents') {
    const [{ parents }, { users }] = await Promise.all([api('GET', '/admin/parents'), api('GET', '/admin/users')]);
    const comps = users.filter(u => u.role === 'companion' && u.is_active);
    body.innerHTML = parents.length ? `${comps.length ? '' : '<p class="notice">No companions yet. Go to <a href="#dashboard?tab=users">People</a> and change a user’s role to <b>companion</b>.</p>'}
      <div class="table-wrap"><table><thead><tr><th>Parent</th><th>Family</th><th>Plan</th><th>Last visit</th><th>Companion</th></tr></thead><tbody>
      ${parents.map(p => `<tr class="${p.companion_id ? '' : 'is-new'}"><td><b>${esc(p.name)}</b><small>${esc(p.age)} yrs · ${esc(p.city)}${p.preferred_time ? ' · ' + esc(p.preferred_time) : ''}</small></td>
        <td>${esc(p.family_name)}<small>${esc(p.family_phone || p.family_email)}</small></td>
        <td>${p.subscription ? `${esc(PLAN_LABEL[p.subscription.plan])} ${badge(p.subscription.status)}` : '<span class="muted">—</span>'}</td>
        <td>${p.last_visit ? when(p.last_visit) : '<span class="muted">never</span>'}</td>
        <td><select data-assign="${p.id}"><option value="">Not assigned</option>${comps.map(c => `<option value="${c.id}" ${c.id === p.companion_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty small"><span class="big-emoji">👵</span><p>No parents added yet. Families add parents from their dashboard.</p></div>';
    body.querySelectorAll('[data-assign]').forEach(s => s.addEventListener('change', async () => {
      try { await api('PATCH', `/admin/parents/${s.dataset.assign}/companion`, { companionId: s.value ? Number(s.value) : null }); toast('Companion updated ♡'); s.closest('tr').classList.toggle('is-new', !s.value); }
      catch (ex) { toast(ex.message, 'bad'); }
    }));
  }

  if (tab === 'users') {
    const { users } = await api('GET', '/admin/users');
    body.innerHTML = `<p class="muted tiny">To add a companion: ask them to create an account, then change their role here to <b>companion</b>.</p>
      <div class="table-wrap"><table><thead><tr><th>Name</th><th>Email / phone</th><th>Joined</th><th>Role</th><th>Active</th></tr></thead><tbody>
      ${users.map(u => `<tr><td><b>${esc(u.name)}</b><small>${u.role === 'family' ? u.parent_count + ' parent(s)' : u.role === 'companion' ? u.assigned_count + ' assigned' : ''}</small></td>
        <td>${esc(u.email)}<small>${esc(u.phone || '')}</small></td><td>${when(u.created_at)}</td>
        <td>${u.id === session.user.id ? '<b>admin (you)</b>' : `<select data-role="${u.id}">${['family', 'companion', 'admin'].map(r => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select>`}</td>
        <td>${u.id === session.user.id ? '✓' : `<label class="switch"><input type="checkbox" data-active="${u.id}" ${u.is_active ? 'checked' : ''}><span></span></label>`}</td></tr>`).join('')}
      </tbody></table></div>`;
    body.querySelectorAll('[data-role]').forEach(s => s.addEventListener('change', async () => {
      if (s.value === 'admin' && !confirm('Make this person an admin? They will see all customer data.')) { reload(); return; }
      try { await api('PATCH', `/admin/users/${s.dataset.role}`, { role: s.value }); toast('Role updated'); } catch (ex) { toast(ex.message, 'bad'); reload(); }
    }));
    body.querySelectorAll('[data-active]').forEach(c => c.addEventListener('change', async () => {
      try { await api('PATCH', `/admin/users/${c.dataset.active}`, { isActive: c.checked }); toast(c.checked ? 'Account enabled' : 'Account disabled'); } catch (ex) { toast(ex.message, 'bad'); reload(); }
    }));
  }

  if (tab === 'subscriptions') {
    const { subscriptions } = await api('GET', '/admin/subscriptions');
    body.innerHTML = subscriptions.length ? `<div class="table-wrap"><table><thead><tr><th>Family</th><th>Parent</th><th>Plan</th><th>Status</th><th>Renews</th><th>Razorpay ID</th></tr></thead><tbody>
      ${subscriptions.map(s => `<tr><td>${esc(s.family_name)}<small>${esc(s.family_email)}</small></td><td>${esc(s.parent_name)}</td>
        <td>${esc(PLAN_LABEL[s.plan])}<small>${rupees(s.amount_paise)}/mo</small></td><td>${badge(s.status)}</td>
        <td>${s.current_end ? new Date(s.current_end).toLocaleDateString('en-IN') : '—'}</td><td><code>${esc(s.razorpay_subscription_id || '')}</code></td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty small"><span class="big-emoji">💳</span><p>No subscriptions yet.</p></div>';
  }
}

/* ---------- hook into the router in app.js ---------- */
window.afterRender = (route, query) => {
  document.body.classList.toggle('in-dash', route === 'dashboard' || route === 'login');
  document.querySelectorAll('.modal-wrap').forEach(m => m.remove());
  if (route === 'login') setupLogin(query);
  if (route === 'dashboard') setupDashboard(query);
};
