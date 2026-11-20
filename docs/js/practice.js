/* Breakaway — Train tab: the tap clicker (income scales with team overall, combo multiplies it)
   and the Shooting Drill, a 90-second tarp round with lit holes */
(function (G) {
  'use strict';
  const D = G.DATA, M = G.M, ST = G.ST;

  function multFor(combo) { const T = D.TUNING; return 1 + Math.min(1, combo / T.comboMaxHits) * (T.comboMaxMult - 1); }

  // ---------------------------------------------------------------- clicker
  const ck = { combo: 0, last: 0, best: 0, carry: 0 };
  function credit(v) { ck.carry += v; const w = Math.floor(ck.carry); if (w > 0) { ST.addPucks(w); ck.carry -= w; } }
  // no human taps faster than ~16 a second: anything quicker (an autoclicker, a second finger) earns nothing
  const MIN_TAP_MS = 60;
  function tap() {
    const now = performance.now();
    if (now - ck.last < MIN_TAP_MS) return { v: 0, mult: multFor(ck.combo), combo: ck.combo };
    if (now - ck.last > D.TUNING.comboDecayMs) ck.combo = 0;
    ck.combo++; ck.last = now;
    if (ck.combo > ck.best) ck.best = ck.combo;
    const mult = multFor(ck.combo), v = ST.clickValue() * mult;
    credit(v);
    if (ST.countTap) ST.countTap();
    if (ST.noteCombo) ST.noteCombo(ck.combo);
    return { v, mult, combo: ck.combo };
  }
  function tapGolden() { const mult = multFor(ck.combo), v = 25 * ST.clickValue() * mult; credit(v); return { v }; }
  function clickState() {
    const now = performance.now();
    const alive = ck.combo > 0 && now - ck.last <= D.TUNING.comboDecayMs;
    if (!alive) ck.combo = 0;
    return { combo: ck.combo, mult: multFor(ck.combo), decay: alive ? 1 - (now - ck.last) / D.TUNING.comboDecayMs : 0 };
  }

  // ---------------------------------------------------------------- shooting drill
  const HOLES = [
    { x: 0.15, y: 0.25, n: 'Top shelf' }, { x: 0.5, y: 0.2, n: 'Bar down' }, { x: 0.85, y: 0.25, n: 'Top shelf' },
    { x: 0.14, y: 0.76, n: 'Low glove' }, { x: 0.5, y: 0.8, n: 'Five-hole' }, { x: 0.86, y: 0.76, n: 'Low blocker' }
  ];
  let el = null, cb = null, running = false, raf = 0, W = 0, H = 0, t0 = 0, dur = 30000;
  let combo = 0, lastHit = 0, best = 0, banked = 0, hits = 0, misses = 0, carry = 0;
  let targets = [], tseq = 0, spawnAt = 0, hot = null, hotAt = 0, holes = [], shooter = null, banner = null;

  function measure() { if (!el) return; const r = el.getBoundingClientRect(); W = r.width; H = r.height; }
  function add(tag, cls) { const n = document.createElement(tag); n.className = cls; el.appendChild(n); return n; }
  function netBox() { const top = H * 0.05, h = H * 0.5, w = Math.min(W * 0.88, h * 1.62); return { x: (W - w) / 2, y: top, w, h }; }
  function holeSize(b) {
    const st = ST.get();
    const ids = st ? st.team.lineup.lines[0] : [];
    const ps = ids.map(id => st.team.roster.find(p => p.id === id)).filter(Boolean);
    const sh = ps.length ? ps.reduce((s, p) => s + M.eff(p, 'shooting'), 0) / ps.length : 10;
    return Math.max(42, Math.min(48 + sh * 0.42, b.h * 0.36, b.w * 0.22));
  }

  function start(container, onEvent) {
    el = container; cb = onEvent;
    combo = 0; best = 0; banked = 0; hits = 0; misses = 0; carry = 0;
    targets = []; hot = null; holes = []; banner = null;
    const now = performance.now();
    t0 = now; lastHit = now; spawnAt = 0; hotAt = now + 3500 + Math.random() * 2500;
    el.innerHTML = ''; el.className = 'rink drill-gallery';
    measure();
    const st = ST.get(), b = netBox(), hs = holeSize(b);
    const tarp = add('div', 'tarp');
    Object.assign(tarp.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' });
    if (st) tarp.style.setProperty('--tarp', st.team.c1);
    tarp.innerHTML = '<span class="tarp-cloth"></span><span class="tarp-logo"></span>';
    holes = HOLES.map((o, i) => {
      const n = document.createElement('button');
      n.type = 'button'; n.className = 'hole'; n.dataset.hole = String(i);
      n.style.width = n.style.height = hs + 'px';
      n.style.left = (o.x * b.w) + 'px'; n.style.top = (o.y * b.h) + 'px';
      n.innerHTML = '<span class="hole-ring"></span><span class="hole-dot"></span>';
      tarp.appendChild(n);
      return { node: n, x: b.x + o.x * b.w, y: b.y + o.y * b.h, n: o.n, lit: false };
    });
    shooter = add('div', 'shooter');
    shooter.innerHTML = '<svg viewBox="0 0 120 70" width="120" height="70" aria-hidden="true"><path d="M104 4 70 52c-3 4-7 6-12 6H24a6 6 0 0 0 0 12h36c9 0 17-4 22-11L114 10z" fill="#2a2016"/><path d="M22 58h40" stroke="#f2f2f2" stroke-width="4" stroke-dasharray="5 3" opacity=".7"/><ellipse cx="46" cy="50" rx="12" ry="5" fill="#0b0f14"/></svg>';
    running = true;
    el.addEventListener('pointerdown', onTap);
    raf = requestAnimationFrame(loop);
  }
  function cleanup() { running = false; cancelAnimationFrame(raf); if (el) { el.removeEventListener('pointerdown', onTap); el.innerHTML = ''; } }
  function result(complete) { return { banked, best, hits, misses, sec: Math.round((performance.now() - t0) / 1000), complete }; }
  function stop() { if (!running) return null; cleanup(); return result(false); }
  // a clean round pays a big finish bonus on top of the hits: accuracy matters as much as speed
  function finish() {
    const acc = hits / Math.max(1, hits + misses), bonus = hits >= 10 ? Math.round(ST.clickValue() * hits * acc * acc * 6) : 0;
    if (bonus) pay(bonus);
    cleanup(); if (cb) cb(Object.assign({ type: 'end', bonus, acc: Math.round(acc * 100) }, result(true)));
  }

  function mult() { return multFor(combo); }
  function pay(v) { carry += v; const w = Math.floor(carry); if (w > 0) { ST.addPucks(w); banked += w; carry -= w; } }

  function spawn(now) {
    // 30 hectic seconds: up to 5 lit holes at once, a new one every quarter second
    if (targets.length >= 5 || now - spawnAt < 240) return;
    spawnAt = now;
    const free = holes.map((h, i) => i).filter(i => !holes[i].lit);
    if (!free.length) return;
    const i = free[Math.floor(Math.random() * free.length)], hl = holes[i];
    hl.lit = true;
    hl.node.classList.remove('done', 'ripple', 'expired');
    hl.node.classList.add('lit');
    targets.push({ node: hl.node, x: hl.x, y: hl.y, born: now, life: 1150, hole: i });
  }
  function unlight(t, why) {
    targets = targets.filter(x => x !== t);
    const hl = holes[t.hole]; hl.lit = false; hl.node.classList.remove('lit');
    if (why === 'expire') { hl.node.classList.remove('expired'); void hl.node.offsetWidth; hl.node.classList.add('expired'); }
  }
  function fireShot(tx, ty, wide) {
    const sx = W / 2 - 14, sy = H - 24;
    const pk = add('div', 'shotpuck');
    pk.style.left = sx + 'px'; pk.style.top = sy + 'px';
    const k = wide ? 1.35 : 1;
    pk.animate([{ transform: 'translate(-50%,-50%) translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(-50%,-50%) translate(' + (tx - sx) * k + 'px,' + (ty - sy) * k + 'px) scale(.45)', opacity: wide ? 0 : 1 }],
      { duration: wide ? 260 : 150, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => pk.remove();
    const svg = shooter && shooter.querySelector('svg');
    if (svg) svg.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(0)' }], { duration: 180 });
  }
  function pop(x, y, txt, cls) {
    const s = add('div', 'pop ' + (cls || ''));
    s.style.left = x + 'px'; s.style.top = y + 'px'; s.textContent = txt;
    setTimeout(() => s.remove(), 700);
  }
  function flash(txt, cls) {
    if (banner) banner.remove();
    const b = banner = add('div', 'rbanner ' + (cls || ''));
    b.textContent = txt;
    setTimeout(() => { b.remove(); if (banner === b) banner = null; }, 1300);
  }

  function onTap(e) {
    if (!running) return;
    const now = performance.now();
    const hn = e.target.closest('.hole');
    if (hn) {
      e.preventDefault();
      const hl = holes[+hn.dataset.hole];
      const tg = targets.find(x => holes[x.hole] === hl);
      if (tg) {
        const snipe = now - tg.born < 300;
        unlight(tg, 'hit');
        fireShot(hl.x, hl.y, false);
        hl.node.classList.add('done');
        setTimeout(() => hl.node.classList.add('ripple'), 140);
        let inHot = hot && Math.hypot(hl.x - hot.x, hl.y - hot.y) < hot.r;
        const add_ = inHot ? 3 : snipe ? 2 : 1;
        combo += add_; hits++; lastHit = now; if (combo > best) best = combo;
        const v = ST.clickValue() * 3 * mult() * add_;
        if (ST.countTap) ST.countTap(2);
        pay(v);
        pop(hl.x, hl.y, '+' + ST.fmt(v), inHot ? 'hot' : snipe ? 'snipe' : '');
        pop(hl.x, hl.y - 26, inHot ? 'Hot zone +3' : snipe ? 'Snipe! ×2' : hl.n, 'lbl' + (snipe ? ' snipe' : ''));
      } else { fireShot(hl.x, hl.y, true); pop(hl.x, hl.y, 'Not lit', 'bad'); misses++; }
      if (cb) cb({ type: 'hit', combo, mult: mult() });
      return;
    }
    const r = el.getBoundingClientRect();
    fireShot(e.clientX - r.left, e.clientY - r.top, true);
    pop(e.clientX - r.left, e.clientY - r.top, 'Wide', 'bad');
    misses++;
  }

  function loop(now) {
    if (!running) return;
    if (!W) measure();
    if (now - t0 >= dur) { finish(); return; }
    spawn(now);
    targets.slice().forEach(t => {
      const age = now - t.born;
      if (age >= t.life) { unlight(t, 'expire'); misses++; }
      else t.node.style.setProperty('--k', (1 - age / t.life).toFixed(3));
    });
    if (!hot && now > hotAt) {
      hot = { x: W * (0.2 + Math.random() * 0.6), y: H * (0.1 + Math.random() * 0.4), r: Math.min(W, H) * 0.24, until: now + 3000 };
      const n = add('div', 'hotzone');
      n.style.left = hot.x + 'px'; n.style.top = hot.y + 'px'; n.style.width = n.style.height = (hot.r * 2) + 'px';
      hot.node = n;
    }
    if (hot && now > hot.until) { hot.node.remove(); hot = null; hotAt = now + 3500 + Math.random() * 2500; }
    if (combo > 0 && now - lastHit > D.TUNING.comboDecayMs) { combo = 0; flash('Combo reset', 'bad'); }
    const decay = combo > 0 ? Math.max(0, 1 - (now - lastHit) / D.TUNING.comboDecayMs) : 0;
    if (cb) cb({ type: 'tick', combo, mult: mult(), decay, left: Math.max(0, dur - (now - t0)), dur, banked });
    raf = requestAnimationFrame(loop);
  }

  G.PRACTICE = {
    tap, tapGolden, clickState, multFor, start, stop,
    get running() { return running; }, get clickBest() { return ck.best; }
  };
})(window.BK = window.BK || {});
