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
  x: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
  left: sv('<path d="M15 5l-7 7 7 7"/>'),
  right: sv('<path d="M9 5l7 7-7 7"/>')
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
function openSheet(build, onClose, cls) {
  const sh = $('#ssheet'), p = sh.querySelector('.spanel');
  closing = false; p.style.transform = ''; p.style.bottom = ''; p.className = 'spanel' + (cls ? ' ' + cls : ''); p.innerHTML = '<div class="sgrab"></div>';
  sh.hidden = false; build(p); p.scrollTop = 0; sheetClose = onClose || null;
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
  const { ev, occ } = x; const el = h('div', 'sc' + (ev.done ? ' done' : '') + (occ != null && occ < now() && !ev.allDay ? ' past' : ''));
  const t = ev.allDay ? '' : R.fmtTime(occ);
  el.innerHTML = `<div class="st">${t ? `<span class="tm">${t}</span>` : ''}${ev.remind && ev.remind.length ? '<i class="bl"></i>' : ''}${ev.repeat && ev.repeat.f ? I.repeat : ''}</div><div class="sn">${esc(ev.title || '')}</div>`;
  el.onclick = () => openEvent(ev.id, occ);
  return el;
}
function render() {
  const main = $('#smain'); const frag = document.createDocumentFragment();
  const t0 = R.dayStart(now());
  $('#stoday').textContent = R.fmtDay(now());
  // 맨 위: 날짜 없는 것들
  const nd = [...S.ev.values()].filter(e => !e.deleted && e.start == null);
  const ndList = [...nd.filter(e => !e.done).sort((a, b) => b.updated - a.updated), ...nd.filter(e => e.done).sort((a, b) => b.updated - a.updated).slice(0, 5)];
  const top = h('div', 'srow nd');
  ndList.forEach(ev => top.append(cardEl({ ev, occ: null })));
  const g = h('div', 'sc ghost', '+'); g.onclick = () => openCompose(null); top.append(g);
  frag.append(top);
  // 지난 일정 (접힘)
  const past = expand(t0 - 60 * R.DAY, t0 - 1).filter(x => !x.ev.done).slice(-30);
  if (past.length) {
    const b = h('button', 'spast', (S.showPast ? I.upc : I.down)); b.onclick = () => { S.showPast = !S.showPast; render(); };
    frag.append(b);
    if (S.showPast) agenda(frag, past, null, true);
  }
  agenda(frag, expand(t0, t0 + 180 * R.DAY), t0, false);
  main.replaceChildren(frag);
}
// 일정표: 날짜 왼쪽, 일정 막대 오른쪽. 앞 14일은 빈 날도 얇게, 그 뒤는 일정 있는 날만
function agenda(frag, list, t0, isPast) {
  const byDay = new Map();
  for (const x of list) { const k = R.dayStart(x.occ); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(x); }
  if (t0 != null) for (let i = 0; i < 14; i++) { const k = R.dayStart(t0 + i * R.DAY + 3600000); if (!byDay.has(k)) byDay.set(k, []); }
  let lastM = null; const today = R.dayStart(now());
  [...byDay.keys()].sort((a, b) => a - b).forEach(k => {
    const p = R.kstParts(k);
    if (p.m !== lastM) { if (lastM !== null || p.m !== R.kstParts(today).m || isPast) frag.append(h('div', 'agm', (p.y !== R.kstParts(today).y ? p.y + '. ' : '') + (p.m + 1) + '월')); lastM = p.m; }
    const items = byDay.get(k);
    const row = h('div', 'agd' + (k === today ? ' today' : '') + (items.length ? '' : ' empty') + (isPast ? ' dim' : '') + (p.wd === 0 || p.wd === 6 ? ' we' : ''));
    row.append(h('div', 'agl', `<b>${p.d}</b><i>${k === today ? '오늘' : '일월화수목금토'[p.wd]}</i>`));
    const col = h('div', 'agc');
    items.forEach(x => {
      const { ev, occ } = x;
      const e = h('div', 'age' + (ev.done ? ' done' : '') + (!ev.allDay && occ < now() ? ' past' : ''));
      e.innerHTML = `${ev.allDay ? '' : `<span class="tm">${R.fmtTime(occ)}</span>`}<span class="tt">${esc(ev.title || '')}</span>${ev.repeat && ev.repeat.f ? I.repeat : ''}${ev.remind && ev.remind.length ? '<i class="bl"></i>' : ''}`;
      e.onclick = ev2 => { ev2.stopPropagation(); openEvent(ev.id, occ); };
      col.append(e);
    });
    row.append(col);
    if (!isPast) row.onclick = () => openCompose(k);
    frag.append(row);
  });
}
/* ---------- 던지기: 달력 시트 ---------- */
function newEvent(title, start, allDay) {
  return { id: uid(), title: title || '', body: '', start, allDay: !!allDay, repeat: null, remind: [], done: false, updated: 0, deleted: false };
}
$('#sopen').onclick = () => openCompose();
function openCompose(dayMs) {
  const t0 = R.dayStart(now());
  let sel = dayMs === null ? null : dayMs != null ? R.dayStart(dayMs) : t0;
  let vp = R.kstParts(sel == null ? t0 : sel), vy = vp.y, vm = vp.m;   // 보고 있는 달
  let time = '';                                     // 'HH:MM' 또는 '' (종일)
  let vvOff = null;
  openSheet(p => {
    const head = h('div', 'cmh');
    const prev = h('button', '', I.left), next = h('button', '', I.right), ttl = h('div', 'ttl');
    prev.type = next.type = 'button';
    prev.onclick = () => { if (--vm < 0) { vm = 11; vy--; } draw(); };
    next.onclick = () => { if (++vm > 11) { vm = 0; vy++; } draw(); };
    head.append(prev, ttl, next);
    const wk = h('div', 'cmw', '일월화수목금토'.split('').map(c => `<span>${c}</span>`).join(''));
    const grid = h('div', 'cmg');
    const line = h('div', 'cml');
    // 월 넘기기: 옆으로 쓸기
    let x0 = null; grid.onpointerdown = e => { x0 = e.clientX; };
    grid.onpointerup = e => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (dx > 48) prev.onclick(); else if (dx < -48) next.onclick(); };
    const draw = () => {
      const np = R.kstParts(now());
      ttl.textContent = (vy !== np.y ? vy + '. ' : '') + (vm + 1) + '월';
      const m0 = R.fromKST(vy, vm, 1), dim = new Date(Date.UTC(vy, vm + 1, 0)).getUTCDate(), wd0 = R.kstParts(m0).wd;
      const has = new Map();
      for (const x of expand(m0, R.fromKST(vy, vm, dim, 23, 59))) { const k = R.dayStart(x.occ); has.set(k, (has.get(k) || 0) + 1); }
      grid.innerHTML = '';
      for (let i = 0; i < wd0; i++) grid.append(h('div', 'cmd e'));
      for (let d = 1; d <= dim; d++) {
        const k = R.fromKST(vy, vm, d);
        const c = h('div', 'cmd' + (k === t0 ? ' today' : '') + (k === sel ? ' sel' : '') + (k < t0 ? ' o' : ''));
        const n = Math.min(3, has.get(k) || 0);
        c.innerHTML = `<span class="n">${d}</span><span class="ds">${'<i></i>'.repeat(n)}</span>`;
        c.onclick = () => { sel = sel === k ? null : k; draw(); };
        grid.append(c);
      }
      if (sel == null) { line.textContent = '날짜 없이'; tw.hidden = true; clr.hidden = true; return; }
      tw.hidden = false; clr.hidden = !time;
      const dd = Math.round((sel - t0) / R.DAY);
      const lab = dd === 0 ? '오늘' : dd === 1 ? '내일' : R.fmtDay(sel);
      const evs = expand(sel, sel + R.DAY - 1).map(x => x.ev.title).filter(Boolean);
      line.textContent = lab + (evs.length ? '  ' + evs.join(' · ') : '');
    };
    // 시간 · 입력
    const row = h('form', 'cmr'); row.autocomplete = 'off';
    const tT = h('span', 'dtx off', '종일'), tIn = h('input'); tIn.type = 'time';
    const tw = h('label', 'dtw'); tw.append(tT, tIn);
    const clr = h('button', 'tiny', I.x); clr.type = 'button'; clr.hidden = true;
    const setTime = v => { time = v; tT.textContent = v || '종일'; tT.classList.toggle('off', !v); clr.hidden = !v; };
    tIn.onchange = () => setTime(tIn.value); clr.onclick = () => { tIn.value = ''; setTime(''); };
    const ti = h('input', 'cmi'); ti.placeholder = '할 일 툭 던지기'; ti.enterKeyHint = 'send';
    const send = h('button', 'cms', I.up); send.type = 'submit';
    row.append(tw, clr, ti, send); p.append(head, wk, grid, line, row); draw();
    row.onsubmit = e => {
      e.preventDefault(); const txt = ti.value.trim(); if (!txt) { ti.focus(); return; }
      const q = R.parseKo(txt);
      const day = q.hasDate ? R.dayStart(q.start) : sel;
      let ev;
      if (day == null) ev = q.hasTime ? newEvent(q.title || txt, q.start, false) : newEvent(q.title || txt, null, true);
      else {
        const dp = R.kstParts(day);
        let hh = null, mm = 0;
        if (q.hasTime) { hh = q.hh; mm = q.mm; } else if (time) { [hh, mm] = time.split(':').map(Number); }
        ev = newEvent(q.title || txt, R.fromKST(dp.y, dp.m, dp.d, hh == null ? 0 : hh, mm), hh == null);
      }
      save(ev); closeSheet();
    };
    // 키보드가 올라오면 시트를 그 위로
    const vv = window.visualViewport;
    if (vv) { vvOff = () => { p.style.bottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop) + 'px'; }; vv.addEventListener('resize', vvOff); vv.addEventListener('scroll', vvOff); }
    ti.focus();
  }, () => { const vv = window.visualViewport; if (vv && vvOff) { vv.removeEventListener('resize', vvOff); vv.removeEventListener('scroll', vvOff); } }, 'compose');
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
    const nod = ev.start == null, pr = R.kstParts(nod ? now() : ev.start);
    const dIn = h('input'); dIn.type = 'date'; dIn.value = nod ? '' : `${pr.y}-${String(pr.m + 1).padStart(2, '0')}-${String(pr.d).padStart(2, '0')}`;
    const tIn = h('input'); tIn.type = 'time'; tIn.value = ev.allDay || nod ? '' : R.fmtTime(ev.start);
    const dT = h('span', 'dtx' + (nod ? ' off' : ''), nod ? '날짜 없음' : R.fmtDay(ev.start)), tT = h('span', 'dtx' + (ev.allDay ? ' off' : ''), ev.allDay ? '종일' : R.fmtTime(ev.start));
    const apply = () => {
      const [y, m, d] = dIn.value ? dIn.value.split('-').map(Number) : [];
      const [hh, mm] = tIn.value ? tIn.value.split(':').map(Number) : [0, 0];
      ev.allDay = !tIn.value || !y; ev.start = y ? R.fromKST(y, m - 1, d, hh, mm) : null;
      dT.textContent = y ? R.fmtDay(ev.start) : '날짜 없음'; dT.classList.toggle('off', !y);
      tw.hidden = !y; dclr.hidden = !y;
      tT.textContent = ev.allDay ? '종일' : R.fmtTime(ev.start); tT.classList.toggle('off', ev.allDay); touch();
    };
    dIn.onchange = apply; tIn.onchange = apply;
    const dw = h('label', 'dtw'); dw.append(dT, dIn); const tw = h('label', 'dtw'); tw.append(tT, tIn);
    const clr = h('button', 'tiny', I.x); clr.type = 'button'; clr.hidden = ev.allDay; clr.onclick = () => { tIn.value = ''; apply(); clr.hidden = true; };
    tIn.addEventListener('change', () => { clr.hidden = !tIn.value; });
    const dclr = h('button', 'tiny', I.x); dclr.type = 'button'; dclr.hidden = nod; dclr.onclick = () => { dIn.value = ''; tIn.value = ''; clr.hidden = true; apply(); };
    tw.hidden = nod;
    const dr = h('div', 'srw'); dr.append(dw, dclr, tw, clr); p.append(dr);
    // 반복
    const rep = h('div', 'srw');
    const rseg = seg([['없음', ''], ['매일', 'd'], ['매주', 'w'], ['매월', 'm']], (ev.repeat && ev.repeat.f) || '', v => { ev.repeat = v ? { f: v, days: v === 'w' ? ((ev.repeat && ev.repeat.days) || [R.kstParts(ev.start ?? now()).wd]) : undefined } : null; touch(); drawDays(); });
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
