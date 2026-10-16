'use strict';
/* 툭 — 순간 기록 앱 */
const $ = s => document.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const sv = p => `<svg class="ic" viewBox="0 0 24 24">${p}</svg>`;
const I = {
  home: sv('<path d="M5 10.5L12 4.5l7 6V19H5z"/>'),
  search: sv('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  photo: sv('<rect x="4" y="5.5" width="16" height="13" rx="2.5"/><path d="M4.5 15.5l5-4.5 10 7"/>'),
  up: sv('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  folder: sv('<rect x="4.5" y="5.5" width="15" height="13" rx="2.5"/>'),
  link: sv('<path d="M9.5 14.5l5-5"/><path d="M11.5 7.5l1.2-1.2a3.3 3.3 0 0 1 4.7 4.7L16.2 12.2"/><path d="M12.5 16.5l-1.2 1.2a3.3 3.3 0 0 1-4.7-4.7l1.2-1.2"/>'),
  music: sv('<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  chev: sv('<path d="M9 6l6 6-6 6"/>'),
  down: sv('<path d="M6 9l6 6 6-6"/>'),
  ext: sv('<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>'),
  upc: sv('<path d="M6 15l6-6 6 6"/>'),
  trash: sv('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/>'),
  folderPlus: sv('<rect x="4.5" y="5.5" width="15" height="13" rx="2.5"/><path d="M12 9v6M9 12h6"/>'),
  move: sv('<path d="M5 12h14M13 6l6 6-6 6"/><path d="M3 5v14"/>'),
  eyeOff: sv('<path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.1A10 10 0 0 1 12 5c5 0 8.5 4 9.5 7a13 13 0 0 1-2.2 3.4M6.6 6.6C4.4 8 3 10 2.5 12c1 3 4.5 7 9.5 7a9.6 9.6 0 0 0 4.4-1"/>'),
  blur: sv('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M12 17a3 3 0 0 0 3-3"/>'),
  palette: sv('<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 2-2 2-4a9 9 0 0 0-8-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>'),
  grain: sv('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r=".8"/><circle cx="12" cy="11" r=".8"/><circle cx="15.5" cy="8" r=".8"/><circle cx="9" cy="14.5" r=".8"/><circle cx="14" cy="15.5" r=".8"/><circle cx="12" cy="7" r=".8"/><circle cx="16" cy="12.5" r=".8"/><circle cx="7" cy="12" r=".8"/>'),
  solid: '<svg class="ic" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" stroke="none"/></svg>',
  outline: sv('<rect x="4" y="4" width="16" height="16" rx="3"/>'),
  szS: sv('<rect x="8.5" y="8.5" width="7" height="7" rx="1.5"/>'),
  szM: sv('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
  szL: sv('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/>'),
  rWide: sv('<rect x="3.5" y="7" width="17" height="10" rx="2"/>'),
  rSq: sv('<rect x="5" y="5" width="14" height="14" rx="2"/>'),
  rTall: sv('<rect x="7" y="3.5" width="10" height="17" rx="2"/>'),
  archive: sv('<rect x="3.5" y="4" width="17" height="4" rx="1"/><path d="M5 8v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>'),
  reset: sv('<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v4.5h4.5"/>'),
  key: sv('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 5l2.5 2.5M14 7l2.5 2.5"/>'),
  text: sv('<path d="M5 6h14M12 6v13M9 19h6"/>'),
  check: sv('<path d="M5 12l5 5 9-10"/>'),
  left: sv('<path d="M15 6l-6 6 6 6"/>'),
  right: sv('<path d="M9 6l6 6-6 6"/>'),
  date1: sv('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>'),
  clock: sv('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  none: sv('<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>'),
  play: sv('<path d="M8 5.5v13l10-6.5z"/>')
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
  if (d.link && (d.link.type === 'music' || d.link.type === 'video') && !d.title && !d.body) return '';
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
    if (S.pendingView && S.items.get(S.pendingView)) { S.view = S.pendingView; S.pendingView = null; }
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
function trimDark(src) {
  const w = src.naturalWidth || src.width, hh = src.naturalHeight || src.height;
  const c = document.createElement('canvas'); c.width = w; c.height = hh; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0);
  const d = x.getImageData(0, 0, w, hh).data;
  const dark = (x0, y0, dx, dy, n) => { let s = 0, mx = 0; for (let i = 0; i < n; i++) { const k = ((y0 + dy * i) * w + (x0 + dx * i)) * 4; const v = (d[k] + d[k + 1] + d[k + 2]) / 3; s += v; if (v > mx) mx = v; } return s / n < 22 && mx < 60; };
  let t = 0, b = hh - 1, l = 0, r = w - 1;
  while (t < hh / 3 && dark(0, t, 1, 0, w)) t++;
  while (b > hh * 2 / 3 && dark(0, b, 1, 0, w)) b--;
  while (l < w / 3 && dark(l, t, 0, 1, b - t)) l++;
  while (r > w * 2 / 3 && dark(r, t, 0, 1, b - t)) r--;
  if (t === 0 && l === 0 && b === hh - 1 && r === w - 1) return src;
  const o = document.createElement('canvas'); o.width = r - l + 1; o.height = b - t + 1;
  o.getContext('2d').drawImage(c, l, t, o.width, o.height, 0, 0, o.width, o.height);
  return o;
}
function squareCrop(src) {
  src = trimDark(src);
  const w = src.naturalWidth || src.width, hh = src.naturalHeight || src.height;
  let ch = hh, y0 = 0; const ar = w / hh;
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
function fitGeo(img, W, H) {
  const ar = (img.w || 1) / (img.h || 1), z = Math.max(1, img.z || 1);
  const bw = ar > W / H ? H * ar : W, bh = ar > W / H ? H : W / ar;
  return { sw: bw * z, sh: bh * z, ex: Math.max(0, bw * z - W), ey: Math.max(0, bh * z - H) };
}
function applyFocus(im, img, W, H) {
  const fx = img.fx != null ? img.fx : 0.5, fy = img.fy != null ? img.fy : 0.5;
  if (!(img.w && img.h && W && H)) {
    if (img.fx != null) im.style.objectPosition = `${fx * 100}% ${fy * 100}%`;
    if (img.z && img.z > 1) { im.style.transformOrigin = `${fx * 100}% ${fy * 100}%`; im.style.transform = `scale(${img.z})`; }
    return;
  }
  const g = fitGeo(img, W, H);
  im.style.objectFit = 'fill'; im.style.inset = 'auto'; im.style.width = g.sw + 'px'; im.style.height = g.sh + 'px';
  im.style.left = (-fx * g.ex) + 'px'; im.style.top = (-fy * g.ey) + 'px'; im.style.transform = 'none';
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
  it.data.music = { title: m.title, artist: m.artist || '', album: m.album || '', src: m.src, real: m.src !== 'youtube' || !!m.artist };
  it.data.url = m.url;
  it.data.link = { type: 'music', title: m.title, author: m.artist || '', site: 'YouTube Music', yt: m.yt || '' };
  if (cardId && q && (it.data.body || '').trim() === q) delete it.data.body;
  if (cardId && it.data.img) delete it.data.img;
  save(it);
  const img = await musicImage(m);
  if (img) { const cur = get(it.id); cur.data.img = img; save(cur); }
  if (!m.yt) {
    try {
      const j = await (await api('music?q=' + encodeURIComponent([m.title, m.artist].filter(Boolean).join(' ')))).json();
      const hit = (j.items || []).find(x => x.yt);
      if (hit) { const cur = get(it.id); cur.data.link.yt = hit.yt; cur.data.url = 'https://music.youtube.com/watch?v=' + hit.yt; save(cur, true); }
    } catch (e) {}
  }
}
function openMusicPick(q, parent, cardId) {
  openSheet(p => {
    const inp = h('input', 'f'); inp.type = 'search'; inp.value = q; inp.enterKeyHint = 'search';
    const plain = iconBtn(I.text, () => { closeSheet(); if (!cardId) { const it = newCard(parent, { body: q }); save(it); } });
    const row = h('div', 'inrow'); row.append(inp, plain); p.append(row);
    const list = h('div', 'mlist'); p.append(list);
    const run = async () => {
      const qq = inp.value.trim(); if (!qq) return;
      list.innerHTML = '<div class="spin"></div>';
      try {
        const j = await (await api('music?q=' + encodeURIComponent(qq))).json();
        list.innerHTML = '';
        if (!j.items.length) { list.innerHTML = `<div class="nores">${I.none}</div>`; return; }
        j.items.forEach(m => {
          const b = h('button', 'mres', `<img src="${esc(m.art)}" alt="" loading="lazy"><div><b>${esc(m.title)}</b><small>${esc([m.artist, m.album].filter(Boolean).join(' · '))}</small></div>`);
          b.type = 'button';
          b.onclick = () => { closeSheet(); saveMusic(m, parent, cardId, q); };
          list.append(b);
        });
      } catch (e) { list.innerHTML = `<div class="nores">${I.none}</div>`; }
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
      cur.data.music = { title: meta.title || '', artist: meta.author || '', src: 'youtube', real: !!meta.topic };
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
    const im = new Image(); im.decoding = 'async'; im.loading = 'lazy'; im.alt = ''; im.src = imgSrc(img, 't'); applyFocus(im, img, D.W, D.H); if (!(img.w && img.h)) im.onload = () => { img.w = im.naturalWidth; img.h = im.naturalHeight; applyFocus(im, img, D.W, D.H); }; if (pm === 'blur') im.className = 'blur';
    el.append(im);
  } else if (img && pm === 'color') {
    const bg = img.color || col; el.style.background = bg; el.style.color = ink(bg); if (tone !== 'color') el.classList.add('grain');
  } else if (tone === 'basic') el.classList.add('basic');
  else { el.style.background = col; el.style.color = ink(col); if (tone === 'grain') el.classList.add('grain'); }
  const lt = d.link && d.link.type;
  const date = `<span class="dt">${fmtDate(d.at, setv(tab, 'date'))}</span>`;
  const mu = d.music || ((lt === 'music' || lt === 'video') && d.link.title ? { title: d.link.title, artist: d.link.topic ? d.link.author : '', real: true } : null);
  const artist = mu && mu.real ? mu.artist : '';
  if (mu) {
    el.className = 'card music'; el.style.background = (img && img.color) || col; el.style.color = '#fff';
    el.innerHTML = '';
    if (img) { const im = new Image(); im.decoding = 'async'; im.loading = 'lazy'; im.alt = ''; im.src = imgSrc(img, 't'); applyFocus(im, img, D.W, D.H); if (!(img.w && img.h)) im.onload = () => { img.w = im.naturalWidth; img.h = im.naturalHeight; applyFocus(im, img, D.W, D.H); }; el.append(im); }
    else { el.classList.add('grain'); el.insertAdjacentHTML('beforeend', `<div class="tt">${date}</div><div class="cap"><b>${esc(d.title || mu.title || titleOf(it))}</b>${artist ? `<small>${esc(artist)}</small>` : ''}</div>`); }
    if (S.dirty.has(it.id)) el.append(h('i', 'up'));
    return el;
  }
  const strong = !!(d.title || lt);
  const ic = lt ? I.link : (img && !photoShown) ? I.photo : '';
  if (photoShown) { if (S.dirty.has(it.id)) el.append(h('i', 'up')); return el; }
  if (strong) el.insertAdjacentHTML('beforeend', `<div class="tt">${date}${ic}${esc(titleOf(it))}</div>`);
  else {
    const tx = h('div', 'tt tx', date + ic + esc((d.body || '').trim()));
    tx.style.webkitLineClamp = Math.max(1, Math.floor((D.H - 12) / 17));
    el.append(tx);
  }
  const sn = !strong ? '' : snippetOf(it);
  if (sn && D.H > 64) { const s = h('div', 'sn'); s.textContent = sn; const lines = Math.max(1, Math.floor((D.H - 62) / 16)); s.style.webkitLineClamp = lines; el.append(s); }
  if (S.dirty.has(it.id)) el.append(h('i', 'up'));
  return el;
}
function folderEl(t, D) {
  const tone = setv(t.id, 'tone'), col = colorOf(t.id);
  const el = h('div', 'card folder'); el.style.width = D.W + 'px'; el.style.height = D.H + 'px';
  if (tone === 'basic') el.classList.add('basic'); else { el.style.background = col; el.style.color = ink(col); if (tone === 'grain') el.classList.add('grain'); }
  el.innerHTML += `<div class="fn">${esc(t.data.title || '')}</div>`;
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
function musicIds(tabId) {
  const out = [];
  const walk = id => { cardsOf(id).slice().reverse().forEach(c => { const y = c.data.link && c.data.link.yt; if (y && !out.includes(y)) out.push(y); }); tabsOf(id).forEach(t => walk(t.id)); };
  walk(tabId); return out.slice(0, 50);
}
async function playAll(tabId) {
  const ids = musicIds(tabId); if (!ids.length) return;
  const w = window.open('about:blank', '_blank');
  try {
    const j = await (await api('playlist?ids=' + ids.join(','))).json();
    const u = j.music || j.yt; if (w) w.location = u; else location.href = u;
  } catch (e) { if (w) w.close(); toast('지금은 못 열어요'); }
}
function shelf(tabId, opt = {}) {
  const t = get(tabId);
  const wrap = h('section', opt.dim ? 'dim' : '');
  const D = dims(tabId);
  const self = !!opt.self;
  const subs = self ? [] : tabsOf(tabId), cards = cardsOf(tabId);
  if (!self) {
    const hd = h('div', 'hd nav'); hd.innerHTML = `<b>${esc(t.data.title || '')}</b>`;
    hd.querySelector('b').onclick = () => go(tabId);
    if (musicIds(tabId).length) { const pl = h('button', 'play', I.play); pl.type = 'button'; pl.onclick = () => playAll(tabId); hd.append(pl); }
    wrap.append(hd);
  } else wrap.classList.add('selfshelf');
  const row = h('div', 'row' + (opt.grid ? ' wrap' : ''));
  const list = [...subs.map(s => ({ s })), ...cards.map(c => ({ c }))];
  const ghost = h('div', 'card ghost', I.plus); ghost.style.width = D.W + 'px'; ghost.style.height = D.H + 'px';
  ghost.onclick = () => openAdd(tabId);
  list.forEach((x, i) => {
    const el = x.s ? folderEl(x.s, D) : cardEl(x.c, D);
    if (S.edit === tabId && i === 0) addHandles(el, tabId, row);
    gesture(el, () => {
      if (S.edit === tabId) { S.edit = null; render(); return; }
      if (x.s) go(x.s.id); else openCard(x.c.id);
    }, () => { S.edit = S.edit === tabId ? null : tabId; render(); });
    row.append(el);
  });
  if (!opt.dim) row.append(ghost);
  wrap.append(row);
  if (S.edit === tabId) wrap.append(editPanel(tabId));
  return wrap;
}
function addHandles(el, tabId, row) {
  const D = dims(tabId);
  const ov = h('div', 'ed-ov', `<b>${D.r[0]}:${D.r[1]}</b>`);
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
        ov.innerHTML = `<b>${nd.r[0]}:${nd.r[1]}</b>`;
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
function seg(opts, cur, fn, opt = {}) {
  const s = h('div', 'seg' + (opt.icon ? ' isg' : ''));
  opts.forEach(([label, val]) => {
    const on = val === cur;
    const b = h('button', on ? 'on' : '', opt.icon ? label : esc(label)); b.type = 'button';
    b.onclick = () => fn(on && opt.clear ? null : val);
    s.append(b);
  });
  return s;
}
const SEG_SIZE = [[I.szS, 1], [I.szM, 3], [I.szL, 6]];
const SEG_RATIO = [[I.rWide, 9], [I.rSq, 6], [I.rTall, 5]];
const SEG_TONE = [[I.grain, 'grain'], [I.solid, 'color'], [I.outline, 'basic']];
const SEG_PHOTO = [[I.photo, 'orig'], [I.blur, 'blur'], [I.palette, 'color'], [I.eyeOff, 'hide']];
function setTab(id, k, v, rer = true) {
  const t = get(id); t.data.set = t.data.set || {};
  if (v === null) delete t.data.set[k]; else t.data.set[k] = v;
  save(t, !rer);
}
function editPanel(tabId) {
  const p = h('div', 'edp');
  p.append(seg(SEG_SIZE, setv(tabId, 'size'), v => setTab(tabId, 'size', v), { icon: true }));
  p.append(seg(SEG_RATIO, ratioIdx(tabId), v => setTab(tabId, 'ratio', v), { icon: true }));
  return p;
}
function renderBC(center) {
  const bc = $('#bc'); bc.innerHTML = '';
  const c = chain(S.view).slice(1);
  c.forEach((n, i) => {
    if (i) bc.append(h('span', 'cr sl', '/'));
    const last = i === c.length - 1;
    const e = h('button', 'cr' + (last ? ' cur' : '') + (i === S.sel ? ' sel' : ''), esc(n.data.title || ''));
    e.onclick = () => {
      if (last) return openTabSheet(n.id);
      if (S.sel === i) go(n.id); else { S.sel = i; renderBC(false); }
    };
    bc.append(e);
  });
  if (center !== false) {
    const cen = () => { const l = bc.lastElementChild; bc.scrollLeft = l ? l.offsetLeft - bc.clientWidth / 2 + l.offsetWidth / 2 : 0; };
    requestAnimationFrame(cen); if (document.fonts && document.fonts.ready) document.fonts.ready.then(cen);
  }
  $('#inp').placeholder = S.view === 'root' ? '툭 던져두기' : (get(S.view).data.title || '여기') + '에 던져두기';
  const pb = $('#playBtn'); const has = S.view !== 'root' && musicIds(S.view).length > 0; pb.hidden = !has;
}
function render(center) {
  if (S.view !== 'root' && (!get(S.view) || !alive(S.view))) S.view = 'root';
  renderBC(center);
  const main = $('#main'); const frag = document.createDocumentFragment();
  const V = S.view, tabs = tabsOf(V), cards = cardsOf(V);
  const open = tabs.filter(t => !(t.data.set && t.data.set.collapsed)), closed = tabs.filter(t => t.data.set && t.data.set.collapsed);
  if (V === 'root') {
    frag.append(shelf('root', { self: true }));
    open.forEach(t => frag.append(shelf(t.id)));
  } else {
    open.forEach(t => frag.append(shelf(t.id)));
    frag.append(shelf(V, { self: true }));
  }
  if (closed.length) {
    const b = h('div', 'closed', I.archive);
    closed.forEach(t => { const n = h('button', 'cn', esc(t.data.title || '')); n.onclick = () => go(t.id); b.append(n); });
    const tg = h('button', 'ct', S.showClosed ? I.upc : I.down); tg.onclick = () => { S.showClosed = !S.showClosed; render(false); }; b.append(tg);
    frag.append(b);
    if (S.showClosed) closed.forEach(t => frag.append(shelf(t.id, { dim: true })));
  }
  main.replaceChildren(frag);
}
function go(id, noPush) {
  S.view = id || 'root'; S.sel = -1; S.edit = null; S.showClosed = false;
  if (!noPush) history.pushState({ v: S.view }, '', S.view === 'root' ? location.pathname : '#' + S.view);
  render(); window.scrollTo(0, 0);
}
window.addEventListener('popstate', e => go((e.state && e.state.v) || location.hash.slice(1) || 'root', true));

/* ---------- 시트 ---------- */
let sheetClose = null, closing = false;
function openSheet(build, onClose) {
  const sh = $('#sheet'), p = sh.querySelector('.panel');
  closing = false; p.className = 'panel'; p.style.transform = ''; p.style.transition = ''; p.innerHTML = '<div class="grab"></div>'; build(p);
  sh.hidden = false; p.scrollTop = 0; sheetClose = onClose || null;
  const g = p.querySelector('.grab');
  g.onpointerdown = e => {
    e.preventDefault(); g.setPointerCapture(e.pointerId); const y0 = e.clientY; let dy = 0; p.style.transition = 'none';
    const mv = ev => { dy = Math.max(0, ev.clientY - y0); p.style.transform = `translateY(${dy}px)`; };
    const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); p.style.transition = ''; if (dy > 90) closeSheet(); else p.style.transform = ''; };
    g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
  };
}
function closeSheet() {
  const sh = $('#sheet'); if (sh.hidden || closing) return;
  closing = true; const p = sh.querySelector('.panel'); p.style.transform = 'translateY(105%)';
  const f = sheetClose; sheetClose = null; if (f) f();
  setTimeout(() => { if (closing) { sh.hidden = true; closing = false; p.style.transform = ''; } }, 240);
}
$('#sheet .scrim').onclick = closeSheet;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1800); }
function srow(label, ctrl) {
  const r = h('div', 'sr'); if (label) r.append(h('span', 'sl', label));
  if (ctrl) r.append(ctrl); return r;
}
function iconBtn(icon, fn, cls) { const b = h('button', 'btn ico' + (cls ? ' ' + cls : ''), icon); b.type = 'button'; b.onclick = fn; return b; }

function openTabSheet(id) {
  const isRoot = id === 'root';
  const build = p => {
    const t = get(id), own = (t.data && t.data.set) || {};
    const rebuild = () => { p.innerHTML = '<div class="grab"></div>'; build(p); };
    const set = (k, v) => { setTab(id, k, v); rebuild(); };
    if (!isRoot) {
      const inp = h('input', 'f title'); inp.value = t.data.title || ''; inp.placeholder = '이름';
      inp.onchange = () => { const x = get(id); x.data.title = inp.value.trim(); save(x); };
      p.append(inp);
    }
    const mus = h('button', 'tgl' + (isMusic(id) ? ' on' : ''), I.music); mus.type = 'button';
    mus.onclick = () => { const x = get(id); x.data.set = x.data.set || {}; const v = isMusic(id) ? 'normal' : 'music'; x.data.set.kind = v; if (v === 'music' && x.data.set.ratio == null) x.data.set.ratio = 6; save(x); rebuild(); };
    p.append(srow(null, mus));
    p.append(srow(I.szM, seg(SEG_SIZE, setv(id, 'size'), v => set('size', v), { icon: true, clear: !isRoot })));
    p.append(srow(I.rSq, seg(SEG_RATIO, ratioIdx(id), v => set('ratio', v), { icon: true, clear: !isRoot })));
    p.append(srow(I.grain, seg(SEG_TONE, setv(id, 'tone'), v => set('tone', v), { icon: true, clear: !isRoot })));
    const sws = h('div', 'sws'); const curC = own.color || '';
    const auto = h('button', 'sw auto' + (curC === 'auto' ? ' on' : '')); auto.onclick = () => set('color', curC === 'auto' ? null : 'auto'); sws.append(auto);
    SWATCH.forEach(c => { const on = curC.toLowerCase() === c.toLowerCase(); const b = h('button', 'sw' + (on ? ' on' : '')); b.style.background = c; b.onclick = () => set('color', on && !isRoot ? null : c); sws.append(b); });
    const cu = h('label', 'sw custom' + (curC && curC !== 'auto' && !SWATCH.some(c => c.toLowerCase() === curC.toLowerCase()) ? ' on' : ''), I.plus);
    if (curC && curC !== 'auto' && !SWATCH.includes(curC)) cu.style.background = curC;
    const ci = h('input'); ci.type = 'color'; ci.value = /^#[\da-f]{6}$/i.test(curC) ? curC : '#3C3489'; ci.onchange = () => set('color', ci.value); cu.append(ci); sws.append(cu);
    p.append(srow(I.palette, sws));
    p.append(srow(I.photo, seg(SEG_PHOTO, setv(id, 'photo'), v => set('photo', v), { icon: true, clear: !isRoot })));
    const now = Date.now();
    p.append(srow(I.clock, seg([[fmtDate(now, 'd'), 'd'], [fmtDate(now, 'dt').replace('<br>', ' '), 'dt']], setv(id, 'date'), v => set('date', v), { icon: true, clear: !isRoot })));
    if (!isRoot) {
      const sib = tabsOf(t.parent || 'root'); const ix = sib.findIndex(x => x.id === id);
      const mv = h('div', 'seg isg');
      [[I.left, -1], [I.right, 1]].forEach(([ic, dlt]) => { const b = h('button', '', ic); b.type = 'button'; b.onclick = () => { const j = ix + dlt; if (j < 0 || j >= sib.length) return; sib.forEach((x, k) => x.sort = k); const a = sib[ix], c = sib[j]; [a.sort, c.sort] = [c.sort, a.sort]; sib.forEach(x => save(x, true)); render(false); rebuild(); }; mv.append(b); });
      const ar = h('button', 'tgl' + (own.collapsed ? ' on' : ''), I.archive); ar.type = 'button'; ar.onclick = () => set('collapsed', own.collapsed ? null : 1);
      const wrap = h('div', 'rowr'); wrap.append(mv, ar);
      p.append(srow(null, wrap));
    }
    const btns = h('div', 'btns');
    if (Object.keys(own).some(k => k !== 'collapsed')) btns.append(iconBtn(I.reset, () => { const x = get(id); x.data.set = own.collapsed ? { collapsed: 1 } : {}; save(x); rebuild(); }));
    if (musicIds(id).length) btns.append(iconBtn(I.play, () => playAll(id)));
    if (!isRoot) {
      btns.append(iconBtn(I.folderPlus, () => openNewTab(id)));
      btns.append(iconBtn(I.move, () => openMove(id)));
      btns.append(iconBtn(I.trash, () => {
        const n = countDesc(id);
        if (!confirm(`'${t.data.title}'${n ? ' + ' + n : ''} 삭제?`)) return;
        markDeleted(id); closeSheet(); go(t.parent || 'root');
      }, 'danger'));
    } else btns.append(iconBtn(I.key, () => lockScreen()));
    p.append(btns);
  };
  openSheet(build);
}
function countDesc(id) { let n = 0; for (const k of kids(id)) n += 1 + countDesc(k.id); return n; }
function markDeleted(id) { for (const k of [...kids(id)]) markDeleted(k.id); const x = get(id); x.deleted = true; save(x, true); reindex(); render(); }

function openAdd(parent) {
  openSheet(p => {
    const inp = h('input', 'f title'); inp.enterKeyHint = 'done';
    const pf = h('input'); pf.type = 'file'; pf.accept = 'image/*'; pf.multiple = true; pf.hidden = true;
    pf.onchange = () => { closeSheet(); addFiles(pf.files, parent); };
    const mkTab = () => { const name = inp.value.trim(); if (!name) { inp.focus(); return; } const sib = tabsOf(parent); save({ id: uid(), parent, kind: 'tab', sort: sib.length ? Math.max(...sib.map(x => x.sort || 0)) + 1 : 0, data: { title: name, set: {} }, updated: 0, deleted: false }); closeSheet(); };
    const mkCard = () => { const txt = inp.value.trim(); if (!txt) { inp.focus(); return; } closeSheet(); addText(txt, parent); };
    inp.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); (URL_RE.test(inp.value) ? mkCard : mkTab)(); } };
    const row = h('div', 'inrow'); row.append(inp, iconBtn(I.folderPlus, mkTab), iconBtn(I.up, mkCard), iconBtn(I.photo, () => pf.click()), pf); p.append(row);
    setTimeout(() => inp.focus(), 60);
  });
}
function openNewTab(parent) {
  openSheet(p => {
    const inp = h('input', 'f title'); inp.placeholder = '이름'; inp.enterKeyHint = 'done';
    const ok = iconBtn(I.check, () => make(), 'pri');
    const make = () => {
      const name = inp.value.trim(); if (!name) { inp.focus(); return; }
      const sib = tabsOf(parent);
      const t = { id: uid(), parent, kind: 'tab', sort: sib.length ? Math.max(...sib.map(x => x.sort || 0)) + 1 : 0, data: { title: name, set: {} }, updated: 0, deleted: false };
      save(t); closeSheet();
    };
    inp.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); make(); } };
    const box = h('div', 'inrow'); box.append(inp, ok); p.append(box);
    setTimeout(() => inp.focus(), 60);
  });
}
function treeList(p, excludeId, onPick, currentParent) {
  const box = h('div', 'tree');
  const walk = (id, depth) => {
    if (id === excludeId) return;
    const n = get(id);
    const b = h('button', '', id === 'root' ? I.home : esc(n.data.title || ''));
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
    treeList(p, it.kind === 'tab' ? id : null, target => {
      const x = get(id); x.parent = target;
      if (x.kind === 'tab') { const sib = tabsOf(target); x.sort = sib.length ? Math.max(...sib.map(s => s.sort || 0)) + 1 : 0; }
      save(x); closeSheet();
    }, it.parent || 'root');
  });
}

function openCard(id) {
  let dirty = false, tmr;
  const commit = () => { if (!dirty) return; dirty = false; const x = get(id); if (x) save(x); };
  const touch = () => { dirty = true; clearTimeout(tmr); tmr = setTimeout(commit, 700); };
  openSheet(p => {
    const it = get(id), d = it.data;
    p.classList.add('cardsheet');
    let pim = null, zr = null;
    if (d.img) {
      const D = dims(it.parent || 'root');
      const ed = h('div', 'ed'); ed.style.aspectRatio = D.r[0] + ' / ' + D.r[1]; ed.style.background = d.img.color || colorOf(it.parent || 'root');
      pim = h('img'); pim.src = imgSrc(d.img, 'f'); pim.alt = ''; pim.draggable = false;
      pim.onerror = () => { pim.onerror = null; pim.src = imgSrc(d.img, 't'); };
      ed.append(pim); p.append(ed);
      const W = () => ed.clientWidth, H = () => ed.clientHeight;
      const draw = () => applyFocus(pim, get(id).data.img, W(), H());
      requestAnimationFrame(draw); pim.onload = () => { const im = get(id).data.img; if (!(im.w && im.h)) { im.w = pim.naturalWidth; im.h = pim.naturalHeight; } draw(); };
      const pts = new Map(); let pinch = null;
      const norm = im => { if (im.fx == null) { im.fx = 0.5; im.fy = 0.5; } if (!im.z) im.z = 1; };
      const setZ = (z, mx, my) => {
        const im = get(id).data.img; norm(im); const g0 = fitGeo(im, W(), H());
        const ix = (mx + im.fx * g0.ex) / g0.sw, iy = (my + im.fy * g0.ey) / g0.sh;
        im.z = Math.max(1, Math.min(4, z)); const g1 = fitGeo(im, W(), H());
        im.fx = g1.ex ? Math.max(0, Math.min(1, (ix * g1.sw - mx) / g1.ex)) : 0.5;
        im.fy = g1.ey ? Math.max(0, Math.min(1, (iy * g1.sh - my) / g1.ey)) : 0.5;
        if (zr) zr.value = String(im.z); draw();
      };
      const pan = (dx, dy) => { const im = get(id).data.img; norm(im); const g = fitGeo(im, W(), H()); if (g.ex) im.fx = Math.max(0, Math.min(1, im.fx - dx / g.ex)); if (g.ey) im.fy = Math.max(0, Math.min(1, im.fy - dy / g.ey)); draw(); };
      const rect = () => ed.getBoundingClientRect();
      ed.addEventListener('pointerdown', e => {
        e.preventDefault(); ed.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: get(id).data.img.z || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; }
      });
      ed.addEventListener('pointermove', e => {
        if (!pts.has(e.pointerId)) return;
        const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 1 && !pinch) pan(e.clientX - prev.x, e.clientY - prev.y);
        else if (pts.size === 2 && pinch) {
          const [a, b] = [...pts.values()]; const r = rect();
          const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
          pan(mx - (pinch.mx - r.left), my - (pinch.my - r.top)); pinch.mx = mx + r.left; pinch.my = my + r.top;
          setZ(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, mx, my);
        }
        dirty = true;
      });
      const end = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { clearTimeout(tmr); tmr = setTimeout(commit, 300); } };
      ed.addEventListener('pointerup', end); ed.addEventListener('pointercancel', end);
      ed.addEventListener('wheel', e => { e.preventDefault(); const r = rect(); setZ((get(id).data.img.z || 1) * (e.deltaY < 0 ? 1.08 : 0.92), e.clientX - r.left, e.clientY - r.top); dirty = true; clearTimeout(tmr); tmr = setTimeout(commit, 400); }, { passive: false });
      ed.addEventListener('dblclick', e => { const r = rect(); const z = (get(id).data.img.z || 1) > 1.05 ? 1 : 2; setZ(z, e.clientX - r.left, e.clientY - r.top); dirty = true; commit(); });
    }
    const blk = h('div', 'blk');
    const ti = h('input', 'f title'); ti.placeholder = '제목'; ti.value = d.title || '';
    ti.oninput = () => { get(id).data.title = ti.value; touch(); };
    const trow = h('div', 'trow'); trow.append(ti);
    if (d.url) { const yt = d.link && d.link.yt; const a = h('a', 'lico', yt || d.music ? I.music : I.link); a.href = yt ? 'https://music.youtube.com/watch?v=' + yt : d.url; a.target = '_blank'; a.rel = 'noopener'; trow.append(a); }
    const bo = h('textarea', 'f'); bo.placeholder = '내용'; bo.value = d.body || '';
    const grow = () => { bo.style.height = 'auto'; bo.style.height = Math.max(72, Math.min(320, bo.scrollHeight + 2)) + 'px'; };
    bo.oninput = () => { get(id).data.body = bo.value; grow(); touch(); };
    blk.append(trow, bo); p.append(blk); requestAnimationFrame(grow);

    const more = h('div', 'more'); more.hidden = !S.moreOpen;
    const tg = h('button', 'tg', I.down); tg.type = 'button'; tg.classList.toggle('open', !!S.moreOpen);
    tg.onclick = () => { more.hidden = !more.hidden; S.moreOpen = !more.hidden; tg.classList.toggle('open', S.moreOpen); };
    p.append(tg, more);

    const pf = h('input'); pf.type = 'file'; pf.accept = 'image/*'; pf.hidden = true;
    pf.onchange = async () => {
      const f = pf.files[0]; if (!f) return;
      try { const img = await storeImage(f); commit(); const x = get(id); x.data.img = img; save(x); closeSheet(); openCard(id); }
      catch (e) { toast('이 사진은 열 수 없어요'); }
    };
    p.append(pf);

    if (d.img) {
      const zbox = h('div', 'zrow');
      zr = h('input'); zr.type = 'range'; zr.min = '1'; zr.max = '3'; zr.step = '0.05'; zr.value = String(d.img.z || 1);
      zr.max = '4';
      zr.oninput = () => { const x = get(id); x.data.img.z = +zr.value; applyFocus(pim, x.data.img, pim.parentNode.clientWidth, pim.parentNode.clientHeight); dirty = true; clearTimeout(tmr); tmr = setTimeout(commit, 600); };
      zbox.append(zr); more.append(zbox);
    }
    const dtw = h('label', 'dtw'); const dtx = h('span', '', fmtDate(d.at, 'dt').replace('<br>', ' '));
    const dt = h('input'); dt.type = 'datetime-local';
    const at = new Date(d.at || Date.now()); dt.value = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
    dt.onchange = () => { const v = new Date(dt.value).getTime(); if (!isNaN(v)) { get(id).data.at = v; dtx.innerHTML = fmtDate(v, 'dt').replace('<br>', ' '); touch(); } };
    dtw.append(dtx, dt);
    const r1 = h('div', 'rowr'); r1.append(dtw);
    if (d.img) r1.append(seg(SEG_PHOTO, d.photo || '', v => { const x = get(id); if (v) x.data.photo = v; else delete x.data.photo; dirty = true; commit(); closeSheet(); openCard(id); }, { icon: true, clear: true }));
    more.append(r1);
    const btns = h('div', 'btns');
    if (d.music || (!d.url && (d.body || '').trim())) btns.append(iconBtn(I.music, () => { commit(); const q = d.music ? [d.music.title, d.music.artist].filter(Boolean).join(' ') : d.body.trim().split('\n')[0]; closeSheet(); openMusicPick(q, it.parent || 'root', id); }));
    btns.append(iconBtn(I.photo, () => pf.click()));
    if (d.img) btns.append(iconBtn(I.eyeOff, () => { commit(); const x = get(id); delete x.data.img; delete x.data.photo; save(x); closeSheet(); openCard(id); }));
    btns.append(iconBtn(I.move, () => { commit(); openMove(id); }));
    btns.append(iconBtn(I.trash, () => { if (!confirm('삭제?')) return; const x = get(id); x.deleted = true; dirty = false; save(x); closeSheet(); }, 'danger'));
    more.append(btns);
  }, () => { clearTimeout(tmr); commit(); });
}

function openSearch() {
  openSheet(p => {
    const inp = h('input', 'f'); inp.type = 'search'; inp.placeholder = '';
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
      if (!hits.length) out.append(h('div', 'nores', I.none));
      hits.forEach(it => {
        const b = h('button', 'res', `<small>${esc(pathText(it.parent || 'root'))}</small><b>${it.kind === 'tab' ? I.folder.replace('class="ic"', 'class="ic" style="display:inline;width:14px;height:14px;vertical-align:-2px;margin-right:4px"') : ''}${esc(it.kind === 'tab' ? it.data.title : titleOf(it))}</b>`);
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
      try { await api('ping'); closeSheet(); await pull(); push(); }
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
inp.addEventListener('input', () => { autosize(); $('#bar').classList.toggle('has', !!inp.value.trim()); });
inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia('(pointer:fine)').matches) { e.preventDefault(); submit(); } });
inp.addEventListener('paste', e => { const fs = e.clipboardData && e.clipboardData.files; if (fs && fs.length) { e.preventDefault(); addFiles(fs, S.view); } });
$('#bar').addEventListener('submit', e => { e.preventDefault(); submit(); });
function submit() { const txt = inp.value.trim(); if (!txt) { inp.focus(); return; } inp.value = ''; autosize(); $('#bar').classList.remove('has'); addText(txt, S.view); }
$('#photoBtn').onclick = () => $('#file').click();
$('#file').onchange = e => { addFiles(e.target.files, S.view); e.target.value = ''; };
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files, S.view); });
$('#homeBtn').innerHTML = I.home; $('#srchBtn').innerHTML = I.search; $('#playBtn').innerHTML = I.play; $('#playBtn').onclick = () => playAll(S.view); $('#photoBtn').innerHTML = I.photo; $('#sendBtn').innerHTML = I.up;
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
  S.view = hv && S.items.get(hv) ? hv : 'root'; if (hv && S.view === 'root') S.pendingView = hv;
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
