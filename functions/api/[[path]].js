const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

let ready = false;
async function init(db) {
  if (ready) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS items(id TEXT PRIMARY KEY, parent TEXT, kind TEXT, sort REAL, data TEXT, updated INTEGER, deleted INTEGER DEFAULT 0, srv INTEGER)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS ix_srv ON items(srv)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS imgs(key TEXT PRIMARY KEY, ct TEXT, body BLOB)`)
  ]);
  ready = true;
}

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

function ytId(u) {
  try {
    const x = new URL(u);
    if (x.hostname === 'youtu.be') return x.pathname.slice(1).split('/')[0];
    if (/(^|\.)youtube\.com$/.test(x.hostname)) {
      if (x.searchParams.get('v')) return x.searchParams.get('v');
      const m = x.pathname.match(/\/(shorts|embed|live)\/([\w-]{6,})/);
      if (m) return m[2];
    }
  } catch (e) {}
  return null;
}

function decode(s) {
  return (s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

async function meta(url) {
  const id = ytId(url);
  if (id) {
    const music = /music\.youtube\.com/.test(url);
    let title = '', author = '', topic = false;
    try {
      const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id));
      if (r.ok) { const o = await r.json(); title = cleanTitle(o.title || ''); const an = o.author_name || ''; topic = /\s-\sTopic$/.test(an); author = topic ? an.replace(/\s*-\s*Topic$/, '') : ''; }
    } catch (e) {}
    return { type: music ? 'music' : 'video', yt: id, title, author, topic, image: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg', site: music ? 'YouTube Music' : 'YouTube' };
  }
  const out = { type: 'link', title: '', image: '', site: '' };
  try { out.site = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return out; }
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'ko,en;q=0.8' }, redirect: 'follow', cf: { cacheTtl: 3600 } });
    const ct = r.headers.get('content-type') || '';
    if (ct.startsWith('image/')) { out.image = url; return out; }
    const reader = r.body.getReader(); let html = '', n = 0; const dec = new TextDecoder();
    while (n < 300000) { const { done, value } = await reader.read(); if (done) break; n += value.length; html += dec.decode(value, { stream: true }); if (/<\/head>/i.test(html)) break; }
    try { reader.cancel(); } catch (e) {}
    const pick = (re) => { const m = html.match(re); return m ? decode(m[1]) : ''; };
    const prop = (p) => pick(new RegExp('<meta[^>]+(?:property|name)=["\']' + p + '["\'][^>]*content=["\']([^"\']*)', 'i')) || pick(new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' + p + '["\']', 'i'));
    out.title = prop('og:title') || prop('twitter:title') || pick(/<title[^>]*>([^<]*)/i);
    let img = prop('og:image') || prop('twitter:image');
    if (img) { try { img = new URL(img, r.url).href; } catch (e) {} out.image = img; }
    const sn = prop('og:site_name'); if (sn) out.site = sn;
  } catch (e) {}
  return out;
}

function cleanTitle(t) {
  return (t || '').replace(/【[^】]*】/g, ' ').replace(/^\s*\[[^\]]*\]\s*/, '').replace(/\((official|lyrics?|mv|m\/v|audio|가사|고음질)[^)]*\)/gi, ' ').split(/\s+[|｜]\s+/)[0].replace(/\s{2,}/g, ' ').trim() || t;
}
async function itunes(q) {
  try {
    const r = await fetch('https://itunes.apple.com/search?media=music&entity=song&limit=6&country=KR&term=' + encodeURIComponent(q), { cf: { cacheTtl: 3600 } });
    const j = await r.json();
    return (j.results || []).map(x => ({
      src: 'apple', title: x.trackName, artist: x.artistName, album: x.collectionName,
      art: (x.artworkUrl100 || '').replace(/100x100bb/, '600x600bb'),
      url: 'https://music.youtube.com/search?q=' + encodeURIComponent(x.trackName + ' ' + x.artistName)
    }));
  } catch (e) { return []; }
}
async function ytSearch(q) {
  try {
    const r = await fetch('https://www.youtube.com/results?hl=ko&gl=KR&search_query=' + encodeURIComponent(q), { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'accept-language': 'ko,en;q=0.8' }, cf: { cacheTtl: 3600 } });
    const html = await r.text();
    const m = html.match(/var ytInitialData\s*=\s*(\{.+?\});<\/script>/s);
    if (!m) return [];
    const out = [];
    const walk = o => {
      if (!o || typeof o !== 'object' || out.length >= 6) return;
      if (o.videoRenderer && o.videoRenderer.videoId) {
        const v = o.videoRenderer;
        out.push({ src: 'youtube', yt: v.videoId, title: cleanTitle((v.title && v.title.runs && v.title.runs.map(t => t.text).join('')) || ''), artist: (o => /\s-\sTopic$/.test(o) ? o.replace(/\s*-\s*Topic$/, '') : '')((v.ownerText && v.ownerText.runs && v.ownerText.runs[0].text) || ''), url: 'https://music.youtube.com/watch?v=' + v.videoId, art: 'https://i.ytimg.com/vi/' + v.videoId + '/mqdefault.jpg' });
        return;
      }
      for (const k in o) walk(o[k]);
    };
    walk(JSON.parse(m[1]));
    return out;
  } catch (e) { return []; }
}

export async function onRequest({ request: req, env, params }) {
  const path = (params.path || []).join('/');
  const url = new URL(req.url);

  if (req.method === 'GET' && path.startsWith('img/')) {
    const key = path.slice(4), hd = { 'cache-control': 'public, max-age=31536000, immutable' };
    if (env.IMG) {
      const obj = await env.IMG.get(key);
      if (obj) return new Response(obj.body, { headers: { ...hd, 'content-type': obj.httpMetadata?.contentType || 'image/jpeg' } });
    }
    if (env.DB) {
      await init(env.DB);
      const r = await env.DB.prepare('SELECT ct, body FROM imgs WHERE key=?').bind(key).first();
      if (r) return new Response(new Uint8Array(r.body), { headers: { ...hd, 'content-type': r.ct || 'image/jpeg' } });
    }
    return new Response('not found', { status: 404 });
  }

  if (!env.TUK_KEY) return J({ error: 'TUK_KEY 환경변수가 설정되지 않았어요' }, 500);
  if (req.headers.get('x-tuk-key') !== env.TUK_KEY) return J({ error: 'unauthorized' }, 401);
  if (!env.DB) return J({ error: 'DB 연결(바인딩)이 없어요' }, 500);
  await init(env.DB);

  if (path === 'ping') return J({ ok: true, store: env.IMG ? 'r2' : 'd1' });

  if (path === 'sync' && req.method === 'GET') {
    const since = Number(url.searchParams.get('since') || 0);
    const { results } = await env.DB.prepare('SELECT id,parent,kind,sort,data,updated,deleted,srv FROM items WHERE srv > ? ORDER BY srv').bind(since).all();
    let max = since;
    const items = results.map(r => { if (r.srv > max) max = r.srv; return { id: r.id, parent: r.parent, kind: r.kind, sort: r.sort, data: JSON.parse(r.data || '{}'), updated: r.updated, deleted: !!r.deleted }; });
    return J({ srv: max, items });
  }

  if (path === 'push' && req.method === 'POST') {
    const { items = [] } = await req.json();
    let now = Date.now();
    const st = env.DB.prepare(`INSERT INTO items(id,parent,kind,sort,data,updated,deleted,srv) VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET parent=excluded.parent, kind=excluded.kind, sort=excluded.sort, data=excluded.data, updated=excluded.updated, deleted=excluded.deleted, srv=excluded.srv
      WHERE excluded.updated >= items.updated`);
    const batch = items.slice(0, 500).map(it => st.bind(String(it.id), it.parent || null, it.kind || 'card', Number(it.sort) || 0, JSON.stringify(it.data || {}), Number(it.updated) || now, it.deleted ? 1 : 0, now++));
    if (batch.length) await env.DB.batch(batch);
    return J({ ok: true, n: batch.length });
  }

  if (path.startsWith('img/') && req.method === 'PUT') {
    const key = path.slice(4);
    if (!/^[\w.-]{8,80}$/.test(key)) return J({ error: 'bad key' }, 400);
    const ct = req.headers.get('content-type') || 'image/jpeg';
    if (env.IMG) await env.IMG.put(key, req.body, { httpMetadata: { contentType: ct } });
    else {
      const buf = await req.arrayBuffer();
      if (buf.byteLength > 1900000) return J({ error: 'too large' }, 413);
      await env.DB.prepare('INSERT OR REPLACE INTO imgs(key,ct,body) VALUES(?,?,?)').bind(key, ct, buf).run();
    }
    return J({ ok: true });
  }

  if (path === 'meta') {
    const u = url.searchParams.get('url');
    if (!u || !/^https?:\/\//.test(u)) return J({ error: 'bad url' }, 400);
    return J(await meta(u));
  }

  if (path === 'music') {
    const q = (url.searchParams.get('q') || '').trim().slice(0, 200);
    if (!q) return J({ items: [] });
    const [a, y] = await Promise.all([ytSearch(q), itunes(q)]);
    const items = [];
    for (let i = 0; i < 6; i++) { if (y[i]) items.push(y[i]); if (a[i]) items.push(a[i]); }
    return J({ items: items.slice(0, 10) });
  }

  if (path === 'proxy') {
    const u = url.searchParams.get('u');
    if (!u || !/^https?:\/\//.test(u)) return J({ error: 'bad url' }, 400);
    const r = await fetch(u, { headers: { 'user-agent': UA }, cf: { cacheTtl: 86400 } });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok || !ct.startsWith('image/')) return J({ error: 'not image' }, 415);
    return new Response(r.body, { headers: { 'content-type': ct, 'cache-control': 'no-store' } });
  }

  return J({ error: 'not found' }, 404);
}
