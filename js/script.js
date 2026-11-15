'use strict';
/* ====== CONFIG — modifie ici ====== */
const CONFIG = {
  musicSrc: 'assets/music/notre-chanson.mp3',            // ex : 'assets/music/notre-chanson.mp3' (vide = pas de musique)
  maxHearts: matchMedia('(max-width:700px)').matches ? 70 : 140,
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ====== Fond d'étoiles (canvas léger) ====== */
function initStarfield() {
  const c = $('#sky'), x = c.getContext('2d'); let w, h, stars = [];
  const resize = () => { w = c.width = innerWidth; h = c.height = innerHeight;
    stars = Array.from({ length: Math.min(90, w / 12) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.5 + .3, s: Math.random() * .25 + .05, p: Math.random() * 6 })); };
  addEventListener('resize', resize); resize();
  (function draw(t) {
    x.clearRect(0, 0, w, h);
    for (const s of stars) { s.y -= reduced ? 0 : s.s; if (s.y < 0) s.y = h;
      x.fillStyle = `rgba(243,183,198,${.3 + .4 * Math.sin(t / 1000 + s.p)})`; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 7); x.fill(); }
    if (!reduced) requestAnimationFrame(draw);
  })(0);
}

/* ====== Cœurs (intro, pluie, quiz) ====== */
function spawnHeart({ rise = false, big = 1 } = {}) {
  const box = $('#hearts');
  if (box.childElementCount > CONFIG.maxHearts) return;
  const h = document.createElement('span');
  h.className = 'heart' + (rise ? ' rise' : '');
  h.textContent = pick(['❤️', '💗', '💖', '🤍', '✨', '❤']);
  const dur = 3 + Math.random() * 5;
  h.style.cssText = `left:${Math.random() * 100}vw;font-size:${(12 + Math.random() * 30) * big}px;opacity:${.35 + Math.random() * .65};--dx:${Math.random() * 80 - 40}px;--r:${Math.random() * 90 - 45}deg;animation-duration:${dur}s;animation-delay:${Math.random()}s`;
  box.appendChild(h); setTimeout(() => h.remove(), (dur + 1.2) * 1000);
}
const burst = (n = 25, opts) => { if (reduced) n = Math.min(n, 6); for (let i = 0; i < n; i++) spawnHeart(opts); };

/* ====== Navigation / intro ====== */
function typeText(el, html, speed = 38) {
  return new Promise(res => { const parts = html.split('<br>'); el.innerHTML = ''; let i = 0, p = 0;
    const tick = () => { if (p >= parts.length) return res();
      if (i === 0 && p > 0) el.insertAdjacentHTML('beforeend', '<br>');
      el.insertAdjacentText('beforeend', parts[p][i++] ?? '');
      if (i > parts[p].length) { p++; i = 0; } setTimeout(tick, reduced ? 1 : speed); };
    tick(); });
}
async function initIntro() {
  const t = $('#introText'), txt = t.innerHTML; t.textContent = '';
  const btn = $('#enter'); btn.style.opacity = 0;
  await sleep(900); await typeText(t, txt); btn.style.transition = 'opacity 1.5s'; btn.style.opacity = 1;
  btn.onclick = async () => { burst(60); $('#intro').classList.add('out'); $('#main').hidden = false;
    document.body.classList.remove('locked'); scrollTo(0, 0); await sleep(1600); $('#intro').hidden = true; };
}
function initScrollLinks() { $$('[data-scroll]').forEach(b => b.onclick = () => $(b.dataset.scroll).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })); }
let revealObserver;
function initReveals() { // cartes + séquences de texte au scroll
  revealObserver = new IntersectionObserver(es => es.forEach(async e => {
    if (!e.isIntersecting) return; revealObserver.unobserve(e.target);
    if (e.target.classList.contains('reveal')) { await sleep($$('.reveal', e.target.parentNode).indexOf(e.target) * 250); e.target.classList.add('on'); }
    else for (const s of $$('.seq', e.target)) { s.classList.add('on'); await sleep(+s.dataset.t === 2 ? 3200 : 2400); }
  }), { threshold: .35 });
  $$('.reveal').forEach(el => revealObserver.observe(el)); $$('#notend,#final').forEach(el => revealObserver.observe(el));
}
function initParallax() { // parallaxe légère sur le titre
  if (reduced) return; const el = $('[data-parallax]');
  addEventListener('scroll', () => { el.style.transform = `translateY(${scrollY * .25}px)`; }, { passive: true });
}

/* ====== Jeu 1 : pluie de cœurs ====== */
function initHeartRain() {
  const ov = $('#rainOverlay'), ph = $('#rainPhrase'); let run = 0;
  const phrases = ['Beaucoup.', 'Encore plus.', 'Toujours plus.', 'Tu crois vraiment que ça s’arrête ici ?', 'Non.', 'Même pas proche.', 'Encore.', 'Toujours.'];
  async function play() {
    const id = ++run; ov.hidden = false; $('#rainEnd').hidden = true; ph.hidden = false;
    for (let i = 0; i < phrases.length && id === run; i++) {
      ph.textContent = phrases[i]; ph.style.animation = 'none'; ph.offsetWidth; ph.style.animation = 'in 1s both';
      const n = 4 + i * 6, end = Date.now() + 2200; // intensité croissante
      while (Date.now() < end && id === run) { burst(Math.ceil(n / 6), { rise: Math.random() < .25 }); await sleep(260); }
    }
    if (id !== run) return;
    ph.hidden = true; $('#rainEnd').hidden = false; burst(50, { big: 1.4 });
    for (let k = 0; k < 14 && id === run; k++) { burst(12); await sleep(400); } // l'animation continue
  }
  $('#loveBtn').onclick = play; $('#again').onclick = play;
  $('#closeRain').onclick = () => { run++; ov.hidden = true; $('#g2').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); };
}

/* ====== Jeu 2 : tout ce que je ressens ====== */
function initFeelings() {
  const sets = [
    ['J’aime ton sourire.', 'J’aime ta façon d’être.', 'J’aime les moments avec toi.', 'J’aime même les petits détails que tu ne remarques probablement pas.', 'J’aime la personne que tu es.', 'Et plus je te connais...', 'plus je découvre de nouvelles raisons de t’aimer.', '<h3>Et pourtant... je n’ai pas encore fini.</h3>'],
    ['J’aime l’idée de te retrouver, peu importe la journée.', 'J’aime me sentir chez moi à tes côtés.', 'J’aime tout ce que tu fais de moi.', '<h3>Et il en reste encore.</h3>'],
    ['J’aime que tu existes. Simplement.', 'Hermine.', '<h3>Tout est là, et ce n’est pas encore tout.</h3>'],
  ]; let n = 0, busy = false;
  const out = $('#feelings'), more = $('#moreFeel');
  async function show(lines) { busy = true; more.hidden = true;
    for (const l of lines) { out.insertAdjacentHTML('beforeend', l.startsWith('<') ? l : `<p>${l}</p>`); burst(3); await sleep(1500); }
    busy = false; more.hidden = n >= sets.length; }
  $$('[data-yes]').forEach(b => b.onclick = () => { $('#g2ask').hidden = true; show(sets[n++]); });
  more.onclick = () => { if (!busy && n < sets.length) show(sets[n++]); };
}

/* ====== Jeu 3 : teste mon amour ====== */
function initQuiz() {
  const rep = ['10 ? Hermine... tu me sous-estimes énormément.', 'Beaucoup plus.', 'Tu commences à comprendre.', 'EXACTEMENT. ❤️'];
  $$('#quiz button').forEach(b => b.onclick = () => { const i = +b.dataset.a; $('#quizOut').textContent = '« ' + rep[i] + ' »'; burst(i === 3 ? 60 : 8); });
}

/* ====== Jeu 4 : attrape mon cœur ====== */
function initCatchGame() {
  const a = $('#arena'), h = $('#catchHeart'); let n = 0;
  h.onclick = () => { n++; $('#catchScore').textContent = `Cœurs attrapés : ${n}`; burst(3);
    h.style.left = Math.random() * (a.clientWidth - 64) + 'px'; h.style.top = Math.random() * (a.clientHeight - 64) + 'px';
    const m = $('#catchMsg'); if (n === 8) m.textContent = '« Tu pensais vraiment pouvoir attraper tout mon amour ? »';
    if (n === 12) m.textContent = '« Impossible. Il est beaucoup trop grand. »'; };
}

/* ====== Interactions diverses ====== */
function initInteractions() {
  $('#dayBtn').onclick = () => { $('#dayOut').textContent = '« Moi, je choisirais probablement toutes celles où tu étais là. »'; burst(20); };
  const go = async () => { const o = $('#wordOut'), b = $('#wordBtn'); b.disabled = true;
    o.innerHTML = '<p>« J’aurais accepté presque tous les mots... »</p>'; await sleep(2200);
    o.insertAdjacentHTML('beforeend', '<h3>« Mais moi, j’en connais un qui résume tout : NOUS. ❤️ »</h3>'); burst(40); b.disabled = false; };
  $('#wordBtn').onclick = go; $('#wordIn').onkeydown = e => { if (e.key === 'Enter') go(); };
  $$('.flip').forEach(c => c.onclick = () => { c.classList.toggle('open'); burst(5); });
  $('#restart').onclick = () => { scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    setTimeout(() => { $$('.seq,.reveal').forEach(e => e.classList.remove('on')); initReveals(); }, 1500); };
}

/* ====== Musique (facultative) ====== */
function initMusic() {
  const b = $('#music'); let audio = null, on = false;
  b.onclick = () => { if (!CONFIG.musicSrc) { b.textContent = 'Aucune musique ajoutée'; setTimeout(() => b.textContent = '▶ Musique', 2000); return; }
    audio = audio || Object.assign(new Audio(CONFIG.musicSrc), { loop: true, volume: .5 });
    on = !on; on ? audio.play() : audio.pause(); b.textContent = on ? '⏸ Pause' : '▶ Musique'; };
}

document.addEventListener('DOMContentLoaded', () => {
  initStarfield(); initIntro(); initScrollLinks(); initReveals(); initParallax();
  initHeartRain(); initFeelings(); initQuiz(); initCatchGame(); initInteractions(); initMusic();
});
