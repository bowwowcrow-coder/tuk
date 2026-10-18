// 일정 공용 모듈: 반복 전개 + 알림 시각 계산 + 한국어 날짜 파서 (브라우저·Worker 공용)
export const DAY = 86400000;
const KST = 9 * 60; // 분

// ---- 시간대: 모든 계산을 KST 기준 '벽시계'로 한다 (서버는 UTC라서)
export function toKST(ms) { return new Date(ms + KST * 60000); }           // UTC 메서드로 읽으면 KST 벽시계
export function fromKST(y, m, d, hh = 0, mm = 0) { return Date.UTC(y, m, d, hh, mm) - KST * 60000; }
export function kstParts(ms) { const t = toKST(ms); return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), hh: t.getUTCHours(), mm: t.getUTCMinutes(), wd: t.getUTCDay() }; }
export function dayStart(ms) { const p = kstParts(ms); return fromKST(p.y, p.m, p.d); }
export function sameDay(a, b) { return dayStart(a) === dayStart(b); }

// ---- 반복 전개: ev.start(ms), ev.repeat = null | {f:'d'|'w'|'m', days?:[0..6], until?:ms}
// from~to 범위에 드는 발생 시각(ms) 목록
export function occurrences(ev, from, to, limit = 200) {
  const out = [];
  if (!ev || ev.start == null) return out;
  const r = ev.repeat;
  if (!r || !r.f) { if (ev.start >= from && ev.start <= to) out.push(ev.start); return out; }
  const until = r.until ? Math.min(r.until, to) : to;
  const p0 = kstParts(ev.start);
  if (r.f === 'd') {
    let t = ev.start; while (t < from) t += DAY;
    for (; t <= until && out.length < limit; t += DAY) out.push(t);
  } else if (r.f === 'w') {
    const days = (r.days && r.days.length ? r.days : [p0.wd]).slice().sort();
    let t = dayStart(Math.max(from, ev.start)) - 7 * DAY;
    for (let i = 0; i < 400 && out.length < limit; i++, t += DAY) {
      const p = kstParts(t); if (!days.includes(p.wd)) continue;
      const occ = fromKST(p.y, p.m, p.d, p0.hh, p0.mm);
      if (occ < ev.start || occ < from) continue; if (occ > until) break;
      out.push(occ);
    }
  } else if (r.f === 'm') {
    const pf = kstParts(Math.max(from, ev.start));
    for (let k = -1; k < 60 && out.length < limit; k++) {
      const y = pf.y + Math.floor((pf.m + k) / 12), m = ((pf.m + k) % 12 + 12) % 12;
      const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      const occ = fromKST(y, m, Math.min(p0.d, dim), p0.hh, p0.mm);
      if (occ < ev.start || occ < from) continue; if (occ > until) break;
      out.push(occ);
    }
  }
  return out;
}

// ---- 알림: ev.remind = [ {k:'min', v:10} | {k:'eve', v:'21:00'} | {k:'morn', v:'08:00'} ] → 발생 시각 occ 기준 fireAt
export function fireTimes(ev, occ) {
  const out = [];
  for (const r of ev.remind || []) {
    if (r.k === 'min') out.push(occ - (r.v || 0) * 60000);
    else if (r.k === 'eve' || r.k === 'morn') {
      const [hh, mm] = String(r.v || (r.k === 'eve' ? '21:00' : '08:00')).split(':').map(Number);
      const p = kstParts(occ); out.push(fromKST(p.y, p.m, p.d - (r.k === 'eve' ? 1 : 0), hh, mm));
    }
  }
  return out;
}

// ---- 한국어 날짜·시간 파서. 반환 {start, allDay, title} / 날짜 못 읽으면 start null
const WD = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
export function parseKo(text, now = Date.now()) {
  let s = ' ' + text.replace(/\s+/g, ' ').trim() + ' ';
  const np = kstParts(now);
  let y = null, m = null, d = null, hh = null, mm = null, dateFound = false;
  const take = (re, fn) => { const x = s.match(re); if (x) { fn(x); s = s.replace(x[0], ' '); return true; } return false; };
  // 절대 날짜
  take(/\s(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})\s?/, x => { y = +x[1]; m = +x[2] - 1; d = +x[3]; dateFound = true; }) ||
  take(/\s(\d{1,2})[.\/](\d{1,2})\s?/, x => { m = +x[1] - 1; d = +x[2]; dateFound = true; }) ||
  take(/\s(\d{1,2})월\s?(\d{1,2})일\s?/, x => { m = +x[1] - 1; d = +x[2]; dateFound = true; }) ||
  take(/\s(\d+)일\s?(뒤|후)\s?/, x => { const p = kstParts(now + (+x[1]) * DAY); y = p.y; m = p.m; d = p.d; dateFound = true; }) ||
  take(/\s(\d{1,2})일\s?/, x => { d = +x[1]; dateFound = true; });
  // 상대 날짜
  if (!dateFound) {
    const rel = { 오늘: 0, 내일: 1, 모레: 2, 글피: 3, 어제: -1 };
    for (const k in rel) if (take(new RegExp('\\s' + k + '\\s?'), () => {})) { const p = kstParts(now + rel[k] * DAY); y = p.y; m = p.m; d = p.d; dateFound = true; break; }
  }
  if (!dateFound) {
    take(/\s(?:(이번\s?주|다음\s?주|다다음\s?주)\s?([일월화수목금토])(요일|욜)?|()([일월화수목금토])(요일|욜))\s/, x => {
      x = [x[0], x[1] || x[4], x[2] || x[5], x[3] || x[6]];
      const wk = x[1] ? (x[1].startsWith('다다') ? 2 : x[1].startsWith('다음') ? 1 : 0) : 0;
      const target = WD[x[2]]; let delta = (target - np.wd + 7) % 7; if (delta === 0 && !x[1]) delta = 0; delta += wk * 7;
      if (!x[1] && delta === 0 && kstParts(now).hh >= 20) delta = 7;
      const p = kstParts(now + delta * DAY); y = p.y; m = p.m; d = p.d; dateFound = true;
    });
  }
  // 시간
  let ampm = null;
  take(/\s(오전|오후|아침|저녁|밤|새벽|낮)\s?/, x => { ampm = x[1]; });
  take(/\s(\d{1,2}):(\d{2})\s?/, x => { hh = +x[1]; mm = +x[2]; }) ||
  take(/\s(\d{1,2})시\s?(반|(\d{1,2})분)?\s?/, x => { hh = +x[1]; mm = x[2] === '반' ? 30 : x[3] ? +x[3] : 0; }) ||
  take(/\s(정오)\s?/, () => { hh = 12; mm = 0; }) || take(/\s(자정)\s?/, () => { hh = 0; mm = 0; });
  if (hh != null) {
    if (ampm && /오후|저녁|밤|낮/.test(ampm) && hh < 12) hh += 12;
    if (ampm === '새벽' && hh === 12) hh = 0;
    if (!ampm && hh >= 1 && hh <= 6) hh += 12; // 맥락 없는 1~6시는 오후로
  }
  const hasDate = dateFound, hasTime = hh != null;
  if (!dateFound && hh != null) { const p = kstParts(now); y = p.y; m = p.m; d = p.d; dateFound = true; if (fromKST(y, m, d, hh, mm || 0) < now - 60000) { const q = kstParts(now + DAY); y = q.y; m = q.m; d = q.d; } }
  if (!dateFound) return { start: null, allDay: hh == null, title: text.trim(), hasDate, hasTime };
  if (y == null) y = np.y; if (m == null) m = np.m;
  let start = fromKST(y, m, d, hh == null ? 0 : hh, mm || 0);
  if (!/\d{4}/.test(text) && start < dayStart(now) - DAY) start = fromKST(y + 1, m, d, hh == null ? 0 : hh, mm || 0);
  return { start, allDay: hh == null, title: s.replace(/\s+/g, ' ').trim(), hasDate, hasTime, hh, mm: mm || 0 };
}

export function fmtTime(ms) { const p = kstParts(ms); return String(p.hh).padStart(2, '0') + ':' + String(p.mm).padStart(2, '0'); }
export function fmtDay(ms) { const p = kstParts(ms); return (p.m + 1) + '.' + p.d + ' ' + '일월화수목금토'[p.wd]; }
