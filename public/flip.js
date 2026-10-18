// 두 면 전환: 켜면 일정, 왼쪽 위 글리프로 뒤집기. #해시가 메모 탭이면 메모로 시작
import { boot, setKey } from './schedule.js';
const sv = p => `<svg class="ic" viewBox="0 0 24 24">${p}</svg>`;
const SQ = sv('<rect x="5" y="5" width="14" height="14" rx="2.5"/>'), CI = sv('<circle cx="12" cy="12" r="7"/>');
const S = document.getElementById('faceS'), M = document.getElementById('faceM');
let hasKey = false; try { hasKey = !!localStorage.getItem('tuk_key'); } catch (e) {}
let cur = (location.hash.length > 1 || !hasKey) ? 'M' : 'S', busy = false;
document.querySelector('#faceS .flip').innerHTML = SQ;
document.getElementById('flipM').innerHTML = CI;
function show(which) {
  if (busy || which === cur) return; busy = true;
  const from = cur === 'S' ? S : M, to = which === 'S' ? S : M;
  from.classList.add('out');
  setTimeout(() => {
    from.classList.remove('out'); from.hidden = true; to.hidden = false; to.classList.add('in');
    setTimeout(() => { to.classList.remove('in'); busy = false; }, 280);
    cur = which; try { sessionStorage.setItem('tuk_face', which); } catch (e) {}
  }, 210);
}
window.showFace = show;
document.querySelector('#faceS .flip').onclick = () => show('M');
document.getElementById('flipM').onclick = () => show('S');
if (cur === 'M') { S.hidden = true; M.hidden = false; }
boot();
window.addEventListener('tuk-key', e => setKey(e.detail));
