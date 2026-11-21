/* Breakaway — random, players, gear, ratings, chemistry */
(function (G) {
  'use strict';
  const D = G.DATA;

  // ---------------------------------------------------------------- rng
  function rand() { return Math.random(); }
  function ri(a, b) { return a + Math.floor(rand() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function gammaUnit(k) { let s = 0; for (let i = 0; i < k; i++) s += -Math.log(1 - rand()); return s / k; }
  function binomial(n, p) { if (p <= 0) return 0; if (p >= 1) return n; let c = 0; for (let i = 0; i < n; i++) if (rand() < p) c++; return c; }
  function weightedIndex(weights) {
    let t = 0; for (let i = 0; i < weights.length; i++) t += weights[i];
    let r = rand() * t;
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
    return weights.length - 1;
  }
  // ids must stay unique across reloads: a per-load counter collided with saved ids
  function uid(prefix) { return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36); }

  // ---------------------------------------------------------------- nations
  // favourite country: a small nation is lifted to 10% of draws, a big one gains 8 points;
  // everyone else shrinks proportionally so the league still looks like itself
  let fav = null;
  function setFavorite(code) { fav = code || null; }
  function nationWeights() {
    const total = D.NATIONS.reduce((s, n) => s + n.w, 0);
    if (!fav) return D.NATIONS.map(n => n.w / total);
    const f = D.NATIONS.find(n => n.c === fav);
    if (!f) return D.NATIONS.map(n => n.w / total);
    const share = f.w / total;
    const target = share < 0.10 ? 0.10 : Math.min(0.6, share + 0.08);
    const rest = 1 - share;
    return D.NATIONS.map(n => n.c === fav ? target : (n.w / total) * (1 - target) / rest);
  }
  function rollNation(forceCode) {
    if (forceCode) { const f = D.NATIONS.find(n => n.c === forceCode); if (f) return f; }
    return D.NATIONS[weightedIndex(nationWeights())];
  }
  function nationOf(p) { return D.NATIONS.find(n => n.c === p.nat) || D.NATIONS[0]; }
  // never hand out a full name the roster already has
  function nameFor(code, avoid) {
    const pool = D.NAMES[code] || D.NAMES._;
    let n = '';
    for (let i = 0; i < 25; i++) { n = pick(pool.f) + ' ' + pick(pool.l); if (!avoid || !avoid[n]) break; }
    return n;
  }

  // ---------------------------------------------------------------- gear
  function makeGear(rarityKey, kind, slotKey) {
    const slots = D.GEAR_SLOTS[kind];
    const slot = slotKey ? slots.find(s => s.k === slotKey) : pick(slots);
    const band = D.GEAR_BANDS[rarityKey];
    return {
      id: uid('g'), rarity: rarityKey, kind, slot: slot.k, level: 0,
      p: ri(band.p[0], band.p[1]),
      s: band.s[1] > 0 && slot.s ? ri(Math.max(1, band.s[0]), band.s[1]) : 0
    };
  }
  function gearName(g) { const slot = D.GEAR_SLOTS[g.kind].find(s => s.k === g.slot); return (g.hof ? 'Hall of Fame' : D.RARITY[D.RIDX[g.rarity]].n) + ' ' + slot.n; }
  function gearBonus(g) { return g.p; }
  function gearValue(g) { return gearBonus(g) + g.s * 0.6; }

  // ---------------------------------------------------------------- players
  function rollType(pos) {
    if (pos === 'G') return 'goalie';
    const t = D.TYPE_ODDS[pos === 'D' ? 'D' : 'F'];
    return t[weightedIndex(t.map(x => x[1]))][0];
  }
  function typeOf(p) { return D.TYPES[p.type] || D.TYPES[p.pos === 'G' ? 'goalie' : p.pos === 'D' ? 'twd' : 'twoway']; }
  function rarityOf(p) { return D.RARITY[D.RIDX[p.rarity]]; }
  function capOf(p) { return rarityOf(p).cap; }
  // per-attribute cap: strengths reach the rarity cap, other skills 90%, weaknesses 78%; legendary is 99 across the board
  // Type shapes the caps (strengths high, weaknesses low) but never the ceiling: each (position, type)
  // gets a scale so that a fully trained player reaches exactly the rarity cap in Overall.
  const CAP_F = { str: 1, other: 0.88, weak: 0.74 }, capScale = {};
  function capShape(t, key) { return t.str.indexOf(key) >= 0 ? CAP_F.str : t.weak.indexOf(key) >= 0 ? CAP_F.weak : CAP_F.other; }
  function scaleFor(p) {
    const k = p.pos + '|' + p.type;
    if (capScale[k]) return capScale[k];
    const w = D.OVR_W[p.pos] || D.OVR_W.LW, t = typeOf(p);
    let s = 0; for (const a in w) s += w[a] * capShape(t, a);
    return (capScale[k] = 1 / s);
  }
  // breakthroughs (p.capB) lift every cap of an Epic player, never past 99
  // Legendary skaters still follow their type: the base is 95 Overall, so strengths reach 99 but a
  // Sniper's grit tops out around 79. Breakthroughs raise the base the same way, never past 95.
  // Legendary base 95 shaped by type; six breakthroughs (+18) walk an Epic's base up to that same Legendary base.
  const LEG_BASE = 95, BREAK_FULL = 18, legCache = {};
  // Overall is scaled per position and type so a fully trained Legendary reads exactly 99, while his weak
  // skills still stop short (a Two-Way winger keeps his modest shot). Goalies need no scaling.
  function legBase() { return LEG_BASE; }
  function ovrK(p) {
    if (p.pos === 'G') return 1;
    const k = p.pos + '|' + p.type; if (legCache[k]) return legCache[k];
    const w = D.OVR_W[p.pos] || D.OVR_W.LW, t = typeOf(p), sc = scaleFor(p);
    let s = 0; for (const a in w) s += w[a] * Math.min(99, Math.round(LEG_BASE * capShape(t, a) * sc));
    return (legCache[k] = 99 / s);
  }
  function attrCap(p, key) {
    const cap = capOf(p), b = p.capB || 0;
    if (p.pos === 'G') return p.rarity === 'legendary' ? 99 : Math.min(99, Math.round(b ? cap + Math.min(1, b / BREAK_FULL) * (99 - cap) : cap));
    const LB = legBase(p);
    const base = p.rarity === 'legendary' ? LB : b ? cap + Math.min(1, b / BREAK_FULL) * (LB - cap) : Math.min(LB, cap);
    return Math.min(99, Math.round(base * capShape(typeOf(p), key) * scaleFor(p)));
  }

  function blankLine(isG) {
    return isG ? { gp: 0, w: 0, l: 0, ga: 0, sa: 0, so: 0, pim: 0 }
      : { gp: 0, g: 0, a: 0, p: 0, pm: 0, s: 0, hits: 0, blk: 0, ht: 0, pim: 0 };
  }

  function makePlayer(pos, rarityKey, targetOvr, nationCode, opts) {
    opts = opts || {};
    const isG = pos === 'G';
    const attrs = isG ? D.GOALIE_ATTRS : D.SKATER_ATTRS;
    const nat = rollNation(nationCode);
    const p = {
      id: uid('p'), name: nameFor(nat.c, opts.avoid), num: 0, nat: nat.c, pos,
      type: opts.type || rollType(pos), rarity: rarityKey,
      a: {}, gear: {}, xf: null, xf2: null, tb: {}, tbc: {}, awards: [],
      season: blankLine(isG), career: blankLine(isG), best: blankLine(isG), history: []
    };
    const base = targetOvr == null ? 10 : targetOvr;
    const t = typeOf(p);
    attrs.forEach(k => {
      let v = base + ri(-3, 3);
      if (t.str.indexOf(k) >= 0) v += 3;
      if (t.weak.indexOf(k) >= 0) v -= 3;
      p.a[k] = clamp(Math.round(v), 1, attrCap(p, k));
    });
    p.tend = rollTend(p);
    p.tendV = 2;
    Object.assign(p, bodyFor(p, rand));
    if (opts.avoid) opts.avoid[p.name] = 1;
    return p;
  }
  // height (inches) and weight (lb): flavour only, shaped by position and type, weight follows height
  const BODY = { F: [72.5, 1.9, 194], D: [74, 1.8, 205], G: [74, 1.6, 196] };
  const BODY_TYPE = { power: [0.6, 14], enforcer: [1, 22], sniper: [-0.4, -6], playmaker: [-0.7, -8], twoway: [0, 0], ofd: [-0.5, -6], dfd: [0.8, 10], twd: [0, 0] };
  function bodyFor(p, rnd) {
    const g = p.pos === 'G' ? 'G' : p.pos === 'D' ? 'D' : 'F', b = BODY[g], t = BODY_TYPE[p.type] || [0, 0];
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 1.15;
    const ht = clamp(Math.round(b[0] + t[0] + gauss() * b[1]), 67, 80);
    const wt = clamp(Math.round(b[2] + t[1] + (ht - b[0]) * 6.5 + gauss() * 8), 160, 255);
    return { ht, wt };
  }
  function heightText(ht) { return Math.floor(ht / 12) + '′' + (ht % 12) + '″'; }

  // three tendencies, never two from the same group; about half good, half bad
  function rollTend(p, rnd) {
    const r = rnd || rand, pool = Object.keys(D.TENDENCIES).filter(k => !!D.TENDENCIES[k].g === (p.pos === 'G'));
    const out = [], used = {};
    // weighted by the player's type: Snipers lean Shoots First and Natural Scorer, Enforcers lean Big Hitter and Hothead
    const wt = k => { const t = D.TENDENCIES[k]; return t.w && t.w[p.type] != null ? t.w[p.type] : 1; };
    for (let i = 0; i < 60 && out.length < 3; i++) {
      const free = pool.filter(k => !used[D.TENDENCIES[k].x]); if (!free.length) break;
      const ws = free.map(wt), tot = ws.reduce((s, x) => s + x, 0); let x = r() * tot, j = 0;
      while (j < free.length - 1 && x >= ws[j]) { x -= ws[j]; j++; }
      used[D.TENDENCIES[free[j]].x] = 1; out.push(free[j]);
    }
    return out;
  }
  // the combined effect of a player's tendencies on one sim weight (multiplied, or summed for save %)
  function tfx(p, key, playoff) {
    let m = key === 'sv' ? 0 : 1;
    (p && p.tend || []).forEach(k => {
      const f = D.TENDENCIES[k] && D.TENDENCIES[k].fx; if (!f) return;
      if (key === 'sv') { m += (f.sv || 0) + (playoff ? f.po_sv || 0 : 0); return; }
      if (f[key] != null) m *= f[key];
      if (key === 'goal' && playoff && f.po_goal) m *= f.po_goal;
    });
    return m;
  }
  // older saves: goalies had four skills and players had no type
  function migratePlayer(p) {
    if (!p.tend || !p.tendV) { p.tendV = 2; let s = 7; for (let i = 0; i < p.id.length; i++) s = (s * 33 + p.id.charCodeAt(i)) >>> 0; p.tend = rollTend(p, () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }); }
    if (!p.ht) { let s = 0; for (let i = 0; i < p.id.length; i++) s = (s * 31 + p.id.charCodeAt(i)) >>> 0; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; Object.assign(p, bodyFor(p, r)); }
    if (p.pos === 'G' && p.a.reflexes != null) {
      const r = p.a.reflexes, pos = p.a.positioning || r;
      p.a = { gloveHigh: r, gloveLow: r, blockerHigh: r, blockerLow: r, fiveHole: r, quickness: r, positioning: pos, rebound: p.a.rebound || r, iq: pos, puckhandling: p.a.puckhandling || r };
    }
    if (!p.type) {
      if (p.pos === 'G') p.type = 'goalie';
      else if (p.pos === 'D') p.type = (p.a.passing + p.a.shooting > p.a.defense + p.a.grit + 3) ? 'ofd' : (p.a.defense + p.a.grit > p.a.passing + p.a.shooting + 3) ? 'dfd' : 'twd';
      else {
        const a = p.a, sc = { sniper: a.shooting + a.hands, playmaker: a.passing + a.iq, power: a.shooting + a.grit, twoway: a.defense + a.iq, enforcer: a.grit + a.defense - 4 };
        p.type = Object.keys(sc).sort((x, y) => sc[y] - sc[x])[0];
      }
    }
    p.tb = p.tb || {}; p.tbc = p.tbc || {}; p.awards = p.awards || [];
    if (p.xf2 === undefined) p.xf2 = null;
    if (p.season.pim == null) p.season.pim = 0;
    if (p.career.pim == null) p.career.pim = 0;
    Object.keys(p.a).forEach(k => { p.a[k] = Math.min(p.a[k], attrCap(p, k)); });
  }

  // boosts are applied through a hook the state module installs
  let boostHook = null;
  function setBoostHook(fn) { boostHook = fn; }

  // effective attribute = trained + gear + trophy bonus + active boosts (all sit on top of the cap)
  function eff(p, key) {
    let v = p.a[key] || 0;
    if (p.legacyB && p.a[key] != null) v += p.legacyB;
    const kind = p.pos === 'G' ? 'goalie' : 'skater';
    D.GEAR_SLOTS[kind].forEach(slot => {
      const g = p.gear[slot.k];
      if (!g) return;
      if (slot.p === key) v += gearBonus(g);
      else if (slot.s === key) v += g.s;
    });
    if (p.tb && p.tb[key]) v += p.tb[key];
    if (boostHook) v += boostHook(p, key);
    return v;
  }
  function effAll(p) { const o = {}; (p.pos === 'G' ? D.GOALIE_ATTRS : D.SKATER_ATTRS).forEach(k => { o[k] = eff(p, k); }); return o; }
  function overall(p) { const w = D.OVR_W[p.pos] || D.OVR_W.LW; let t = 0; for (const k in w) t += w[k] * eff(p, k); return Math.round(t * ovrK(p)); }
  function trainedOverall(p) { const w = D.OVR_W[p.pos] || D.OVR_W.LW; let t = 0; for (const k in w) t += w[k] * (p.a[k] || 0); return Math.round(t * ovrK(p)); }
  function isGold(p) { return overall(p) > 99; }
  // early points are discounted (about 40% at a rating of 10, full price from 30 up) so the first hours have plenty to buy
  function upgradeCost(value) { const T = D.TUNING, early = Math.max(0.4, Math.min(1, (value + 2) / 32)); return Math.max(1, Math.round(T.costBase * Math.pow(T.costGrowth, value) * early * (T.costMult || 1))); }
  function xfSlots(p) { const i = D.RIDX[p.rarity]; return i >= 4 ? 2 : i >= 2 ? 1 : 0; }
  function hasXF(p, k) { return !!p && (p.xf === k || p.xf2 === k); }

  // ---------------------------------------------------------------- chemistry
  // Games together is the big, permanent part: it keeps growing and by 1,000 games it has
  // fully erased any bad fit. Fit (types and countries) is small and instant.
  const CHEM_FADE = 1000;
  function chemMult(games) { return 1 + gamesBonus(games); }
  function gamesBonus(g) { return 0.16 * Math.log(1 + g / 10) / Math.log(101); }
  function pairKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
  function avgGames(ids, chem) {
    let t = 0, n = 0;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { t += chem[pairKey(ids[i], ids[j])] || 0; n++; }
    return n ? t / n : 0;
  }
  function gamesChem(ids, chem) { return 1 + gamesBonus(avgGames(ids, chem)); }
  // fit parts, each { t: label, v: value }
  function fitParts(ps) {
    ps = ps.filter(Boolean);
    const parts = [], types = ps.map(p => p.type), nats = ps.map(p => p.nat);
    if (ps.length === 3) {
      const dup = types.length - new Set(types).size;
      if (dup) parts.push({ t: dup === 2 ? 'three of one type' : 'two of one type', v: -0.04 * dup });
      else parts.push({ t: 'mixed roles', v: 0.02 });
    } else if (ps.length === 2 && ps[0].pos === 'D') {
      const s = types.slice().sort().join('+');
      if (s === 'dfd+ofd') parts.push({ t: 'OFD + DFD', v: 0.04 });
      else if (s === 'twd+twd') parts.push({ t: 'two TWDs', v: 0.04 });
      else if (s === 'ofd+ofd') parts.push({ t: 'two OFDs', v: -0.04 });
      else if (s === 'dfd+dfd') parts.push({ t: 'two DFDs', v: -0.02 });
    }
    if (ps.length > 1 && ps.some(p => (p.tend || []).indexOf('leader') >= 0)) parts.push({ t: 'leader', v: 0.02 });
    const natSame = nats.length - new Set(nats).size;
    if (ps.length > 1 && natSame && natSame === nats.length - 1) parts.push({ t: 'all ' + nationOf(ps[0]).n, v: 0.05 });
    else if (natSame) parts.push({ t: 'shared country', v: 0.015 });
    return parts;
  }
  function fitChem(ps) { const parts = fitParts(ps); return { mult: 1 + parts.reduce((s, x) => s + x.v, 0), notes: parts.map(x => x.t) }; }
  // the full picture for one line or pair: games, fit parts (negatives already faded), total and stars
  function chemInfo(ids, chem, ps) {
    const g = avgGames(ids, chem), fade = Math.max(0, 1 - g / CHEM_FADE);
    const parts = fitParts(ps).map(x => ({ t: x.t, v: x.v < 0 ? x.v * fade : x.v, faded: x.v < 0 && fade < 1 }));
    const gb = gamesBonus(g), mult = 1 + gb + parts.reduce((s, x) => s + x.v, 0);
    return { games: Math.round(g), gb, parts, mult, stars: chemStars(mult) };
  }
  function unitChem(ids, chem, roster) {
    const ps = roster ? ids.map(id => roster.find(p => p.id === id)) : [];
    return chemInfo(ids, chem, ps).mult;
  }
  function chemStars(mult) {
    const gain = mult - 1;
    if (gain >= 0.16) return 5; if (gain >= 0.12) return 4; if (gain >= 0.08) return 3;
    if (gain >= 0.04) return 2; if (gain >= 0.01) return 1; return 0;
  }

  // ---------------------------------------------------------------- roster
  function makeRoster(targetOvr, rarityKey) {
    const r = [], used = {}, avoid = {};
    function num() { let n; do { n = ri(1, 99); } while (used[n]); used[n] = 1; return n; }
    const slots = [];
    for (let i = 0; i < 4; i++) slots.push('LW', 'C', 'RW');
    for (let i = 0; i < 6; i++) slots.push('D');
    slots.push('G', 'G');
    slots.forEach(pos => { const p = makePlayer(pos, rarityKey, targetOvr, null, { avoid }); p.num = num(); r.push(p); });
    return r;
  }
  function defaultLineup(roster) {
    const by = pos => roster.filter(p => p.pos === pos);
    const lw = by('LW'), c = by('C'), rw = by('RW'), d = by('D'), g = by('G');
    const lines = []; for (let i = 0; i < 4; i++) lines.push([lw[i].id, c[i].id, rw[i].id]);
    const pairs = []; for (let j = 0; j < 3; j++) pairs.push([d[j * 2].id, d[j * 2 + 1].id]);
    return { lines, pairs, goalies: [g[0].id, g[1].id] };
  }

  G.M = {
    rand, ri, pick, clamp, gammaUnit, binomial, weightedIndex, uid,
    setFavorite, nationWeights, rollNation, nameFor, nationOf,
    makeGear, gearName, gearBonus, gearValue,
    rollType, typeOf, makePlayer, migratePlayer, heightText, blankLine, attrCap,
    eff, effAll, overall, trainedOverall, isGold, rarityOf, capOf, upgradeCost, xfSlots, hasXF, setBoostHook,
    chemMult, chemStars, pairKey, gamesChem, fitChem, unitChem, chemInfo, avgGames, CHEM_FADE,
    makeRoster, defaultLineup, rollTend, tfx
  };
})(window.BK = window.BK || {});
