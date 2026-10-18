// 툭 — 일정 면 (메모 면과 완전히 독립: 데이터·화면·설정 모두 별도)
import * as R from './recur.mjs';

const $ = s => document.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const sv = p => `<svg class="ic" viewBox="0 0 24 24">${p}</svg>`;
const I = {
  up: sv('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  bell: sv('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  bellOn: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" fill="currentColor" stroke="none"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  check: sv('<path d="M5 12l5 5 9-10"/>'),
  trash: sv('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/>'),
  repeat: sv('<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>'),
  down: sv('<path d="M6 9l6 6 6-6"/>'),
  upc: sv('<path d="M6 15l6-6 6 6"/>'),
  sq: sv('<rect x="5" y="5" width="14" height="14" rx="2"/>'),
  key: sv('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 5l2.5 2.5M14 7l2.5 2.5"/>'),
  x: sv('<path d="M6 6l12 12M18 6L6 18"/>')
};
const REMIND = [['정시', { k: 'min', v: 0 }], ['10분', { k: 'min', v: 10 }], ['30분', { k: 'min', v: 30 }], ['1시간', { k: 'min', v: 60 }], ['전날 21시', { k: 'eve', v: '21:00' }], ['아침 8시', { k: 'morn', v: '08:00' }]];
const rk = r => r.k + ':' + r.v;

/* ---------- 저장소 (별도 DB) ---------- */
const idb = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('tuk-s', 1); r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('ev', { keyPath: 'id' }); d.createObjectStore('kv'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = (st, mode, fn) => open().then(d => new Promise((res, rej) => { const t = d.transaction(st, mode); const q = fn(t.objectStore(st)); t.oncomplete = () => res(q && 'result' in q ? q.result : undefined); t.onerror = () => rej(t.error); }));
  return { all: s => tx(s, 'readonly', o => o.getAll()), get: (s, k) => tx(s, 'readonly', o => o.get(k)), put: (s, v, k) => tx(s, 'readwrite', o => { o.put(v, k); }), putMany: (s, a) => tx(s, 'readwrite', o => { a.forEach(v => o.put(v)); }) };
})();

const S = { ev: new Map(), dirty: new Set(), srv: 0, key: '', pushing: false, showPast: false, moreOpen: false, subOk: false };
try { S.key = localStorage.getItem('tuk_key') || ''; } catch (e) {}

async function api(path, opt = {}) {
  opt.headers = Object.assign({ 'x-tuk-key': S.key }, opt.headers || {});
  const r = await fetch('/api/' + path, opt);
  if (r.status === 401) { throw new Error('401'); }
  if (!r.ok) { let m = r.status; try { m = (await r.json()).error || m; } catch (e) {} throw new Error(m); }
  return r;
}
function save(ev, quiet) {
  ev.updated = Date.now(); S.ev.set(ev.id, ev); idb.put('ev', ev);
  S.dirty.add(ev.id); idb.put('kv', [...S.dirty], 'dirty'); schedulePush();
  if (!quiet) render();
}
let pushT; function schedulePush(ms = 600) { clearTimeout(pushT); pushT = setTimeout(push, ms); }
async function push() {
  if (!S.key || S.pushing || !S.dirty.size || !navigator.onLine) return;
  S.pushing = true;
  const sent = [...S.dirty].map(id => S.ev.get(id)).filter(Boolean).map(e => ({ ...e }));
  try {
    await api('s/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: sent }) });
    sent.forEach(s => { const c = S.ev.get(s.id); if (!c || c.updated === s.updated) S.dirty.delete(s.id); });
    idb.put('kv', [...S.dirty], 'dirty');
  } catch (e) { if (e.message !== '401') console.warn('s/push', e); }
  S.pushing = false;
}
async function pull() {
  if (!S.key || !navigator.onLine) return;
  try {
    const j = await (await api('s/sync?since=' + S.srv)).json();
    const take = [];
    for (const it of j.items) { const c = S.ev.get(it.id); if (c && S.dirty.has(it.id) && c.updated > it.updated) continue; if (!c || it.updated >= c.updated) { S.ev.set(it.id, it); take.push(it); } }
    if (take.length) await idb.putMany('ev', take);
    S.srv = j.srv; idb.put('kv', S.srv, 'srv');
    if (take.length) render();
  } catch (e) { if (e.message !== '401') console.warn('s/pull', e); }
}

/* ---------- 시트 (일정 면 전용) ---------- */
let closing = false, sheetClose = null;
function openSheet(build, onClose) {
  const sh = $('#ssheet'), p = sh.querySelector('.spanel');
  closing = false; p.style.transform = ''; p.innerHTML = '<div class="sgrab"></div>'; build(p);
  sh.hidden = false; p.scrollTop = 0; sheetClose = onClose || null;
  const g = p.querySelector('.sgrab');
  g.onpointerdown = e => { e.preventDefault(); g.setPointerCapture(e.pointerId); const y0 = e.clientY; let dy = 0; p.style.transition = 'none';
    const mv = ev => { dy = Math.max(0, ev.clientY - y0); p.style.transform = `translateY(${dy}px)`; };
    const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); p.style.transition = ''; if (dy > 90) closeSheet(); else p.style.transform = ''; };
    g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); };
}
function closeSheet() {
  const sh = $('#ssheet'); if (sh.hidden || closing) return;
  closing = true; const p = sh.querySelector('.spanel'); p.style.transform = 'translateY(105%)';
  const f = sheetClose; sheetClose = null; if (f) f();
  setTimeout(() => { if (closing) { sh.hidden = true; closing = false; p.style.transform = ''; } }, 240);
}
$('#ssheet .sscrim').onclick = closeSheet;

/* ---------- 렌더 ---------- */
const now = () => Date.now();
function expand(from, to) {
  const list = [];
  for (const ev of S.ev.values()) { if (ev.deleted) continue; for (const occ of R.occurrences(ev, from, to)) list.push({ ev, occ }); }
  list.sort((a, b) => a.occ - b.occ || (a.ev.allDay ? -1 : 0) - (b.ev.allDay ? -1 : 0));
  return list;
}
function cardEl(x) {
  const { ev, occ } = x; const el = h('div', 'sc' + (ev.done ? ' done' : '') + (occ < now() && !ev.allDay ? ' past' : ''));
  const t = ev.allDay ? '' : R.fmtTime(occ);
  el.innerHTML = `<div class="st">${t ? `<span class="tm">${t}</span>` : ''}${ev.remind && ev.remind.length ? '<i class="bl"></i>' : ''}${ev.repeat && ev.repeat.f ? I.repeat : ''}</div><div class="sn">${esc(ev.title || '')}</div>`;
  el.onclick = () => openEvent(ev.id, occ);
  return el;
}
function render() {
  const main = $('#smain'); const frag = document.createDocumentFragment();
  const t0 = R.dayStart(now());
  $('#stoday').textContent = R.fmtDay(now());
  // 지난 일정 (접힘)
  const past = expand(t0 - 60 * R.DAY, t0 - 1).reverse().filter(x => !x.ev.done).slice(0, 30);
  if (past.length) {
    const b = h('button', 'spast', (S.showPast ? I.upc : I.down)); b.onclick = () => { S.showPast = !S.showPast; render(); };
    frag.append(b);
    if (S.showPast) frag.append(dayShelf(past, null, true));
  }
  const up = expand(t0, t0 + 120 * R.DAY);
  const byDay = new Map();
  for (const x of up) { const k = R.dayStart(x.occ); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(x); }
  if (!byDay.has(t0)) byDay.set(t0, []);
  [...byDay.keys()].sort((a, b) => a - b).forEach(k => frag.append(dayShelf(byDay.get(k), k)));
  main.replaceChildren(frag);
}
function dayShelf(list, dayMs, isPast) {
  const sec = h('section', 'sday' + (dayMs === R.dayStart(now()) ? ' today' : '') + (isPast ? ' dim' : ''));
  if (dayMs != null) {
    const dd = dayMs - R.dayStart(now());
    const lab = dd === 0 ? '오늘' : dd === R.DAY ? '내일' : R.fmtDay(dayMs);
    sec.append(h('div', 'shd', esc(lab)));
  }
  const row = h('div', 'srow');
  list.forEach(x => row.append(cardEl(x)));
  if (dayMs != null) { const g = h('div', 'sc ghost', '+'); g.onclick = () => openEvent(null, dayMs + 9 * 3600000, true); row.append(g); }
  sec.append(row); return sec;
}

/* ---------- 입력 ---------- */
function newEvent(title, start, allDay) {
  return { id: uid(), title: title || '', body: '', start, allDay: !!allDay, repeat: null, remind: [], done: false, updated: 0, deleted: false };
}
const inp = $('#sinp');
function autosize() { inp.style.height = '44px'; inp.style.height = Math.min(150, inp.scrollHeight + 1) + 'px'; }
inp.addEventListener('input', () => { autosize(); $('#sbar').classList.toggle('has', !!inp.value.trim()); });
inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia('(pointer:fine)').matches) { e.preventDefault(); submit(); } });
$('#sbar').addEventListener('submit', e => { e.preventDefault(); submit(); });
function submit() {
  const txt = inp.value.trim(); if (!txt) { inp.focus(); return; }
  inp.value = ''; autosize(); $('#sbar').classList.remove('has');
  const p = R.parseKo(txt);
  const ev = newEvent(p.title || txt, p.start != null ? p.start : R.dayStart(now()) + 9 * 3600000, p.allDay);
  if (p.start == null) { openEvent(null, null, false, ev); return; }
  save(ev);
}

/* ---------- 일정 시트 ---------- */
function openEvent(id, occ, isNew, draft) {
  let ev = id ? S.ev.get(id) : (draft || newEvent('', occ, false));
  if (!ev) return; let dirty = !!draft, tmr;
  const commit = () => { if (!dirty) return; dirty = false; if (!ev.title.trim() && !id) return; save(ev); };
  const touch = () => { dirty = true; clearTimeout(tmr); tmr = setTimeout(commit, 700); };
  openSheet(p => {
    const ti = h('input', 'sf title'); ti.placeholder = '일정'; ti.value = ev.title; ti.oninput = () => { ev.title = ti.value; touch(); };
    const bo = h('textarea', 'sf'); bo.placeholder = '메모'; bo.value = ev.body || ''; bo.oninput = () => { ev.body = bo.value; touch(); };
    p.append(ti, bo);
    // 날짜 · 시간
    const pr = R.kstParts(ev.start);
    const dIn = h('input'); dIn.type = 'date'; dIn.value = `${pr.y}-${String(pr.m + 1).padStart(2, '0')}-${String(pr.d).padStart(2, '0')}`;
    const tIn = h('input'); tIn.type = 'time'; tIn.value = ev.allDay ? '' : R.fmtTime(ev.start);
    const dT = h('span', 'dtx', R.fmtDay(ev.start)), tT = h('span', 'dtx' + (ev.allDay ? ' off' : ''), ev.allDay ? '종일' : R.fmtTime(ev.start));
    const apply = () => {
      const [y, m, d] = dIn.value.split('-').map(Number); if (!y) return;
      const [hh, mm] = tIn.value ? tIn.value.split(':').map(Number) : [0, 0];
      ev.allDay = !tIn.value; ev.start = R.fromKST(y, m - 1, d, hh, mm);
      dT.textContent = R.fmtDay(ev.start); tT.textContent = ev.allDay ? '종일' : R.fmtTime(ev.start); tT.classList.toggle('off', ev.allDay); touch();
    };
    dIn.onchange = apply; tIn.onchange = apply;
    const dw = h('label', 'dtw'); dw.append(dT, dIn); const tw = h('label', 'dtw'); tw.append(tT, tIn);
    const clr = h('button', 'tiny', I.x); clr.type = 'button'; clr.hidden = ev.allDay; clr.onclick = () => { tIn.value = ''; apply(); clr.hidden = true; };
    tIn.addEventListener('change', () => { clr.hidden = !tIn.value; });
    const dr = h('div', 'srw'); dr.append(dw, tw, clr); p.append(dr);
    // 반복
    const rep = h('div', 'srw');
    const rseg = seg([['없음', ''], ['매일', 'd'], ['매주', 'w'], ['매월', 'm']], (ev.repeat && ev.repeat.f) || '', v => { ev.repeat = v ? { f: v, days: v === 'w' ? ((ev.repeat && ev.repeat.days) || [R.kstParts(ev.start).wd]) : undefined } : null; touch(); drawDays(); });
    rep.append(h('span', 'sl', I.repeat), rseg); p.append(rep);
    const days = h('div', 'days');
    const drawDays = () => { days.innerHTML = ''; days.hidden = !(ev.repeat && ev.repeat.f === 'w'); if (days.hidden) return; '일월화수목금토'.split('').forEach((c, i) => { const b = h('button', 'dy' + (ev.repeat.days.includes(i) ? ' on' : ''), c); b.type = 'button'; b.onclick = () => { const s = new Set(ev.repeat.days); s.has(i) ? s.delete(i) : s.add(i); ev.repeat.days = [...s].sort(); if (!ev.repeat.days.length) ev.repeat.days = [i]; touch(); drawDays(); }; days.append(b); }); };
    drawDays(); p.append(days);
    // 알림
    const rm = h('div', 'srw'); const cur = new Set((ev.remind || []).map(rk));
    const rs = h('div', 'seg isg wrap');
    REMIND.forEach(([label, r]) => { const b = h('button', cur.has(rk(r)) ? 'on' : '', label); b.type = 'button'; b.onclick = () => { cur.has(rk(r)) ? cur.delete(rk(r)) : cur.add(rk(r)); ev.remind = REMIND.filter(([, q]) => cur.has(rk(q))).map(([, q]) => q); b.classList.toggle('on'); touch(); if (ev.remind.length && !S.subOk) ensurePush(); }; rs.append(b); });
    rm.append(h('span', 'sl', I.bell), rs); p.append(rm);
    // 버튼
    const btns = h('div', 'sbtns');
    const ok = h('button', 'sb' + (ev.done ? ' on' : ''), I.check); ok.type = 'button'; ok.onclick = () => { ev.done = !ev.done; dirty = true; commit(); closeSheet(); };
    btns.append(ok);
    if (id) { const del = h('button', 'sb danger', I.trash); del.type = 'button'; del.onclick = () => { if (!confirm('삭제?')) return; ev.deleted = true; dirty = true; save(ev); closeSheet(); }; btns.append(del); }
    p.append(btns);
    if (isNew || draft) setTimeout(() => ti.focus(), 60);
  }, () => { clearTimeout(tmr); commit(); });
}
function seg(opts, cur, fn) {
  const s = h('div', 'seg isg');
  opts.forEach(([label, val]) => { const b = h('button', val === cur ? 'on' : '', esc(label)); b.type = 'button'; b.onclick = () => { fn(val); [...s.children].forEach(c => c.classList.toggle('on', c === b)); }; s.append(b); });
  return s;
}

/* ---------- 알림 구독 ---------- */
const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };
async function ensurePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !S.key) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const perm = await Notification.requestPermission(); if (perm !== 'granted') return false;
      const { key } = await (await api('push/key')).json();
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
    }
    await api('push/sub', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sub: sub.toJSON(), ua: navigator.userAgent.slice(0, 80) }) });
    S.subOk = true; $('#sbell').innerHTML = I.bellOn; $('#sbell').classList.add('on'); return true;
  } catch (e) { console.warn('push', e); return false; }
}
async function checkPush() {
  try { if (!('serviceWorker' in navigator) || !('PushManager' in window)) { $('#sbell').hidden = true; return; } const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub && Notification.permission === 'granted') { S.subOk = true; $('#sbell').innerHTML = I.bellOn; $('#sbell').classList.add('on'); } } catch (e) {}
}
$('#sbell').innerHTML = I.bell;
$('#sbell').onclick = async () => { if (S.subOk) { try { await api('push/test', { method: 'POST' }); } catch (e) {} return; } const ok = await ensurePush(); if (!ok && Notification.permission === 'denied') alert('알림이 꺼져 있어요. 설정 > 툭 > 알림에서 켜주세요.'); };

/* ---------- 시작 ---------- */
export async function boot() {
  try {
    const [evs, srv, dirty] = await Promise.all([idb.all('ev'), idb.get('kv', 'srv'), idb.get('kv', 'dirty')]);
    evs.forEach(e => S.ev.set(e.id, e)); S.srv = srv || 0; (dirty || []).forEach(id => S.dirty.add(id));
  } catch (e) {}
  render();
  if (S.key) { pull().then(push); }
  checkPush();
  window.addEventListener('online', () => { pull(); push(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { pull(); render(); } else push(); });
  setInterval(() => { if (document.visibilityState === 'visible') render(); }, 60000);
}
export function setKey(k) { S.key = k; pull().then(push); }
