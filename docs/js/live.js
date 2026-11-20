/* Breakaway — 2D game panel: a real rink outline, ten skaters and two goalies, a clock and the scorers */
(function (G) {
  'use strict';
  const RW = 200, RH = 85;   // rink units (feet)

  // game minute for a playoff game, with intermission pauses between periods
  function playoffClock(elapsed, dur, ot) {
    const ints = ot ? 3 : 2, intMs = dur * 0.05;
    const perMs = (dur - ints * intMs) / (3 + (ot ? 0.25 : 0));
    let t = elapsed;
    for (let p = 0; p < 3; p++) {
      if (t < perMs) return { min: p * 20 + 20 * t / perMs, inter: null };
      t -= perMs;
      if (p < 2 || ot) { if (t < intMs) return { min: (p + 1) * 20, inter: p + 1 }; t -= intMs; }
    }
    if (ot) return { min: Math.min(65.2, 60 + 5 * t / (perMs * 0.25)), inter: null };
    return { min: 60, inter: null };
  }
  function score(tl, min) {
    let a = 0, b = 0, last = null;
    tl.ev.forEach(e => { if (e.t <= min) { if (e.s === 'a') a++; else b++; last = e; } });
    return { a, b, last };
  }
  function perScores(tl, min) {
    const rows = [[0, 0], [0, 0], [0, 0], [0, 0]];
    tl.ev.forEach(e => { if (e.t <= min) rows[Math.min(3, Math.floor(e.t / 20))][e.s === 'a' ? 0 : 1]++; });
    return rows;
  }
  function mmss(m) { const s = Math.max(0, Math.round(m * 60)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function period(min, tl) {
    if (min >= tl.total - 0.01 && min >= 60) return tl.ev.some(e => e.so) ? 'Final/SO' : tl.ev.some(e => e.ot) ? 'Final/OT' : 'Final';
    if (min >= 60) return 'OT';
    return ['1st', '2nd', '3rd'][Math.min(2, Math.floor(min / 20))];
  }
  function clock(min, tl) {
    if (min >= tl.total - 0.01 && min >= 60) return '';
    if (min >= 60) return mmss(65 - min);
    const p = Math.min(2, Math.floor(min / 20));
    return mmss(20 - (min - p * 20));
  }
  function clockText(min, tl) { const c = clock(min, tl); return period(min, tl) + (c ? ' ' + c : ''); }
  function stamp(e) {
    if (e.so) return 'SO';
    if (e.t >= 60) return 'OT ' + mmss(e.t - 60);
    const p = Math.floor(e.t / 20);
    return ['1st', '2nd', '3rd'][p] + ' ' + mmss(e.t - p * 20);
  }
  function goalLine(e) { return e.s === 'a' ? (e.sc || 'Goal') + (e.a1 ? ' (' + e.a1 + (e.a2 ? ', ' + e.a2 : '') + ')' : ' (unassisted)') : ''; }

  // ---------------------------------------------------------------- puck path
  // wander through the neutral zone; in the minute before a goal, carry it into the
  // scoring team's attacking zone and then into the net
  function wander(min, anim) {
    const x = 100 + 62 * Math.sin(min * 1.6 + 1.3 * Math.sin(min * 0.41)) + 6 * Math.sin(anim / 310);
    const y = 42.5 + 26 * Math.sin(min * 2.3 + 0.7 + Math.cos(min * 0.9)) + 4 * Math.cos(anim / 270);
    return { x, y };
  }
  function puckAt(tl, min, anim) {
    let next = null, prev = null;
    for (const e of tl.ev) { if (e.t > min) { next = e; break; } prev = e; }
    if (prev && min - prev.t < 0.4) {
      const net = prev.s === 'a' ? 189 : 11;
      return { x: net + (prev.s === 'a' ? 2 : -2), y: 42.5, goal: prev };
    }
    const w = wander(min, anim);
    if (next && next.t - min < 1.1 && !next.so) {
      const k = 1 - (next.t - min) / 1.1;
      const dir = next.s === 'a' ? 1 : -1;
      const zone = { x: 100 + dir * 68, y: 42.5 + 18 * Math.sin(min * 5) };
      if (k < 0.75) { const q = k / 0.75; return { x: w.x + (zone.x - w.x) * q, y: w.y + (zone.y - w.y) * q }; }
      const q = (k - 0.75) / 0.25, net = { x: 100 + dir * 89, y: 42.5 };
      return { x: zone.x + (net.x - zone.x) * q, y: zone.y + (net.y - zone.y) * q };
    }
    return w;
  }

  // ---------------------------------------------------------------- canvas
  function draw(cv, o) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const s = Math.min((w - 6) / RW, (h - 6) / RH), ox = (w - RW * s) / 2, oy = (h - RH * s) / 2;
    const X = x => ox + x * s, Y = y => oy + y * s;

    // ice and boards
    c.save();
    rr(c, X(0), Y(0), RW * s, RH * s, 28 * s);
    c.fillStyle = '#eef4fa'; c.fill();
    c.clip();
    const ln = (x, col, wd) => { c.beginPath(); c.moveTo(X(x), Y(0)); c.lineTo(X(x), Y(RH)); c.strokeStyle = col; c.lineWidth = wd * s; c.stroke(); };
    ln(11, 'rgba(200,16,46,.6)', 0.6); ln(189, 'rgba(200,16,46,.6)', 0.6);
    ln(75, 'rgba(30,80,190,.75)', 1.4); ln(125, 'rgba(30,80,190,.75)', 1.4);
    ln(100, 'rgba(200,16,46,.75)', 1.4);
    circ(c, X(100), Y(42.5), 15 * s, 'rgba(30,80,190,.6)', 0.5 * s);
    dot(c, X(100), Y(42.5), 0.9 * s, 'rgba(30,80,190,.8)');
    [[31, 20.5], [31, 64.5], [169, 20.5], [169, 64.5]].forEach(([x, y]) => {
      circ(c, X(x), Y(y), 15 * s, 'rgba(200,16,46,.6)', 0.5 * s);
      c.beginPath();
      // hash marks on the outside of the circle
      [-1, 1].forEach(sx => [-1, 1].forEach(sy => { const hx = x + sx * 2.9, y0 = y + sy * Math.sqrt(225 - 2.9 * 2.9); c.moveTo(X(hx), Y(y0)); c.lineTo(X(hx), Y(y0 + sy * 2.5)); }));
      // L-marks around the dot
      [-1, 1].forEach(sx => [-1, 1].forEach(sy => { c.moveTo(X(x + sx * 2), Y(y + sy * 4.5)); c.lineTo(X(x + sx * 2), Y(y + sy * 1.5)); c.lineTo(X(x + sx * 6), Y(y + sy * 1.5)); }));
      c.strokeStyle = 'rgba(200,16,46,.6)'; c.lineWidth = 0.45 * s; c.stroke();
      dot(c, X(x), Y(y), 1.6 * s, 'rgba(200,16,46,.85)');
    });
    [[80, 20.5], [80, 64.5], [120, 20.5], [120, 64.5]].forEach(([x, y]) => dot(c, X(x), Y(y), 1.6 * s, 'rgba(200,16,46,.85)'));
    [[11, -1], [189, 1]].forEach(([x, d]) => {
      c.beginPath(); c.arc(X(x), Y(42.5), 6 * s, d < 0 ? -Math.PI / 2 : Math.PI / 2, d < 0 ? Math.PI / 2 : Math.PI * 1.5);
      c.fillStyle = 'rgba(90,160,235,.35)'; c.fill(); c.strokeStyle = 'rgba(200,16,46,.6)'; c.lineWidth = 0.4 * s; c.stroke();
      c.strokeStyle = '#c8102e'; c.lineWidth = 0.7 * s;
      c.strokeRect(d < 0 ? X(x - 3.4) : X(x), Y(39.5), 3.4 * s, 6 * s);
    });
    c.restore();
    rr(c, X(0), Y(0), RW * s, RH * s, 28 * s);
    c.strokeStyle = '#b9c7d8'; c.lineWidth = 2; c.stroke();

    // motion
    const T = o.anim / 1000;
    const playing = !o.final && !o.inter && o.tl;
    const pk = playing ? puckAt(o.tl, o.min, o.anim) : { x: 100, y: 42.5 };
    function skaters(dir, col, edge) {
      // dir 1 = attacks right. Forwards around the puck, defense between puck and own net
      const offs = [[-4, -13], [5, 1], [-4, 14], [-24, -16], [-24, 17]];
      offs.forEach((of, i) => {
        const jx = 7 * Math.sin(T * (1.9 + i * 0.37) + i * 2.1 + dir) + 4 * Math.sin(T * (4.7 + i * 0.6) + i);
        const jy = 6 * Math.cos(T * (1.6 + i * 0.43) + i * 1.3 + dir) + 3 * Math.sin(T * (5.3 + i * 0.5) + i * 0.7);
        let x = playing ? pk.x + dir * of[0] + jx : 100 - dir * (8 + i * 9);
        let y = playing ? pk.y + of[1] + jy : 14 + i * 14;
        [x, y] = inRink(x, y, 3.5);
        player(c, X(x), Y(y), 2.6 * s, col, edge);
      });
      const gx = dir > 0 ? 13 : 187;
      player(c, X(gx), Y(42.5 + (pk.y - 42.5) * 0.12), 2.9 * s, col, edge);
    }
    skaters(1, o.c1, o.c2);
    skaters(-1, '#5d6b7d', '#e9eef4');
    dot(c, X(pk.x), Y(pk.y), 1.4 * s, '#0b0f14');

    // overlays
    const sc = playing && pk.goal ? pk.goal : null;
    if (sc || o.inter || o.final) {
      const big = o.final ? 'FINAL' : o.inter ? 'END OF ' + ['', '1ST', '2ND', '3RD'][o.inter] : sc.s === 'a' ? 'GOAL!' : 'GOAL ' + (o.oppAbbr || '');
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = sc && sc.s === 'a' ? 'rgba(200,16,46,.92)' : 'rgba(11,15,20,.8)';
      c.font = '800 ' + Math.round(Math.min(h * 0.2, 30)) + 'px "Barlow Condensed",system-ui,sans-serif';
      c.fillText(big, w / 2, h * 0.36);
      if (sc && sc.s === 'a') {
        c.fillStyle = 'rgba(11,15,20,.85)';
        c.font = '700 ' + Math.round(Math.min(h * 0.11, 15)) + 'px "Barlow Condensed",system-ui,sans-serif';
        c.fillText(goalLine(sc), w / 2, h * 0.56);
      }
    }
  }
  // keep a point inside the rounded boards, m units from the edge
  const CR = 28;
  function inRink(x, y, m) {
    x = Math.max(m, Math.min(RW - m, x)); y = Math.max(m, Math.min(RH - m, y));
    const cx = x < CR ? CR : x > RW - CR ? RW - CR : null, cy = y < CR ? CR : y > RH - CR ? RH - CR : null;
    if (cx !== null && cy !== null) {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), lim = CR - m;
      if (d > lim) { x = cx + dx / d * lim; y = cy + dy / d * lim; }
    }
    return [x, y];
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function circ(c, x, y, r, col, wd) { c.beginPath(); c.arc(x, y, r, 0, 7); c.strokeStyle = col; c.lineWidth = wd; c.stroke(); }
  function dot(c, x, y, r, f) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = f; c.fill(); }
  function player(c, x, y, r, f, s) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = f; c.fill(); c.lineWidth = Math.max(1.2, r * 0.45); c.strokeStyle = s; c.stroke(); }

  G.LIVE = { playoffClock, score, perScores, clockText, period, clock, stamp, goalLine, draw };
})(window.BK = window.BK || {});
