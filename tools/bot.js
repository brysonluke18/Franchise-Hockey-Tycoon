// Playtest bot (dev only, not linked from the page). Plays N seasons in a chosen style.
//  taps/avgMult: how hard the player taps per game (0 = idle player)
//  spend: 'spread' (cheapest attribute anywhere), 'stars' (top line, top pair, starter only), 'offense' (forwards' scoring only)
//  loyal: never moves acquisitions into the lineup and never trades
//  trader: combines picks upward, rescouts weak picks, trades every spare
//  facShare: max share of the bank to spend on a facility at once (0 = never)
//  offlineHours: hours away between each pair of sessions (adds offline earnings, no taps)
window.runBot = function (opts) {
  const B = window.BK, ST = B.ST, M = B.M, D = B.DATA, UI = B.UI;
  opts = Object.assign({ seasons: 12, taps: 60, avgMult: 2.5, tapsPlayoff: 90, fav: 'CA', spend: 'spread', loyal: false, trader: false, facShare: 0.3, traits: true, offlineEvery: 0 }, opts || {});
  UI.queueCard = () => {}; UI.maybeSheets = () => {}; UI.toast = () => {}; UI.render = () => {}; UI.header = () => {};
  ST.wipe();
  ST.newGame({ city: 'Bot', name: 'Bots', abbr: 'BOT', c1: '#c00', c2: '#fff', c3: '#000', pattern: 'yoke', crest: 'shield', fav: opts.fav });
  const st = ST.get();
  st.demo = false; ST.applySpeed();
  const T = D.TUNING, log = [], startIds = st.team.roster.map(p => p.id);
  const tot = { tap: 0, passive: 0, offline: 0, up: 0, fac: 0, rescouts: 0, drafts: 0, draftDiff: 0, games: 0, gearScrap: 0, pkTaken: { shards: 0, gear: 0, xf: 0, boost: 0, pucks: 0 } };
  let minutes = 0;
  const income = (sec, taps) => {
    const p = ST.passiveRate() * sec, t = ST.clickValue() * taps * opts.avgMult;
    for (let i = 0; i < taps; i++) ST.countTap();
    st.pucks += p + t; tot.passive += p; tot.tap += t; minutes += sec / 60; tot.games++;
    if (opts.offlineEvery && tot.games % opts.offlineEvery === 0) { const o = ST.passiveRate() * 0.25 * Math.min(ST.offlineHours(), opts.offlineHours || 4) * 3600; st.pucks += o; tot.offline += o; }
  };
  const lineupPlayers = () => ST.lineupIds().map(id => st.team.roster.find(p => p.id === id)).filter(Boolean);
  const OFF = ['shooting', 'hands', 'passing'];
  function spendTargets() {
    const L = st.team.lineup, by = id => st.team.roster.find(p => p.id === id);
    if (opts.spend === 'stars') return L.lines[0].concat(L.pairs[0], [L.goalies[0]]).map(by).filter(Boolean);
    return lineupPlayers();
  }
  function spend() {
    const ps = spendTargets();
    for (let guard = 0; guard < 6000; guard++) {
      let best = null;
      ps.forEach(p => Object.keys(p.a).forEach(k => {
        if (opts.spend === 'offense' && p.pos !== 'G' && OFF.indexOf(k) < 0) return;
        if (p.a[k] >= M.attrCap(p, k)) return;
        const c = M.upgradeCost(p.a[k]);
        if (!best || c < best.c) best = { p, k, c };
      }));
      if (!best || st.pucks < best.c) break;
      if (ST.spendUpgrade(best.p.id, best.k)) tot.up += best.c; else break;
    }
  }
  function handlePending() {
    for (let g = 0; g < 60 && st.pending; g++) {
      const p = st.pending;
      if (p.kind === 'champion') ST.takeChampionPack(opts.fav);
      else if (p.kind === 'pick') {
        const order = opts.traits ? ['xf', 'shards', 'gear', 'boost', 'pucks'] : ['shards', 'gear', 'xf', 'boost', 'pucks'];
        let i = -1;
        for (const t of order) { i = p.options.findIndex(o => o.t === t); if (i >= 0) break; }
        const o = p.options[Math.max(0, i)]; if (o) tot.pkTaken[o.t] = (tot.pkTaken[o.t] || 0) + 1;
        ST.takePick(Math.max(0, i));
      } else st.pending = null;
    }
  }
  function equipTraits() {
    if (!opts.traits) return;
    lineupPlayers().sort((a, b) => M.overall(b) - M.overall(a)).forEach(p => {
      const kind = p.pos === 'G' ? 'goalie' : 'skater';
      for (let slot = 1; slot <= M.xfSlots(p); slot++) {
        if (p[slot === 2 ? 'xf2' : 'xf']) continue;
        const k = st.xfs.find(x => { const d = D.XFACTORS.find(y => y.k === x); return d && d.pos === kind && !M.hasXF(p, x); });
        if (k) ST.setXF(p.id, k, slot);
      }
    });
  }
  function manage() {
    while (st.achClaim && st.achClaim.length) { ST.claimAch(0); handlePending(); }
    handlePending();
    if (opts.trader) for (let r = 7; r > 1; r--) while (st.picks && (st.picks[r] || 0) >= 3) ST.combinePicks(r);
    for (let r = 1; r <= 7; r++) while (st.picks && st.picks[r]) {
      const team = ST.teamOvr(), res = ST.draft(r);
      if (!res) break;
      let p = res.p;
      if (opts.trader && M.overall(p) < team) { const r2 = ST.rescout(p.id, r); if (r2) { p = r2.p; tot.rescouts++; } }
      tot.drafts++; tot.draftDiff += M.overall(p) - team;
    }
    if (!opts.loyal) for (let pass = 0; pass < 3; pass++) ST.bench().forEach(b => {
      let worst = null;
      ST.lineupIds().forEach(id => { const q = st.team.roster.find(x => x.id === id); if (q && ST.canSwap(b.id, id) && M.overall(q) < M.overall(b) && (!worst || M.overall(q) < M.overall(worst))) worst = q; });
      if (worst) ST.lineupSwap(b.id, worst.id);
    });
    lineupPlayers().sort((a, b) => M.overall(b) - M.overall(a)).forEach(p => { while (ST.promote(p.id)); if (opts.breaks !== false) while (ST.breakthrough(p.id)); });
    if (opts.buyShards !== false && capPct() > 30) for (let g = 0; g < 40 && st.pucks > ST.shardPrice() * 2; g++) { const L = lineupPlayers().filter(p => ST.canPromote(p) || ST.canBreak(p)); const p = L.sort((a, b) => M.overall(b) - M.overall(a))[0]; if (!p) break; ST.buyShards(p.pos === 'G' ? 'G' : p.pos === 'D' ? 'D' : 'F'); while (ST.promote(p.id)); while (ST.breakthrough(p.id)); }
    ST.autoEquip(true);
    equipTraits();
    if (opts.facShare) for (let g = 0; g < 20; g++) {
      const f = D.FACILITIES.map(f => f.k).filter(k => ST.facLvl(k) < ST.facMax()).sort((a, b) => ST.facCost(a) - ST.facCost(b))[0];
      if (!f || ST.facCost(f) > st.pucks * opts.facShare) break;
      tot.fac += ST.facCost(f); ST.buildFac(f);
    }
    ST.salvageAll && ST.salvageAll('common');
    if (!opts.loyal) ST.TRADES.forEach((t, ti) => { for (let k = 0; k < 6; k++) { const b = ST.bench().filter(p => p.rarity === t.r).sort((x, y) => M.overall(x) - M.overall(y)); if (b.length < t.n + (opts.trader ? 0 : 2)) break; ST.tradePlayers(ti, b.slice(0, t.n).map(p => p.id)); } });
    spend();
  }
  function capPct() { let c = 0, t = 0; lineupPlayers().forEach(p => Object.keys(p.a).forEach(k => { t++; if (p.a[k] >= M.attrCap(p, k)) c++; })); return Math.round(100 * c / t); }
  const s0 = st.season;
  let poGames = 0, poWins = 0, comebacks = 0, trailing = 0;
  // one step: a game (season or playoff) or the offseason turnover. offline = banked game, no taps or passive
  function step(offline) {
    if (st.phase === 'season') {
      ST.commitGame(ST.prepareGame());
      if (opts.check && window.checkInvariants) window.checkInvariants().forEach(b => { tot.bugs = tot.bugs || {}; tot.bugs[b] = (tot.bugs[b] || 0) + 1; });
      if (!offline) income(T.gameIntervalSec, opts.taps); manage();
    } else if (st.phase === 'playoffs') {
      if (offline) return false;
      const pre = ST.preparePlayoff();
      const p2 = pre.res.periods; const after2 = p2[0].a + p2[1].a - p2[0].b - p2[1].b;
      if (after2 < 0) { trailing++; if (pre.res.a.goals > pre.res.b.goals) comebacks++; }
      ST.commitPlayoff(pre); poGames++; if (pre.res.a.goals > pre.res.b.goals) poWins++;
      income(T.playoffGameSec, opts.tapsPlayoff); manage();
    } else {
      if (offline) return false;
      const h = st.history[0], L = lineupPlayers();
      log.push({ s: h.season, div: h.div, rec: h.w + '-' + h.l + '-' + h.otl, gf: h.gf, ga: h.ga, res: h.result, ovr: Math.round(ST.teamOvr()), min: Math.round(minutes), day: dayNo,
        aiTop: Math.round(100 * Math.max.apply(null, st.standings.filter(t => t.ai).map(t => (t.w * 2 + t.otl) / (2 * Math.max(1, t.w + t.l + t.otl))))), me: Math.round(100 * (h.w * 2 + h.otl) / (2 * Math.max(1, h.w + h.l + h.otl))),
        aw: (h.awards || []).filter(a => a.winner.mine).length, cap: capPct(), orig: L.filter(p => startIds.indexOf(p.id) >= 0).length,
        rar: D.RARITY.map(r => L.filter(p => p.rarity === r.k).length).join('/'), sh: st.shards.F + '/' + st.shards.D + '/' + st.shards.G, bank: Math.round(st.pucks), gear: st.gear.length });
      manage(); ST.beginNextSeason();
    }
    return true;
  }
  let dayNo = 0;
  if (opts.days) {
    // real-life schedule: each day, `sessions` visits of `sessionMin` minutes, evenly spaced; away time earns offline pucks and banked games
    const gapH = 24 / opts.sessions - opts.sessionMin / 60;
    for (dayNo = 1; dayNo <= opts.days; dayNo++) {
      st.tapDay = null;
      if (opts.daily !== false) { st.daily = st.daily || {}; st.daily.ready = false; st.daily.last = new Date(Date.now() - 864e5).toDateString(); if (ST.checkDaily()) ST.claimDaily(); handlePending(); }
      let usedH = 0, usedG = 0;
      for (let s = 0; s < opts.sessions; s++) {
        const h = Math.max(0, Math.min(gapH, ST.offlineHours() - usedH)); usedH += h;
        const off = ST.passiveRate() * 0.5 * h * 3600;
        st.pucks += off; tot.offline += off;
        let banked = Math.max(0, Math.min(Math.floor(gapH * 3600 / T.gameIntervalSec), ST.offlineCap() - usedG)); usedG += banked;
        while (banked-- > 0 && st.phase === 'season') step(true);
        const steps = Math.floor(opts.sessionMin * 60 / T.gameIntervalSec);
        for (let i = 0; i < steps; i++) step(false);
      }
    }
  } else {
    while (st.season - s0 < opts.seasons) step(false);
  }
  const L = lineupPlayers();
  return {
    days: dayNo, season: st.season, div: st.div, ovr: Math.round(ST.teamOvr()),
    log, minutes: Math.round(minutes), tot, poWinPct: Math.round(100 * poWins / Math.max(1, poGames)), comebackPct: Math.round(100 * comebacks / Math.max(1, trailing)),
    titles: log.filter(x => x.res === 'Champion').length, missed: log.filter(x => x.res === 'Missed playoffs').length,
    traitsOwned: st.xfs.length, traitsWorn: L.reduce((s, p) => s + (p.xf ? 1 : 0) + (p.xf2 ? 1 : 0), 0), fac: Object.assign({}, st.fac), coach: [st.coach.skills, st.coach.video, st.coach.bench].join('/'),
    imbalance: (() => { const A = B.SIM.ratePlayerTeam(st.team, {}); return (A.O / A.D).toFixed(2); })()
  };
};

// Compact one-line-per-season summary
window.botSummary = function (name, r) {
  const d = r.log.map(x => x.div + (x.res === 'Champion' ? '*' : x.res === 'Missed playoffs' ? 'm' : '')).join(' ');
  const last = r.log[r.log.length - 1];
  return name + ' | ' + d + '\n  final div ' + last.div + ' ovr ' + last.ovr + ' in ' + r.minutes + ' min | titles ' + r.titles + ' missed ' + r.missed +
    ' | PO win ' + r.poWinPct + '% comeback ' + r.comebackPct + '% | O/D ' + r.imbalance + ' | orig in lineup ' + last.orig + ' | cap% ' + r.log.map(x => x.cap).join(',') +
    '\n  draft avg vs team ' + (r.tot.draftDiff / Math.max(1, r.tot.drafts)).toFixed(1) + ' (' + r.tot.drafts + ' picks, ' + r.tot.rescouts + ' rescouts) | traits own/worn ' + r.traitsOwned + '/' + r.traitsWorn +
    ' | fac ' + JSON.stringify(r.fac) + ' | picks taken ' + JSON.stringify(r.tot.pkTaken) + ' | income tap/pas/off ' + [r.tot.tap, r.tot.passive, r.tot.offline].map(v => Math.round(v / 1e3) + 'k').join('/') +
    ' | bank ' + r.log.map(x => x.bank).slice(-3).join(',') + ' | awards ' + r.log.map(x => x.aw).join('') + ' | shards end ' + last.sh;
};

// Invariant checks run between games: anything returned is a bug
window.checkInvariants = function () {
  const B = window.BK, ST = B.ST, M = B.M, D = B.DATA, st = ST.get(), bad = [];
  const num = (v, n) => { if (typeof v !== 'number' || !isFinite(v)) bad.push(n + ' not finite: ' + v); else if (v < 0) bad.push(n + ' negative: ' + v); };
  num(st.pucks, 'pucks'); num(st.tape, 'tape'); ['F', 'D', 'G'].forEach(k => num(st.shards[k], 'shards ' + k));
  Object.keys(st.picks || {}).forEach(r => num(st.picks[r], 'picks ' + r));
  const ids = {}, L = st.team.lineup, by = id => st.team.roster.find(p => p.id === id);
  st.team.roster.forEach(p => { if (ids[p.id]) bad.push('duplicate player id ' + p.id); ids[p.id] = 1; });
  const seen = {};
  L.lines.forEach((l, i) => l.forEach((id, j) => { const p = by(id); if (!p) bad.push('line ' + (i + 1) + ' slot ' + j + ' empty'); else if (p.pos !== ['LW', 'C', 'RW'][j]) bad.push(p.name + ' (' + p.pos + ') at ' + ['LW', 'C', 'RW'][j]); if (seen[id]) bad.push('player twice in lineup ' + id); seen[id] = 1; }));
  L.pairs.forEach(pr => pr.forEach(id => { const p = by(id); if (!p || p.pos !== 'D') bad.push('pair slot wrong'); if (seen[id]) bad.push('dup in lineup'); seen[id] = 1; }));
  L.goalies.forEach(id => { const p = by(id); if (!p || p.pos !== 'G') bad.push('goalie slot wrong'); if (seen[id]) bad.push('dup goalie'); seen[id] = 1; });
  const gids = {};
  const gchk = (g, where) => { if (!g) return; if (gids[g.id]) bad.push('gear in two places ' + g.id + ' ' + where); gids[g.id] = 1; num(g.p, 'gear p'); };
  st.gear.forEach(g => gchk(g, 'locker'));
  st.team.roster.forEach(p => {
    Object.keys(p.gear).forEach(k => gchk(p.gear[k], p.name));
    if (p.xf && p.xf === p.xf2) bad.push(p.name + ' stacked trait ' + p.xf);
    if (p.xf2 && M.xfSlots(p) < 2) bad.push(p.name + ' has 2nd trait without slot');
    Object.keys(p.a).forEach(k => { num(p.a[k], p.name + ' ' + k); if (p.a[k] > Math.max(M.attrCap(p, k), 99)) bad.push(p.name + ' ' + k + ' above cap'); });
    const s = p.season || {};
    if (p.pos !== 'G' && s.p != null && s.p !== (s.g || 0) + (s.a || 0)) bad.push(p.name + ' season P != G+A');
    if (p.pos !== 'G' && p.career && p.career.p !== p.career.g + p.career.a) bad.push(p.name + ' career P != G+A');
    if (!isFinite(M.overall(p))) bad.push(p.name + ' overall NaN');
  });
  ST.bench().forEach(p => { if (Object.values(p.gear).some(Boolean)) bad.push('bench player wearing gear: ' + p.name); });
  (st.standings || []).forEach(t => ['w', 'l', 'otl', 'gf', 'ga'].forEach(k => num(t[k], t.name + ' ' + k)));
  return bad;
};
