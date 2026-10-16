'use strict';
/* 툭 — 순간 기록 앱 */
const $ = s => document.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const sv = p => `<svg class="ic" viewBox="0 0 24 24">${p}</svg>`;
const I = {
  home: sv('<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>'),
  search: sv('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  photo: sv('<rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16l-5-5-9 8"/>'),
  up: sv('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  folder: sv('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
  link: sv('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  music: sv('<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  chev: sv('<path d="M9 6l6 6-6 6"/>'),
  down: sv('<path d="M6 9l6 6 6-6"/>'),
  ext: sv('<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>')
};

/* ---------- 설정 단계 ---------- */
const RATIOS = [[2, 5], [1, 2], [3, 5], [2, 3], [3, 4], [4, 5], [1, 1], [5, 4], [4, 3], [3, 2], [2, 1]];
const SIZES = [6, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5];
const DEF = { kind: 'normal', tone: 'grain', color: '#3C3489', photo: 'orig', date: 'd', ratio: 5, size: 3 };
const SWATCH = ['#26215C', '#3C3489', '#993556', '#D85A30', '#BA7517', '#0F6E56', '#185FA5', '#5F5E5A', '#E6F1FB', '#F1EFE8'];

/* ---------- IndexedDB ---------- */
const idb = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('tuk', 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('items', { keyPath: 'id' }); d.createObjectStore('kv'); d.createObjectStore('blobs'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = (store, mode, fn) => open().then(d => new Promise((res, rej) => {
    const t = d.transaction(store, mode); const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req && 'result' in req ? req.result : undefined); t.onerror = () => rej(t.error);
  }));
  return {
    all: s => tx(s, 'readonly', st => st.getAll()),
    keys: s => tx(s, 'readonly', st => st.getAllKeys()),
    get: (s, k) => tx(s, 'readonly', st => st.get(k)),
    put: (s, v, k) => tx(s, 'readwrite', st => { st.put(v, k); }),
    del: (s, k) => tx(s, 'readwrite', st => { st.delete(k); }),
    putMany: (s, arr) => tx(s, 'readwrite', st => { arr.forEach(v => st.put(v)); })
  };
})();

/* ---------- 상태 ---------- */
const S = { items: new Map(), kids: new Map(), view: 'root', sel: -1, edit: null, showClosed: false, dirty: new Set(), srv: 0, key: '', blobURL: new Map(), pushing: false };
try { S.key = localStorage.getItem('tuk_key') || ''; } catch (e) {}

function reindex() {
  S.kids = new Map();
  for (const it of S.items.values()) {
    if (it.deleted || it.kind === 'root') continue;
    const p = it.parent || 'root';
    if (!S.kids.has(p)) S.kids.set(p, []);
    S.kids.get(p).push(it);
  }
}
function rootItem() {
  let r = S.items.get('root');
  if (!r) { r = { id: 'root', parent: null, kind: 'root', sort: 0, data: { set: {} }, updated: 0 }; S.items.set('root', r); }
  return r;
}
const get = id => (id === 'root' || !id) ? rootItem() : S.items.get(id);
const kids = id => S.kids.get(id) || [];
const tabsOf = id => kids(id).filter(k => k.kind === 'tab').sort((a, b) => (a.sort || 0) - (b.sort || 0));
const cardsOf = id => kids(id).filter(k => k.kind === 'card').sort((a, b) => (b.data.at || 0) - (a.data.at || 0));
function chain(id) {
  const out = []; let x = get(id), g = 0;
  while (x && g++ < 200) { out.unshift(x); if (x.id === 'root') break; x = get(x.parent || 'root'); }
  if (out[0] && out[0].id !== 'root') out.unshift(rootItem());
  return out;
}
const alive = id => chain(id).every(x => !x.deleted);
function setv(id, k) {
  const c = chain(id);
  for (let i = c.length - 1; i >= 0; i--) { const s = c[i].data && c[i].data.set; if (s && s[k] != null && s[k] !== '') return s[k]; }
  return DEF[k];
}
const MUSIC_RE = /음악|노래|music|song|플리|playlist/i;
function hasOwn(id, k) { return chain(id).some(x => x.data && x.data.set && x.data.set[k] != null && x.data.set[k] !== ''); }
function isMusic(id) {
  if (hasOwn(id, 'kind')) return setv(id, 'kind') === 'music';
  return chain(id).some(x => x.id !== 'root' && MUSIC_RE.test((x.data && x.data.title) || ''));
}
const ratioIdx = id => (!hasOwn(id, 'ratio') && isMusic(id)) ? 6 : setv(id, 'ratio');
function colorOf(id) {
  const c = chain(id);
  for (let i = c.length - 1; i >= 0; i--) {
    const s = (c[i].data && c[i].data.set) || {};
    if (s.color === 'auto') { const hit = cardsOf(c[i].id).find(x => x.data.img && x.data.img.color); if (hit) return hit.data.img.color; continue; }
    if (s.color) return s.color;
  }
  return DEF.color;
}
function ink(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(hex || ''); if (!m) return '#fff';
  const [r, g, b] = [m[1], m[2], m[3]].map(x => parseInt(x, 16) / 255);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.62 ? 'rgba(18,18,17,.86)' : '#fff';
}
const pad = n => String(n).padStart(2, '0');
function fmtDate(ms, mode) {
  const d = new Date(ms || Date.now());
  const s = String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate());
  return mode === 'dt' ? s + '<br>' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : s;
}
function titleOf(it) {
  const d = it.data || {};
  if (d.title) return d.title;
  const first = (d.body || '').split('\n').find(l => l.trim());
  if (first) return first.trim();
  if (d.link && d.link.title) return d.link.title;
  if (d.url) { try { return new URL(d.url).hostname.replace(/^www\./, ''); } catch (e) {} }
  return d.img ? '사진' : '…';
}
function snippetOf(it) {
  const d = it.data || {};
  if (d.link && (d.link.type === 'music' || d.link.type === 'video') && !d.title && !d.body) return d.link.author || '';
  const lines = (d.body || '').split('\n');
  if (d.title) return d.body || '';
  const i = lines.findIndex(l => l.trim());
  return lines.slice(i + 1).join('\n').trim();
}
const pathText = id => chain(id).slice(1).map(x => x.data.title || '이름 없음').join(' / ');

/* ---------- 그레인 ---------- */
(function noise() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const im = x.createImageData(128, 128);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255 | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  x.putImageData(im, 0, 0);
  document.documentElement.style.setProperty('--noise', `url(${c.toDataURL()})`);
})();

/* ---------- 서버 ---------- */
async function api(path, opt = {}) {
  opt.headers = Object.assign({ 'x-tuk-key': S.key }, opt.headers || {});
  const r = await fetch('/api/' + path, opt);
  if (r.status === 401) { lockScreen('비밀키가 맞지 않아요'); throw new Error('401'); }
  if (!r.ok) { let m = r.status; try { m = (await r.json()).error || m; } catch (e) {} throw new Error(m); }
  return r;
}
function save(it, quiet) {
  it.updated = Date.now();
  S.items.set(it.id, it);
  reindex();
  idb.put('items', it);
  S.dirty.add(it.id); idb.put('kv', [...S.dirty], 'dirty');
  schedulePush();
  if (!quiet) render();
}
let pushT;
function schedulePush(ms = 600) { clearTimeout(pushT); pushT = setTimeout(push, ms); }
async function push() {
  if (!S.key || S.pushing || !S.dirty.size) { uploadBlobs(); return; }
  if (!navigator.onLine) return;
  S.pushing = true;
  const sent = [...S.dirty].map(id => S.items.get(id)).filter(Boolean).map(it => ({ ...it }));
  try {
    for (let i = 0; i < sent.length; i += 400)
      await api('push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: sent.slice(i, i + 400) }) });
    sent.forEach(s => { const cur = S.items.get(s.id); if (!cur || cur.updated === s.updated) S.dirty.delete(s.id); });
    idb.put('kv', [...S.dirty], 'dirty');
  } catch (e) { if (e.message !== '401') console.warn('push', e); }
  S.pushing = false;
  if (S.dirty.size && sent.length && navigator.onLine) schedulePush(3000);
  uploadBlobs();
}
async function pull() {
  if (!S.key || !navigator.onLine) return;
  try {
    const j = await (await api('sync?since=' + S.srv)).json();
    const take = [];
    for (const it of j.items) {
      const cur = S.items.get(it.id);
      if (cur && S.dirty.has(it.id) && cur.updated > it.updated) continue;
      if (!cur || it.updated >= cur.updated) { S.items.set(it.id, it); take.push(it); }
    }
    if (take.length) await idb.putMany('items', take);
    S.srv = j.srv; idb.put('kv', S.srv, 'srv');
    if (take.length) { reindex(); render(); }
    retryMeta();
  } catch (e) { if (e.message !== '401') console.warn('pull', e); }
}
let uploading = false;
async function uploadBlobs() {
  if (uploading || !S.key || !navigator.onLine) return; uploading = true;
  try {
    for (const k of await idb.keys('blobs')) {
      const b = await idb.get('blobs', k); if (!b) continue;
      await api('img/' + k, { method: 'PUT', headers: { 'content-type': 'image/jpeg' }, body: b });
      await idb.del('blobs', k);
    }
  } catch (e) { console.warn('upload', e); }
  uploading = false;
}

/* ---------- 이미지 ---------- */
function loadImgEl(blob) {
  return new Promise((res, rej) => { const u = URL.createObjectURL(blob); const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
}
async function decodeImg(blob) {
  try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch (e) { return loadImgEl(blob); }
}
function scaleTo(src, max, q) {
  const w = src.naturalWidth || src.width, hh = src.naturalHeight || src.height;
  const s = Math.min(1, max / Math.max(w, hh));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(hh * s));
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', q));
}
function domColor(src) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(src, 0, 0, 32, 32); const d = x.getImageData(0, 0, 32, 32).data; const B = {};
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx ? (mx - mn) / mx : 0;
    const k = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5); const o = B[k] || (B[k] = { n: 0, r: 0, g: 0, b: 0, s: 0 });
    o.n++; o.r += r; o.g += g; o.b += b; o.s += s;
  }
  let best = null, bs = -1;
  for (const k in B) { const o = B[k]; const sc = o.n * (0.35 + o.s / o.n); if (sc > bs) { bs = sc; best = o; } }
  const hx = v => Math.round(v / best.n).toString(16).padStart(2, '0');
  return '#' + hx(best.r) + hx(best.g) + hx(best.b);
}
function squareCrop(src) {
  const w = src.naturalWidth || src.width, hh = src.naturalHeight || src.height;
  let ch = hh, y0 = 0; const ar = w / hh;
  if (ar > 1.2 && ar < 1.5) { ch = Math.round(w * 9 / 16); y0 = Math.round((hh - ch) / 2); }
  const side = Math.min(w, ch), x0 = Math.round((w - side) / 2), yy = y0 + Math.round((ch - side) / 2);
  const c = document.createElement('canvas'); c.width = c.height = side;
  c.getContext('2d').drawImage(src, x0, yy, side, side, 0, 0, side, side);
  return c;
}
async function storeImage(blob, opt = {}) {
  let src = await decodeImg(blob);
  if (opt.square) src = squareCrop(src);
  const w = src.naturalWidth || src.width, hh = src.naturalHeight || src.height;
  const [t, f] = await Promise.all([scaleTo(src, 640, 0.8), scaleTo(src, 2000, 0.86)]);
  const color = domColor(src);
  const key = uid();
  await idb.put('blobs', t, key + '_t.jpg'); await idb.put('blobs', f, key + '_f.jpg');
  S.blobURL.set(key + '_t.jpg', URL.createObjectURL(t)); S.blobURL.set(key + '_f.jpg', URL.createObjectURL(f));
  return { key, w, h: hh, color };
}
const imgSrc = (img, sz) => S.blobURL.get(img.key + '_' + sz + '.jpg') || '/api/img/' + img.key + '_' + sz + '.jpg';

/* ---------- 카드 만들기 ---------- */
function newCard(parent, data) {
  return { id: uid(), parent: parent === 'root' ? 'root' : parent, kind: 'card', sort: 0, data: Object.assign({ at: Date.now() }, data), updated: 0, deleted: false };
}
const URL_RE = /https?:\/\/[^\s<>"']+/;
function ytId(u) {
  try {
    const x = new URL(u);
    if (x.hostname === 'youtu.be') return x.pathname.slice(1);
    if (/(^|\.)youtube\.com$/.test(x.hostname)) return x.searchParams.get('v') || (x.pathname.match(/\/(shorts|embed|live)\/([\w-]+)/) || [])[2] || null;
  } catch (e) {}
  return null;
}
async function addText(txt, parent) {
  const m = txt.match(URL_RE);
  const it = newCard(parent, {});
  if (m) {
    const u = m[0].replace(/[),.]+$/, ''); const rest = txt.replace(m[0], '').trim();
    it.data.url = u; if (rest) it.data.body = rest;
    it.data.link = { type: ytId(u) ? (/music\./.test(u) ? 'music' : 'video') : 'link', pending: true };
  } else {
    if (isMusic(parent) && navigator.onLine && S.key) return openMusicPick(txt, parent);
    it.data.body = txt;
  }
  save(it);
  if (m) fetchMeta(it.id);
}
async function musicImage(m) {
  const list = m.yt ? ['https://i.ytimg.com/vi/' + m.yt + '/maxresdefault.jpg', 'https://i.ytimg.com/vi/' + m.yt + '/hqdefault.jpg'] : [m.art];
  for (const u of list) {
    if (!u) continue;
    try { const r = await api('proxy?u=' + encodeURIComponent(u)); return await storeImage(await r.blob(), { square: true }); } catch (e) {}
  }
  return null;
}
async function saveMusic(m, parent, cardId, q) {
  const it = cardId ? get(cardId) : newCard(parent, {});
  it.data.music = { title: m.title, artist: m.artist || '', album: m.album || '', src: m.src };
  it.data.url = m.url;
  it.data.link = { type: 'music', title: m.title, author: m.artist || '', site: 'YouTube Music', yt: m.yt || '' };
  if (cardId && q && (it.data.body || '').trim() === q) delete it.data.body;
  if (cardId && it.data.img) delete it.data.img;
  save(it);
  const img = await musicImage(m);
  if (img) { const cur = get(it.id); cur.data.img = img; save(cur); }
}
function openMusicPick(q, parent, cardId) {
  openSheet(p => {
    p.append(h('div', 'sh-t', '어떤 곡이에요?'));
    const inp = h('input', 'f'); inp.type = 'search'; inp.value = q; inp.enterKeyHint = 'search';
    const list = h('div');
    p.append(inp, list);
    const btns = h('div', 'btns');
    const plain = h('button', 'btn', cardId ? '닫기' : '글로만 저장');
    plain.onclick = () => { closeSheet(); if (!cardId) { const it = newCard(parent, { body: q }); save(it); } };
    btns.append(plain); p.append(btns);
    const run = async () => {
      const qq = inp.value.trim(); if (!qq) return;
      list.innerHTML = '<p class="hint">찾는 중…</p>';
      try {
        const j = await (await api('music?q=' + encodeURIComponent(qq))).json();
        list.innerHTML = '';
        if (!j.items.length) { list.innerHTML = '<p class="hint">못 찾았어요. 이름이나 가수를 바꿔서 찾아보세요.</p>'; return; }
        j.items.forEach(m => {
          const b = h('button', 'mres', `<img src="${esc(m.art)}" alt="" loading="lazy"><div><b>${esc(m.title)}</b><small>${esc([m.artist, m.album].filter(Boolean).join(' · '))}</small></div><span class="srcb">${m.src === 'apple' ? 'Apple' : 'YouTube'}</span>`);
          b.type = 'button';
          b.onclick = () => { closeSheet(); saveMusic(m, parent, cardId, q); toast('음악으로 저장했어요'); };
          list.append(b);
        });
      } catch (e) { list.innerHTML = '<p class="hint">지금은 찾을 수 없어요.</p>'; }
    };
    inp.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); run(); } };
    run();
  });
}
async function fetchMeta(id) {
  const it = S.items.get(id); if (!it || !it.data.url || !navigator.onLine || !S.key) return;
  try {
    const meta = await (await api('meta?url=' + encodeURIComponent(it.data.url))).json();
    const cur = S.items.get(id); if (!cur) return;
    cur.data.link = meta;
    if (meta.yt) {
      cur.data.music = { title: meta.title || '', artist: meta.author || '', src: 'youtube' };
      if (!cur.data.img) { const img = await musicImage({ yt: meta.yt }); const c2 = S.items.get(id); if (img && c2) { c2.data.img = img; c2.data.link = meta; c2.data.music = cur.data.music; save(c2); return; } }
    } else if (meta.image && !cur.data.img) {
      try {
        const r = await api('proxy?u=' + encodeURIComponent(meta.image));
        cur.data.img = await storeImage(await r.blob());
      } catch (e) {}
    }
    save(cur);
  } catch (e) { if (e.message !== '401') console.warn('meta', e); }
}
function retryMeta() { for (const it of S.items.values()) if (it.data && it.data.link && it.data.link.pending && !it.deleted) fetchMeta(it.id); }
async function addFiles(files, parent) {
  const list = [...files].filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
  if (!list.length) return;
  toast(list.length > 1 ? `사진 ${list.length}장 처리 중` : '사진 처리 중');
  for (const f of list) {
    try { const img = await storeImage(f); save(newCard(parent, { img, at: f.lastModified && list.length > 1 ? Date.now() : Date.now() })); }
    catch (e) { toast('이 사진은 열 수 없어요'); }
  }
  schedulePush(200);
}

/* ---------- 렌더 ---------- */
function dims(tabId) {
  const cw = Math.min($('#main').clientWidth || window.innerWidth, 520);
  const n = SIZES[setv(tabId, 'size')] || 4, r = RATIOS[ratioIdx(tabId)] || [4, 5];
  const W = Math.max(48, Math.floor((cw - 12) / n - 6));
  return { W, H: Math.round(W * r[1] / r[0]), n, r };
}
function cardEl(it, D) {
  const d = it.data || {}, tab = it.parent || 'root';
  const tone = setv(tab, 'tone'), pm = d.photo || setv(tab, 'photo'), col = colorOf(tab);
  const el = h('div', 'card'); el.style.width = D.W + 'px'; el.style.height = D.H + 'px';
  const img = d.img; let photoShown = false;
  if (img && (pm === 'orig' || pm === 'blur')) {
    photoShown = true; el.style.background = img.color || col;
    const im = new Image(); im.decoding = 'async'; im.loading = 'lazy'; im.alt = ''; im.src = imgSrc(img, 't'); if (pm === 'blur') im.className = 'blur';
    el.append(im, h('div', 'ov'));
  } else if (img && pm === 'color') {
    const bg = img.color || col; el.style.background = bg; el.style.color = ink(bg); if (tone !== 'color') el.classList.add('grain');
  } else if (tone === 'basic') el.classList.add('basic');
  else { el.style.background = col; el.style.color = ink(col); if (tone === 'grain') el.classList.add('grain'); }
  const lt = d.link && d.link.type;
  const date = `<span class="dt">${fmtDate(d.at, setv(tab, 'date'))}</span>`;
  const mu = d.music || ((lt === 'music' || lt === 'video') && d.link.title ? { title: d.link.title, artist: d.link.author } : null);
  if (mu) {
    el.className = 'card music'; el.style.background = (img && img.color) || col; el.style.color = '#fff';
    el.innerHTML = '';
    if (img) { const im = new Image(); im.decoding = 'async'; im.loading = 'lazy'; im.alt = ''; im.src = imgSrc(img, 't'); el.append(im); } else el.classList.add('grain');
    el.append(h('div', 'ov'));
    el.insertAdjacentHTML('beforeend', `<div class="tt">${date}</div><div class="cap"><b>${esc(d.title || mu.title || titleOf(it))}</b>${mu.artist ? `<small>${esc(mu.artist)}</small>` : ''}</div>`);
    if (S.dirty.has(it.id)) el.append(h('i', 'up'));
    return el;
  }
  const strong = !!(d.title || lt);
  const ic = lt ? I.link : (img && !photoShown) ? I.photo : '';
  if (strong) el.insertAdjacentHTML('beforeend', `<div class="tt">${date}${ic}${esc(titleOf(it))}</div>`);
  else {
    const tx = h('div', 'tt tx', date + ic + esc((d.body || '').trim()));
    tx.style.webkitLineClamp = Math.max(1, Math.floor((D.H - 12) / 17));
    if (photoShown && !d.body) tx.innerHTML = date;
    el.append(tx);
  }
  const sn = (photoShown || !strong) ? '' : snippetOf(it);
  if (sn && D.H > 64) { const s = h('div', 'sn'); s.textContent = sn; const lines = Math.max(1, Math.floor((D.H - 62) / 16)); s.style.webkitLineClamp = lines; el.append(s); }
  if (S.dirty.has(it.id)) el.append(h('i', 'up'));
  return el;
}
function folderEl(t, D) {
  const tone = setv(t.id, 'tone'), col = colorOf(t.id);
  const el = h('div', 'card folder'); el.style.width = D.W + 'px'; el.style.height = D.H + 'px';
  if (tone === 'basic') el.classList.add('basic'); else { el.style.background = col; el.style.color = ink(col); if (tone === 'grain') el.classList.add('grain'); }
  const nt = tabsOf(t.id).length, nc = cardsOf(t.id).length;
  el.innerHTML += `<div class="tt">${I.folder}${esc(t.data.title || '이름 없음')}</div><div class="cnt">${nt ? '탭 ' + nt + ' · ' : ''}${nc}</div>`;
  return el;
}
function gesture(el, onTap, onLong) {
  let tm = null, x0 = 0, y0 = 0, fired = false;
  el.addEventListener('pointerdown', e => {
    if (e.button > 0 || e.target.closest('.hb,.hr')) return;
    fired = false; x0 = e.clientX; y0 = e.clientY;
    tm = setTimeout(() => { tm = null; fired = true; if (navigator.vibrate) navigator.vibrate(12); onLong(); }, 450);
  });
  el.addEventListener('pointermove', e => { if (tm && Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 9) { clearTimeout(tm); tm = null; fired = true; } });
  el.addEventListener('pointerup', e => { if (e.target.closest('.hb,.hr')) return; if (tm) { clearTimeout(tm); tm = null; if (!fired) onTap(); } });
  el.addEventListener('pointercancel', () => { clearTimeout(tm); tm = null; });
  el.addEventListener('contextmenu', e => { e.preventDefault(); if (e.pointerType === 'mouse' || !e.pointerType) { clearTimeout(tm); tm = null; onLong(); } });
}
function shelf(tabId, opt = {}) {
  const t = get(tabId);
  const wrap = h('section', opt.dim ? 'dim' : '');
  const D = dims(tabId);
  const self = !!opt.self;
  const subs = self ? [] : tabsOf(tabId), cards = cardsOf(tabId);
  const hd = h('div', 'hd' + (self ? '' : ' nav'));
  const label = opt.label || t.data.title || '이름 없음';
  hd.innerHTML = `<b>${esc(label)}${self ? '' : I.chev}</b><small>${subs.length ? '탭 ' + subs.length + ' · ' : ''}${cards.length}</small>`;
  if (!self) hd.querySelector('b').onclick = () => go(tabId);
  wrap.append(hd);
  const row = h('div', 'row' + (opt.grid ? ' wrap' : ''));
  const list = [...subs.map(s => ({ s })), ...cards.map(c => ({ c }))];
  if (!list.length) {
    row.append(h('div', 'empty', self ? (tabId === 'root' ? '아래 입력창에 툭 던져두면 여기 쌓여요.' : '아직 비어 있어요. 이 탭에 있을 때 던진 건 여기로 들어와요.') : '비어 있음'));
  }
  list.forEach((x, i) => {
    const el = x.s ? folderEl(x.s, D) : cardEl(x.c, D);
    if (S.edit === tabId && i === 0) addHandles(el, tabId, row);
    gesture(el, () => {
      if (S.edit === tabId) { S.edit = null; render(); return; }
      if (x.s) go(x.s.id); else openCard(x.c.id);
    }, () => { S.edit = S.edit === tabId ? null : tabId; render(); });
    row.append(el);
  });
  wrap.append(row);
  if (S.edit === tabId) wrap.append(editPanel(tabId));
  return wrap;
}
function addHandles(el, tabId, row) {
  const D = dims(tabId);
  const ov = h('div', 'ed-ov', `<b>${D.r[0]}:${D.r[1]}</b><span>${D.n}장</span>`);
  const hb = h('div', 'hb', '<i></i>'), hr = h('div', 'hr', '<i></i>');
  el.append(ov, hb, hr);
  const drag = (hn, key, len, axis) => {
    hn.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); hn.setPointerCapture(e.pointerId);
      const p0 = axis === 'y' ? e.clientY : e.clientX, i0 = key === 'ratio' ? ratioIdx(tabId) : setv(tabId, key); let cur = i0;
      const mv = ev => {
        const dpx = axis === 'y' ? (ev.clientY - p0) : (ev.clientX - p0);
        const ni = Math.max(0, Math.min(len - 1, i0 + Math.round(dpx / (axis === 'y' ? 18 : 16))));
        if (ni === cur) return; cur = ni;
        const tmp = Object.assign({}, get(tabId).data.set); const t = get(tabId); t.data.set = t.data.set || {}; t.data.set[key] = ni;
        const nd = dims(tabId);
        [...row.children].forEach(k => { if (k.classList.contains('card')) { k.style.width = nd.W + 'px'; k.style.height = nd.H + 'px'; } });
        ov.innerHTML = `<b>${nd.r[0]}:${nd.r[1]}</b><span>${nd.n}장</span>`;
        if (navigator.vibrate) navigator.vibrate(6);
        void tmp;
      };
      const up = () => { hn.removeEventListener('pointermove', mv); hn.removeEventListener('pointerup', up); hn.removeEventListener('pointercancel', up); const t = get(tabId); if (cur !== i0) save(t); else render(); };
      hn.addEventListener('pointermove', mv); hn.addEventListener('pointerup', up); hn.addEventListener('pointercancel', up);
    });
  };
  drag(hb, 'ratio', RATIOS.length, 'y');
  drag(hr, 'size', SIZES.length, 'x');
}
function seg(opts, cur, fn) {
  const s = h('div', 'seg');
  opts.forEach(([label, val]) => { const b = h('button', val === cur ? 'on' : '', esc(label)); b.type = 'button'; b.onclick = () => fn(val); s.append(b); });
  return s;
}
function setTab(id, k, v, rer = true) {
  const t = get(id); t.data.set = t.data.set || {};
  if (v === null) delete t.data.set[k]; else t.data.set[k] = v;
  save(t, !rer);
}
function editPanel(tabId) {
  const p = h('div', 'edp');
  const g1 = h('div', 'grp', '<span>크기</span>'); g1.append(seg([['작게', 1], ['보통', 3], ['크게', 6]], setv(tabId, 'size'), v => setTab(tabId, 'size', v)));
  const g2 = h('div', 'grp', '<span>비율</span>'); g2.append(seg([['가로', 9], ['정사각', 6], ['세로', 5]], ratioIdx(tabId), v => setTab(tabId, 'ratio', v)));
  const done = h('button', 'lnk', '완료'); done.onclick = () => { S.edit = null; render(); };
  p.append(g1, g2, done);
  return p;
}
function renderBC(center) {
  const bc = $('#bc'); bc.innerHTML = '';
  const c = chain(S.view).slice(1);
  c.forEach((n, i) => {
    if (i) bc.append(h('span', 'cr sl', '/'));
    const last = i === c.length - 1;
    const e = h('button', 'cr' + (last ? ' cur' : '') + (i === S.sel ? ' sel' : ''), esc(n.data.title || '이름 없음'));
    e.onclick = () => {
      if (last) return openTabSheet(n.id);
      if (S.sel === i) go(n.id); else { S.sel = i; renderBC(false); }
    };
    bc.append(e);
  });
  if (center !== false) requestAnimationFrame(() => { const l = bc.lastElementChild; bc.scrollLeft = l ? l.offsetLeft - bc.clientWidth / 2 + l.offsetWidth / 2 : 0; });
  $('#inp').placeholder = S.view === 'root' ? '툭 던져두기' : (get(S.view).data.title || '여기') + '에 던져두기';
}
function render(center) {
  if (S.view !== 'root' && (!get(S.view) || !alive(S.view))) S.view = 'root';
  renderBC(center);
  const main = $('#main'); const frag = document.createDocumentFragment();
  const V = S.view, tabs = tabsOf(V), cards = cardsOf(V);
  const open = tabs.filter(t => !(t.data.set && t.data.set.collapsed)), closed = tabs.filter(t => t.data.set && t.data.set.collapsed);
  if (V === 'root') {
    if (cards.length || !tabs.length) frag.append(shelf('root', { self: true, label: '받은함' }));
    open.forEach(t => frag.append(shelf(t.id)));
  } else {
    open.forEach(t => frag.append(shelf(t.id)));
    if (cards.length || !tabs.length) frag.append(shelf(V, { self: true, label: tabs.length ? '낱장' : '카드', grid: true }));
  }
  if (closed.length) {
    const b = h('button', 'closed', `${S.showClosed ? I.down : I.chev}<span>수납됨 · ${closed.map(t => esc(t.data.title || '이름 없음')).join(', ')}</span>`);
    b.onclick = () => { S.showClosed = !S.showClosed; render(false); };
    frag.append(b);
    if (S.showClosed) closed.forEach(t => frag.append(shelf(t.id, { dim: true })));
  }
  const add = h('button', 'addtab', I.plus + '<span>탭 추가</span>'); add.onclick = () => openNewTab(V);
  frag.append(add);
  main.replaceChildren(frag);
}
function go(id, noPush) {
  S.view = id || 'root'; S.sel = -1; S.edit = null; S.showClosed = false;
  if (!noPush) history.pushState({ v: S.view }, '', S.view === 'root' ? location.pathname : '#' + S.view);
  render(); window.scrollTo(0, 0);
}
window.addEventListener('popstate', e => go((e.state && e.state.v) || location.hash.slice(1) || 'root', true));

/* ---------- 시트 ---------- */
let sheetClose = null;
function openSheet(build, onClose) {
  const sh = $('#sheet'), p = sh.querySelector('.panel');
  p.innerHTML = '<div class="grab"></div>'; build(p);
  sh.hidden = false; sheetClose = onClose || null;
}
function closeSheet() {
  const sh = $('#sheet'); if (sh.hidden) return;
  sh.hidden = true; const f = sheetClose; sheetClose = null; if (f) f();
}
$('#sheet .scrim').onclick = closeSheet;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1800); }
function srow(label, ctrl, val) {
  const r = h('div', 'sr'); r.append(h('span', '', esc(label) + (val ? `<span class="val">${esc(val)}</span>` : '')));
  if (ctrl) r.append(ctrl); return r;
}

function openTabSheet(id) {
  const isRoot = id === 'root';
  const build = p => {
    const t = get(id), own = (t.data && t.data.set) || {};
    p.append(h('div', 'sh-t', isRoot ? '기본 설정' : '탭 설정'));
    const rebuild = () => { p.innerHTML = '<div class="grab"></div>'; build(p); };
    const set = (k, v) => { setTab(id, k, v); rebuild(); };
    if (!isRoot) {
      const inp = h('input', 'f title'); inp.value = t.data.title || ''; inp.placeholder = '탭 이름';
      inp.onchange = () => { const x = get(id); x.data.title = inp.value.trim() || '이름 없음'; save(x); };
      p.append(inp);
    }
    const D = dims(id);
    p.append(srow('종류', seg([['일반', 'normal'], ['음악', 'music']], isMusic(id) ? 'music' : 'normal', v => { const x = get(id); x.data.set = x.data.set || {}; x.data.set.kind = v; if (v === 'music' && x.data.set.ratio == null) x.data.set.ratio = 6; save(x); rebuild(); }), isMusic(id) ? '곡 이름만 쳐도 찾아줌' : ''));
    p.append(srow('크기', seg([['작게', 1], ['보통', 3], ['크게', 6]], setv(id, 'size'), v => set('size', v)), D.n + '장'));
    p.append(srow('비율', seg([['가로', 9], ['정사각', 6], ['세로', 5]], ratioIdx(id), v => set('ratio', v)), D.r.join(':')));
    p.append(srow('톤', seg([['그레인', 'grain'], ['색', 'color'], ['기본', 'basic']], setv(id, 'tone'), v => set('tone', v))));
    const sws = h('div', 'sws'); const curC = own.color || '';
    const auto = h('button', 'sw auto' + (curC === 'auto' ? ' on' : '')); auto.title = '자동 (최근 사진 색)'; auto.onclick = () => set('color', 'auto'); sws.append(auto);
    SWATCH.forEach(c => { const b = h('button', 'sw' + (curC.toLowerCase() === c.toLowerCase() ? ' on' : '')); b.style.background = c; b.onclick = () => set('color', c); sws.append(b); });
    const cu = h('label', 'sw custom' + (curC && curC !== 'auto' && !SWATCH.some(c => c.toLowerCase() === curC.toLowerCase()) ? ' on' : ''), I.plus);
    if (curC && curC !== 'auto' && !SWATCH.includes(curC)) cu.style.background = curC;
    const ci = h('input'); ci.type = 'color'; ci.value = /^#[\da-f]{6}$/i.test(curC) ? curC : '#3C3489'; ci.onchange = () => set('color', ci.value); cu.append(ci); sws.append(cu);
    p.append(srow('색', sws, curC === 'auto' ? '자동' : curC ? '' : (isRoot ? '' : '상위 따름')));
    p.append(srow('사진', seg([['원본', 'orig'], ['블러', 'blur'], ['대표색', 'color'], ['숨김', 'hide']], setv(id, 'photo'), v => set('photo', v))));
    p.append(srow('날짜', seg([['날짜', 'd'], ['날짜+시각', 'dt']], setv(id, 'date'), v => set('date', v))));
    if (!isRoot) {
      const sib = tabsOf(t.parent || 'root'); const ix = sib.findIndex(x => x.id === id);
      const mv = h('div', 'seg');
      [['앞으로', -1], ['뒤로', 1]].forEach(([l, dlt]) => { const b = h('button', '', l); b.type = 'button'; b.onclick = () => { const j = ix + dlt; if (j < 0 || j >= sib.length) return; sib.forEach((x, k) => x.sort = k); const a = sib[ix], c = sib[j]; [a.sort, c.sort] = [c.sort, a.sort]; sib.forEach(x => save(x, true)); render(false); rebuild(); }; mv.append(b); });
      p.append(srow('순서', mv, `${ix + 1} / ${sib.length}`));
      p.append(srow('수납', seg([['펼침', 0], ['수납', 1]], own.collapsed ? 1 : 0, v => set('collapsed', v ? 1 : null))));
    }
    const btns = h('div', 'btns');
    if (Object.keys(own).some(k => k !== 'collapsed')) {
      const r = h('button', 'btn', isRoot ? '기본값으로' : '상위 설정 따르기');
      r.onclick = () => { const x = get(id); x.data.set = own.collapsed ? { collapsed: 1 } : {}; save(x); rebuild(); }; btns.append(r);
    }
    if (!isRoot) {
      const sub = h('button', 'btn', '하위 탭 추가'); sub.onclick = () => openNewTab(id); btns.append(sub);
      const m = h('button', 'btn', '위치 옮기기'); m.onclick = () => openMove(id); btns.append(m);
      const del = h('button', 'btn danger', '탭 삭제');
      del.onclick = () => {
        const n = countDesc(id);
        if (!confirm(`'${t.data.title}' 탭${n ? '과 안에 든 ' + n + '개' : ''}를 지울까요?`)) return;
        markDeleted(id); closeSheet(); go(t.parent || 'root'); toast('지웠어요');
      };
      btns.append(del);
    } else {
      const k = h('button', 'btn', '비밀키 바꾸기'); k.onclick = () => lockScreen(); btns.append(k);
    }
    p.append(btns);
  };
  openSheet(build);
}
function countDesc(id) { let n = 0; for (const k of kids(id)) n += 1 + countDesc(k.id); return n; }
function markDeleted(id) { for (const k of [...kids(id)]) markDeleted(k.id); const x = get(id); x.deleted = true; save(x, true); reindex(); render(); }

function openNewTab(parent) {
  openSheet(p => {
    p.append(h('div', 'sh-t', parent === 'root' ? '새 탭' : `${esc(get(parent).data.title)} 안에 새 탭`));
    const inp = h('input', 'f title'); inp.placeholder = '탭 이름'; inp.enterKeyHint = 'done';
    const ok = h('button', 'btn pri', '만들기');
    const make = () => {
      const name = inp.value.trim(); if (!name) { inp.focus(); return; }
      const sib = tabsOf(parent);
      const t = { id: uid(), parent, kind: 'tab', sort: sib.length ? Math.max(...sib.map(x => x.sort || 0)) + 1 : 0, data: { title: name, set: {} }, updated: 0, deleted: false };
      save(t); closeSheet(); toast(`'${name}' 탭 만듦`);
    };
    inp.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); make(); } };
    ok.onclick = make;
    const box = h('div', 'stack'); box.append(inp, ok); p.append(box);
    setTimeout(() => inp.focus(), 60);
  });
}
function treeList(p, excludeId, onPick, currentParent) {
  const box = h('div', 'tree');
  const walk = (id, depth) => {
    if (id === excludeId) return;
    const n = get(id);
    const b = h('button', '', `<span class="dot" style="background:${colorOf(id)}"></span>${esc(id === 'root' ? '홈 (받은함)' : n.data.title || '이름 없음')}`);
    b.style.paddingLeft = depth * 16 + 'px'; b.type = 'button';
    if (id === currentParent) b.disabled = true;
    b.onclick = () => onPick(id);
    box.append(b);
    tabsOf(id).forEach(c => walk(c.id, depth + 1));
  };
  walk('root', 0); p.append(box);
}
function openMove(id) {
  const it = get(id);
  openSheet(p => {
    p.append(h('div', 'sh-t', '어디로 옮길까요'));
    treeList(p, it.kind === 'tab' ? id : null, target => {
      const x = get(id); x.parent = target;
      if (x.kind === 'tab') { const sib = tabsOf(target); x.sort = sib.length ? Math.max(...sib.map(s => s.sort || 0)) + 1 : 0; }
      save(x); closeSheet(); toast((target === 'root' ? '홈' : pathText(target)) + '으로 옮김');
    }, it.parent || 'root');
  });
}

function openCard(id) {
  let dirty = false, tmr;
  const commit = () => { if (!dirty) return; dirty = false; const x = get(id); if (x) save(x); };
  const touch = () => { dirty = true; clearTimeout(tmr); tmr = setTimeout(commit, 700); };
  openSheet(p => {
    const it = get(id), d = it.data;
    if (d.img) {
      const im = h('img', 'dimg'); im.src = imgSrc(d.img, 'f'); im.alt = '';
      im.onerror = () => { im.onerror = null; im.src = imgSrc(d.img, 't'); };
      if (d.link && d.url) { const a = h('a'); a.href = d.url; a.target = '_blank'; a.rel = 'noopener'; a.append(im); p.append(a); } else p.append(im);
    }
    if (d.url) {
      const a = h('a', 'lk'); a.href = d.url; a.target = '_blank'; a.rel = 'noopener';
      const L = d.link || {};
      a.innerHTML = `<div class="m"><b>${esc(L.title || d.url)}</b><small>${esc([L.author, L.site].filter(Boolean).join(' · ') || d.url)}</small></div>${I.ext}`;
      p.append(a);
    }
    const ti = h('input', 'f title'); ti.placeholder = '제목 (없어도 돼요)'; ti.value = d.title || '';
    ti.oninput = () => { get(id).data.title = ti.value; touch(); };
    const bo = h('textarea', 'f'); bo.placeholder = '내용'; bo.value = d.body || '';
    bo.oninput = () => { get(id).data.body = bo.value; touch(); };
    const box = h('div', 'stack'); box.append(ti, bo); p.append(box);
    const dt = h('input', 'f'); dt.type = 'datetime-local'; dt.style.width = 'auto'; dt.style.fontSize = '14px';
    const at = new Date(d.at || Date.now()); dt.value = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
    dt.onchange = () => { const v = new Date(dt.value).getTime(); if (!isNaN(v)) { get(id).data.at = v; touch(); } };
    p.append(srow('날짜', dt));
    if (d.img) {
      p.append(srow('사진 표시', seg([['탭 설정', ''], ['원본', 'orig'], ['블러', 'blur'], ['색', 'color'], ['숨김', 'hide']], d.photo || '', v => {
        const x = get(id); if (v) x.data.photo = v; else delete x.data.photo; dirty = true; commit();
        closeSheet(); openCard(id);
      })));
    }
    p.append(srow('위치', null, pathText(it.parent || 'root') || '홈 (받은함)'));
    const btns = h('div', 'btns');
    if (d.music || (!d.url && (d.body || '').trim())) {
      const mf = h('button', 'btn', d.music ? '곡 다시 찾기' : '음악으로 찾기');
      mf.onclick = () => { commit(); const q = d.music ? [d.music.title, d.music.artist].filter(Boolean).join(' ') : d.body.trim().split('\n')[0]; closeSheet(); openMusicPick(q, it.parent || 'root', id); };
      btns.append(mf);
    }
    const mv = h('button', 'btn', '옮기기'); mv.onclick = () => { commit(); openMove(id); };
    const del = h('button', 'btn danger', '삭제'); del.onclick = () => { if (!confirm('이 기록을 지울까요?')) return; const x = get(id); x.deleted = true; dirty = false; save(x); closeSheet(); toast('지웠어요'); };
    btns.append(mv, del); p.append(btns);
  }, () => { clearTimeout(tmr); commit(); });
}

function openSearch() {
  openSheet(p => {
    const inp = h('input', 'f'); inp.type = 'search'; inp.placeholder = '전체에서 찾기';
    const out = h('div');
    p.append(inp, out);
    const run = () => {
      const q = inp.value.trim().toLowerCase(); out.innerHTML = '';
      if (!q) return;
      const hits = [];
      for (const it of S.items.values()) {
        if (it.deleted || it.kind === 'root') continue;
        const d = it.data || {};
        const hay = [d.title, d.body, d.url, d.link && d.link.title, d.link && d.link.author].filter(Boolean).join(' ').toLowerCase();
        if (hay.includes(q) && alive(it.id)) hits.push(it);
        if (hits.length > 80) break;
      }
      hits.sort((a, b) => (a.kind === 'tab' ? -1 : 0) - (b.kind === 'tab' ? -1 : 0) || (b.data.at || 0) - (a.data.at || 0));
      if (!hits.length) out.append(h('p', 'hint', '찾는 게 없어요.'));
      hits.forEach(it => {
        const b = h('button', 'res', `<small>${esc(pathText(it.parent || 'root') || '홈')}</small><b>${it.kind === 'tab' ? I.folder.replace('class="ic"', 'class="ic" style="display:inline;width:14px;height:14px;vertical-align:-2px;margin-right:4px"') : ''}${esc(it.kind === 'tab' ? it.data.title : titleOf(it))}</b>`);
        b.onclick = () => { closeSheet(); if (it.kind === 'tab') go(it.id); else { go(it.parent || 'root'); setTimeout(() => openCard(it.id), 30); } };
        out.append(b);
      });
    };
    let t; inp.oninput = () => { clearTimeout(t); t = setTimeout(run, 120); };
    setTimeout(() => inp.focus(), 60);
  });
}

function lockScreen(msg) {
  openSheet(p => {
    p.append(h('div', 'sh-t', '비밀키 입력'));
    p.append(h('p', 'hint', msg || 'Cloudflare에 정해둔 TUK_KEY를 넣어주세요. 이 기기에 한 번만 저장돼요.'));
    const inp = h('input', 'f'); inp.type = 'password'; inp.value = S.key; inp.autocomplete = 'current-password';
    const ok = h('button', 'btn pri', '확인');
    const go2 = async () => {
      S.key = inp.value.trim(); try { localStorage.setItem('tuk_key', S.key); } catch (e) {}
      try { await api('ping'); closeSheet(); toast('연결됐어요'); await pull(); push(); }
      catch (e) { if (e.message !== '401') { closeSheet(); toast('지금은 오프라인이에요'); } }
    };
    ok.onclick = go2; inp.onkeydown = e => { if (e.key === 'Enter') go2(); };
    const box = h('div', 'stack'); box.append(inp, ok); p.append(box);
    setTimeout(() => inp.focus(), 60);
  });
}

/* ---------- 입력바 ---------- */
const inp = $('#inp');
function autosize() { inp.style.height = '42px'; inp.style.height = Math.min(150, inp.scrollHeight + 1) + 'px'; }
inp.addEventListener('input', autosize);
inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia('(pointer:fine)').matches) { e.preventDefault(); submit(); } });
inp.addEventListener('paste', e => { const fs = e.clipboardData && e.clipboardData.files; if (fs && fs.length) { e.preventDefault(); addFiles(fs, S.view); } });
$('#bar').addEventListener('submit', e => { e.preventDefault(); submit(); });
function submit() { const txt = inp.value.trim(); if (!txt) { inp.focus(); return; } inp.value = ''; autosize(); addText(txt, S.view); }
$('#photoBtn').onclick = () => $('#file').click();
$('#file').onchange = e => { addFiles(e.target.files, S.view); e.target.value = ''; };
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files, S.view); });
$('#homeBtn').innerHTML = I.home; $('#srchBtn').innerHTML = I.search; $('#photoBtn').innerHTML = I.photo; $('#sendBtn').innerHTML = I.up;
$('#homeBtn').onclick = () => S.view === 'root' ? openTabSheet('root') : go('root');
$('#srchBtn').onclick = openSearch;
document.addEventListener('pointerdown', e => { if (S.edit && !e.target.closest('section, #top, #sheet, #bar')) { S.edit = null; render(false); } });
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => render(false), 150); });

/* ---------- 시작 ---------- */
(async function boot() {
  try {
    const [items, srv, dirty, bk] = await Promise.all([idb.all('items'), idb.get('kv', 'srv'), idb.get('kv', 'dirty'), idb.keys('blobs')]);
    items.forEach(it => S.items.set(it.id, it));
    S.srv = srv || 0; (dirty || []).forEach(id => S.dirty.add(id));
    for (const k of bk) { const b = await idb.get('blobs', k); if (b) S.blobURL.set(k, URL.createObjectURL(b)); }
  } catch (e) { console.warn('idb', e); }
  reindex();
  const hv = location.hash.slice(1);
  S.view = hv && S.items.get(hv) ? hv : 'root';
  history.replaceState({ v: S.view }, '', location.href);
  render();
  const q = new URLSearchParams(location.search);
  const shared = [q.get('add'), q.get('title'), q.get('text'), q.get('url')].filter(Boolean).join('\n').trim();
  if (shared) { const target = q.get('tab') && S.items.get(q.get('tab')) ? q.get('tab') : 'root'; history.replaceState({ v: S.view }, '', location.pathname + location.hash); await addText(shared, target); toast('저장했어요'); }
  if (!S.key) lockScreen(); else { pull().then(push); }
  window.addEventListener('online', () => { pull(); push(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(); else push(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
