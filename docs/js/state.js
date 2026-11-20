/* Breakaway — game state, season loop, economy, save */
(function (G) {
  'use strict';
  const D = G.DATA, M = G.M, S = G.SIM;
  const SAVE_KEY = 'breakaway.save.v1';

  let st = null;
  const listeners = [];
  function on(fn) { listeners.push(fn); }
  function emit(ev, data) { listeners.forEach(f => f(ev, data)); }

  function get() { return st; }
  function div() { return D.DIVISIONS.find(d => d.d === st.div); }
  function franchiseNo() { return (st && st.prestige || 0) + 1; }
  function divRef() { const d = div(); return (d.lo + d.hi) / 2; }
  function payout() { return div().payout * (1 + 0.05 * st.promos) * (st.doubler ? 2 : 1) * (1 + st.coach.skills * 0.025); }
  function byId(id) { return st.team.roster.find(p => p.id === id); }

  // ---------------------------------------------------------------- income
  function lineupIds() { const L = st.team.lineup; return L.lines.flat().concat(L.pairs.flat(), L.goalies); }
  function teamOvr() {
    const L = st.team.lineup;
    const ps = L.lines.flat().concat(L.pairs.flat(), [L.goalies[0]]).map(byId).filter(Boolean);
    return ps.length ? ps.reduce((s, p) => s + M.overall(p), 0) / ps.length : 10;
  }
  function incomeMult() { return (activeBoosts().some(b => b.k === 'rush') ? 2 : 1) * (1 + facVal('arena') / 100) * (1 + 0.1 * (st.prestige || 0)); }
  // ---------------------------------------------------------------- facilities
  function facLvl(k) { return (st.fac && st.fac[k]) || 0; }
  function facVal(k) { const f = D.FACILITIES.find(x => x.k === k); return f ? f.per * facLvl(k) : 0; }
  function facMax() { return 2 + (8 - st.div) * 2; }
  function facCost(k) { return Math.round(400 * Math.pow(2.1, facLvl(k)) * payout()); }
  function applyFac() { D.TUNING.costMult = 1 - facVal('train') / 100; }
  function buildFac(k) {
    st.fac = st.fac || {};
    if (facLvl(k) >= facMax()) return false;
    const c = facCost(k); if (st.pucks < c) return false;
    st.pucks -= c; st.fac[k] = facLvl(k) + 1; applyFac();
    save(); emit('roster'); return true;
  }
  function clickValue() { return (1 + teamOvr() * D.TUNING.clickPerOvr) * payout() * incomeMult(); }
  function passiveRate() { return teamOvr() * D.TUNING.passivePerOvr * payout() * incomeMult(); }
  let passiveCarry = 0;
  function tickPassive(sec) {
    passiveCarry += passiveRate() * sec;
    const whole = Math.floor(passiveCarry);
    if (whole > 0) { st.pucks += whole; passiveCarry -= whole; }
  }

  // ---------------------------------------------------------------- boosts
  function activeBoosts() {
    if (!st || !st.active) return [];
    const now = Date.now();
    st.active = st.active.filter(b => b.until > now);
    return st.active;
  }
  function boostAmount(p, key) {
    if (!st || !st.active || !st.active.length) return 0;
    let v = 0;
    st.active.forEach(b => {
      if (b.until < Date.now()) return;
      const def = D.BOOSTS.find(x => x.k === b.k); if (!def) return;
      if (def.goalie && p.pos === 'G') v += def.amt;
      else if (def.attr && def.attr === key && p.pos !== 'G') v += def.amt;
    });
    return v;
  }
  M.setBoostHook(boostAmount);
  function boostCost(k) { const b = D.BOOSTS.find(x => x.k === k); return Math.round(b.cost * payout()); }
  function buyBoost(k) {
    const c = boostCost(k); if (st.pucks < c) return false;
    st.pucks -= c; st.boosts[k] = (st.boosts[k] || 0) + 1;
    save(); return true;
  }
  function activateBoost(k) {
    if (!st.boosts[k]) return false;
    const def = D.BOOSTS.find(x => x.k === k);
    st.boosts[k]--;
    const cur = activeBoosts().find(b => b.k === k);
    if (cur) cur.until += def.mins * 60e3; else st.active.push({ k, until: Date.now() + def.mins * 60e3 });
    toast(def.n + ' active for ' + def.mins + ' minutes', 'promo');
    save(); emit('roster'); return true;
  }

  // ---------------------------------------------------------------- new game
  function makeCoach() {
    const n = M.rollNation(st && st.fav);
    return { name: M.nameFor(n.c), nat: n.c, id: M.uid('c'), style: 'bal', bench: 0, skills: 0, video: 0 };
  }
  function newGame(kit) {
    M.setFavorite(kit.fav || null);
    const roster = M.makeRoster(10, 'common');
    const team = {
      name: kit.name, city: kit.city, abbr: kit.abbr,
      c1: kit.c1, c2: kit.c2, c3: kit.c3, pattern: kit.pattern, crest: kit.crest,
      roster, lineup: M.defaultLineup(roster), chem: {}
    };
    st = {
      v: 1, team, div: 8, season: 1, promos: 0, fav: kit.fav || null,
      pucks: 600, shards: { F: 0, D: 0, G: 0 }, tape: 0, picks: { 5: 1, 6: 1, 7: 2 },
      gear: [], xfs: [], boosts: { rush: 1, sticks: 1 }, active: [],
      coach: null,
      standings: [], schedule: [], gameIndex: 0,
      streak: 0, phase: 'season', playoff: null,
      lastTick: Date.now(), pending: null, toasts: [],
      history: [], ach: {}, achClaim: [], fac: {}, gearV2: true,
      totals: { wins: 0, cups: 0, gold: 0, hat: 0, fifty: 0, hundred: 0, awards: 0 },
      shopAt: 0, shop: [],
      dailyDay: new Date().toDateString(), dailyStreak: 1, bestPps: 0
    };
    st.coach = makeCoach();
    st.gear.push(M.makeGear('common', 'skater', 'stick'), M.makeGear('common', 'skater', 'skates'), M.makeGear('common', 'goalie', 'glove'));
    startSeason();
    applyFac(); save();
    return st;
  }

  // ---------------------------------------------------------------- season
  function aiTeams() {
    const d = div();
    const out = [];
    const local = st.fav && st.div >= 6 && D.CITY_BY_NAT[st.fav];
    const cities = (local ? D.CITY_BY_NAT[st.fav] : D.CITIES).slice();
    const mascots = D.MASCOTS.slice();
    // the very first season leans a little easier
    const ease = st.season === 1 && st.div === 8 ? -1.5 : 0;
    // low divisions keep the field within about 30% of the middle, so no Rec League superteam runs the table
    const ref = (d.lo + d.hi) / 2, lo = Math.max(d.lo, ref / 1.3), hi = Math.min(d.hi, ref * 1.3);
    // in Division 1 the league catches up: rivals improve each season you spend there
    const climb = st.div === 1 ? Math.min(30, 2.5 * (st.eliteSeasons || 0)) : 0;
    for (let i = 0; i < 15; i++) {
      const strength = lo + (hi - lo) * ((i + 0.5) / 15) + ease + climb;
      const city = cities.splice(M.ri(0, cities.length - 1), 1)[0] || 'Harbor';
      const mas = mascots.splice(M.ri(0, mascots.length - 1), 1)[0] || 'Club';
      out.push({
        ai: true, id: 'ai' + i, name: city + ' ' + mas, abbr: city.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(),
        O: Math.max(3, strength + (M.rand() - 0.5) * (hi - lo) * 0.3),
        D: Math.max(3, strength + (M.rand() - 0.5) * (hi - lo) * 0.3),
        G: Math.max(3, strength + (M.rand() - 0.5) * (hi - lo) * 0.45),
        w: 0, l: 0, otl: 0, gf: 0, ga: 0
      });
    }
    return out;
  }

  function startSeason() {
    const d = div();
    const ai = aiTeams();
    st.standings = [{ ai: false, id: 'me', name: st.team.city + ' ' + st.team.name, abbr: st.team.abbr, w: 0, l: 0, otl: 0, gf: 0, ga: 0 }].concat(ai);
    st.schedule = [];
    for (let i = 0; i < d.games; i++) st.schedule.push(ai[i % 15].id);
    shuffle(st.schedule);
    st.gameIndex = 0; st.phase = 'season'; st.playoff = null; st.streak = 0; st.shardBuys = 0;
    st.team.roster.forEach(p => { p.season = M.blankLine(p.pos === 'G'); p.startOvr = M.overall(p); });
    st.lastTick = Date.now();
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = M.ri(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; } }
  function teamById(id) { return st.standings.find(t => t.id === id); }

  // ---------------------------------------------------------------- one game
  // simulated up front (prepare) so the rink panel can play it out, folded in when its clock runs out (commit)
  function nameOf(id) { const p = id && byId(id); return p ? p.name.split(' ').slice(1).join(' ') || p.name : null; }
  function timeline(res) {
    const ev = [];
    const mine = (res.a.list || []).slice();
    res.periods.forEach((p, i) => {
      const myPer = mine.filter(g => g.per === i);
      for (let k = 0; k < p.a; k++) {
        const g = myPer[k] || {};
        ev.push({ t: i * 20 + 0.6 + M.rand() * 19, s: 'a', sc: nameOf(g.sc), a1: nameOf(g.a1), a2: nameOf(g.a2), scId: g.sc });
      }
      for (let k = 0; k < p.b; k++) ev.push({ t: i * 20 + 0.6 + M.rand() * 19, s: 'b' });
    });
    let total = 60;
    if (res.ot) {
      const s = res.a.goals > res.b.goals ? 'a' : 'b';
      const g = mine.find(x => x.per === 3) || {};
      if (res.so) { ev.push({ t: 65, s, so: true }); total = 65.2; }
      else { const t = 60.3 + M.rand() * 4.4; ev.push({ t, s, ot: true, sc: s === 'a' ? nameOf(g.sc) : null, a1: s === 'a' ? nameOf(g.a1) : null }); total = t + 0.05; }
    }
    ev.sort((x, y) => x.t - y.t);
    return { ev, total };
  }
  function rateMe(playoff) {
    return S.ratePlayerTeam(st.team, { goalieIdx: !playoff && M.rand() < 0.3 ? 1 : 0, style: st.coach.style, playoff: !!playoff });
  }

  function prepareGame() {
    if (!st || st.phase !== 'season' || st.gameIndex >= st.schedule.length) return null;
    const oppId = st.schedule[st.gameIndex];
    const opp = teamById(oppId);
    const A = rateMe(false);
    const res = S.simGame(A, S.rateAI(opp), divRef(), {});
    S.applyMinus(res.a.stats, A, res.b.goals);
    return { kind: 'season', idx: st.gameIndex, season: st.season, oppId, oppName: opp.name, oppAbbr: opp.abbr, A, res, tl: timeline(res) };
  }
  function playNextGame() {
    if (st.phase !== 'season') return null;
    if (st.gameIndex >= st.schedule.length) { enterPlayoffs(); return null; }
    return commitGame(prepareGame());
  }
  function commitGame(pre) {
    if (st.phase !== 'season') return null;
    if (st.gameIndex >= st.schedule.length) { enterPlayoffs(); return null; }
    if (!pre || pre.idx !== st.gameIndex || pre.season !== st.season) pre = prepareGame();
    const opp = teamById(pre.oppId), me = teamById('me'), R = divRef();
    recordGame(me, opp, pre.res, pre.A);
    st.gameIndex++;
    const others = st.standings.filter(t => t.ai && t.id !== pre.oppId);
    shuffle(others);
    for (let i = 0; i + 1 < others.length; i += 2) {
      const r2 = S.simGame(S.rateAI(others[i]), S.rateAI(others[i + 1]), R, {});
      tally(others[i], others[i + 1], r2.a.goals, r2.b.goals, r2.ot || r2.so);
    }
    const res = pre.res;
    const out = { opp: opp.name, oppAbbr: opp.abbr, gf: res.a.goals, ga: res.b.goals, win: res.a.goals > res.b.goals, ot: res.ot, so: res.so };
    if (st.gameIndex >= st.schedule.length) enterPlayoffs();
    emit('game', out);
    save();
    return out;
  }
  function tally(a, b, ga, gb, ot) {
    a.gf += ga; a.ga += gb; b.gf += gb; b.ga += ga;
    if (ga > gb) { a.w++; if (ot) b.otl++; else b.l++; } else { b.w++; if (ot) a.otl++; else a.l++; }
  }

  function addSkaterLine(p, s, playoff) {
    if (!playoff) {
      p.season.gp++;
      ['g', 'a', 's', 'hits', 'blk', 'pm', 'pim'].forEach(k => { p.season[k] += s[k] || 0; });
      p.season.p = p.season.g + p.season.a;
    }
    p.career.gp++;
    ['g', 'a', 's', 'hits', 'blk', 'pm', 'pim'].forEach(k => { p.career[k] = (p.career[k] || 0) + (s[k] || 0); });
    p.career.p = p.career.g + p.career.a;
  }

  function recordGame(me, opp, res, A) {
    tally(me, opp, res.a.goals, res.b.goals, res.ot || res.so);
    const win = res.a.goals > res.b.goals;
    const stats = res.a.stats || {};
    const onIce = A.lines.reduce((a, l) => a.concat(l.ids), []).concat(A.pairs.reduce((a, p) => a.concat(p.ids), []));
    onIce.forEach(id => {
      const p = byId(id); if (!p) return;
      const s = stats[id] || {};
      addSkaterLine(p, s, false);
      if ((s.g || 0) >= 3) { p.season.ht++; p.career.ht = (p.career.ht || 0) + 1; st.totals.hat++; toast('🎩 ' + p.name + ' — hat trick!', 'milestone'); bump('hattricks', st.totals.hat); }
      milestones(p, s);
    });
    const gp = A.goalie;
    gp.season.gp++; gp.career.gp++;
    gp.season.ga += res.a.ga; gp.career.ga += res.a.ga;
    gp.season.sa += res.a.sa; gp.career.sa += res.a.sa;
    if (win) { gp.season.w++; gp.career.w++; } else { gp.season.l++; gp.career.l++; }
    if (res.a.ga === 0) { gp.season.so++; gp.career.so++; toast('🥅 ' + gp.name + ' — shutout!', 'milestone'); bump('shutouts', gp.career.so); }

    const credit = 1 + st.coach.video * 0.03;
    A.lines.map(l => l.ids).concat(A.pairs.map(p => p.ids)).forEach(ids => {
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const k = M.pairKey(ids[i], ids[j]); st.team.chem[k] = (st.team.chem[k] || 0) + credit;
      }
    });

    if (win) {
      st.totals.wins++; bump('wins', st.totals.wins);
      st.streak++; bump('streak', st.streak);
      const pk = Math.round(120 * payout());
      st.pucks += pk;
      const g = rollGearDrop();
      toast('W ' + res.a.goals + '-' + res.b.goals + ' vs ' + opp.abbr + '  +' + fmt(pk) + ' pucks' + (g ? (g.scrapped ? '  +' + g.scrapped + ' tape (auto-scrapped ' + M.gearName(g) + ')' : '  +' + M.gearName(g)) : ''), 'win');
      if (st.streak % 5 === 0) offerPick('Win streak of ' + st.streak, 1);
    } else {
      st.streak = 0;
      toast('L ' + res.a.goals + '-' + res.b.goals + ' vs ' + opp.abbr + (res.imbalance > 1.35 ? ' · your defense is leaking' : ''), 'loss');
      if (!st.diagShown) { st.diagShown = true; diagnose(A, res); }
    }
  }

  function diagnose(A, res) {
    const R = divRef();
    const units = A.lines.map((l, i) => ({ n: 'Line ' + (i + 1) + ' forwards', v: l.o, why: 'scoring' }))
      .concat(A.pairs.map((p, i) => ({ n: 'Line ' + (i + 1) + ' defense pair', v: p.d, why: 'defense' })))
      .concat([{ n: 'Your goalie', v: A.G, why: 'goaltending' }]);
    units.sort((a, b) => (a.v - R) - (b.v - R));
    const w = units[0];
    emit('card', {
      kind: 'diag', title: 'Lost ' + res.a.goals + '–' + res.b.goals,
      sub: w.n + ' is your weakest unit (' + Math.round(w.v) + ' vs a division average of ' + Math.round(R) + '). Tap for pucks on Train, then spend them on ' + w.why + '.'
    });
  }

  function card(p, title, sub) { if (awayLog) { awayLog.cards.push({ pid: p.id, name: p.name, title, sub }); return; } emit('card', { kind: 'milestone', pid: p.id, title, sub, rank: rankOf(p) }); }
  function rankOf(p) {
    if (p.pos === 'G') return null;
    const list = st.team.roster.filter(x => x.pos !== 'G').map(x => x.career.p).sort((a, b) => b - a);
    return list.indexOf(p.career.p) + 1;
  }
  function milestones(p, s) {
    if (!s.g && !s.a) return;
    const g = p.career.g, pts = p.career.p;
    [10, 50, 100, 250, 500, 1000].forEach(t => {
      if (g - (s.g || 0) < t && g >= t) { bump('pgoals', t); if (t >= 50) { toast('🏒 ' + p.name + ' — career goal #' + t, 'milestone'); card(p, 'Career goal #' + t, p.career.g + ' goals, ' + p.career.p + ' points for the franchise.'); } }
    });
    [25, 100, 250, 500, 1000, 2000].forEach(t => {
      if (pts - (s.g || 0) - (s.a || 0) < t && pts >= t) { bump('ppoints', t); if (t >= 100) { toast('⭐ ' + p.name + ' — career point #' + t, 'milestone'); card(p, 'Career point #' + t, p.career.g + ' goals and ' + p.career.a + ' assists.'); } }
    });
  }

  // ---------------------------------------------------------------- playoffs
  function enterPlayoffs() {
    const table = sorted();
    const seed = table.findIndex(t => t.id === 'me');
    if (seed >= 8) {
      st.phase = 'missed';
      toast('Finished ' + ord(seed + 1) + ' — missed the playoffs', 'loss');
      endSeason(false);
      emit('missed', { seed: seed + 1 });
    } else {
      st.phase = 'playoffs';
      const seeds = table.slice(0, 8).map(t => t.id);
      st.playoff = { round: 0, w: 0, l: 0, opp: null, log: [], seeds, alive: seeds.slice(), mySeed: seed + 1, pts: {}, gsv: {} };
      nextOpponent();
      toast('Playoffs! You are the ' + ord(seed + 1) + ' seed', 'promo');
      emit('playoffs', st.playoff);
    }
    save();
  }
  function aliveInSeedOrder() {
    const po = st.playoff;
    if (!po.seeds) { po.seeds = sorted().slice(0, 8).map(t => t.id); if (po.seeds.indexOf('me') < 0) po.seeds[7] = 'me'; }
    if (!po.alive) po.alive = po.seeds.slice();
    return po.seeds.filter(id => po.alive.indexOf(id) >= 0);
  }
  function nextOpponent() {
    const po = st.playoff, alive = aliveInSeedOrder();
    const n = alive.length, i = alive.indexOf('me');
    po.opp = Object.assign({}, teamById(alive[n - 1 - i]));
    po.oppSeed = po.seeds.indexOf(alive[n - 1 - i]) + 1;
    // opponents play harder each round: +3 at the division-4 scale, proportionally smaller below it
    po.bump = Math.round(po.round * 3 * divRef() / 57 * 10) / 10;
    po.w = 0; po.l = 0; po.log = [];   // a new series starts at game 1
  }
  function resolveOtherSeries() {
    const po = st.playoff, alive = aliveInSeedOrder(), n = alive.length;
    const need = Math.ceil(div().series / 2), R = divRef();
    const winners = ['me'];
    for (let i = 0; i < n / 2; i++) {
      const a = alive[i], b = alive[n - 1 - i];
      if (a === 'me' || b === 'me') continue;
      const A = S.rateAI(teamById(a)), B = S.rateAI(teamById(b));
      let wa = 0, wb = 0;
      while (wa < need && wb < need) { const r = S.simGame(A, B, R, {}); if (r.a.goals > r.b.goals) wa++; else wb++; }
      const win = wa > wb ? a : b, lose = win === a ? b : a;
      winners.push(win);
      po.results = po.results || [];
      po.results.push(teamById(win).abbr + ' beat ' + teamById(lose).abbr + ' ' + Math.max(wa, wb) + '–' + Math.min(wa, wb));
    }
    po.alive = winners;
  }
  function preparePlayoff() {
    const po = st.playoff;
    if (!po || st.phase !== 'playoffs') return null;
    const A = rateMe(true);
    const opp = Object.assign({}, po.opp);
    opp.O += po.bump; opp.D += po.bump; opp.G += po.bump;
    const res = S.simGame(A, S.rateAI(opp), divRef(), { edge: 1.05 });
    S.applyMinus(res.a.stats, A, res.b.goals);
    return { kind: 'playoff', round: po.round, game: po.log.length, oppName: po.opp.name, oppAbbr: po.opp.abbr, A, res, tl: timeline(res) };
  }
  function playPlayoffGame() { return commitPlayoff(preparePlayoff()); }
  function commitPlayoff(pre) {
    const po = st.playoff;
    if (!po || st.phase !== 'playoffs' || !pre) return null;
    const A = pre.A, res = pre.res;
    recordPlayoffStats(res, A);
    const win = res.a.goals > res.b.goals;
    if (win) po.w++; else po.l++;
    po.log.push({ gf: res.a.goals, ga: res.b.goals, win, ot: res.ot });
    const need = Math.ceil(div().series / 2);
    const seriesDone = po.w >= need || po.l >= need, advanced = po.w >= need;
    const out = { win, gf: res.a.goals, ga: res.b.goals, ot: res.ot, seriesDone, advanced, round: po.round };
    if (seriesDone && advanced) {
      if (po.round === 2) { champion(); out.champion = true; }
      else { resolveOtherSeries(); po.round++; nextOpponent(); offerPick('Round ' + po.round + ' won', 1 + po.round); }
    } else if (seriesDone) { endSeason(false); out.eliminated = true; }
    save();
    emit('playoffGame', out);
    return out;
  }
  function recordPlayoffStats(res, A) {
    const stats = res.a.stats || {}, po = st.playoff;
    po.pts = po.pts || {};
    A.lines.reduce((a, l) => a.concat(l.ids), []).concat(A.pairs.reduce((a, p) => a.concat(p.ids), [])).forEach(id => {
      const p = byId(id); if (!p) return;
      const s = stats[id] || {};
      po.pts[id] = (po.pts[id] || 0) + (s.g || 0) + (s.a || 0);
      addSkaterLine(p, s, true);
      if ((s.g || 0) >= 3) { p.career.ht = (p.career.ht || 0) + 1; st.totals.hat++; toast('🎩 ' + p.name + ' — playoff hat trick!', 'milestone'); }
    });
    const gp = A.goalie;
    po.gsv = po.gsv || {};
    const gs = po.gsv[gp.id] = po.gsv[gp.id] || { sa: 0, ga: 0, gp: 0 };
    gs.sa += res.a.sa; gs.ga += res.a.ga; gs.gp++;
    gp.career.gp++; gp.career.ga += res.a.ga; gp.career.sa += res.a.sa;
    if (res.a.ga === 0) { gp.career.so++; toast('🥅 ' + gp.name + ' — playoff shutout!', 'milestone'); }
  }

  function champion() {
    st.totals.cups++;
    if (st.div === 1) st.eliteTitles = (st.eliteTitles || 0) + 1;
    toast('🏆 ' + st.team.name + ' win the ' + div().n + ' championship!', 'cup');
    championshipRewards();
    bump('cups', st.totals.cups);
    endSeason(true);
    emit('pending', st.pending);
  }

  // championship package; the player is always better than the team's average
  const CUP = {
    8: { gear: [2, 'uncommon'], player: ['uncommon', 'F'] }, 7: { gear: [2, 'uncommon'], player: ['rare', 'D'] },
    6: { gear: [1, 'rare'], player: ['rare', 'S'] }, 5: { gear: [2, 'rare'], player: ['epic', 'G'], xf: 'rare' },
    4: { gear: [3, 'rare'], player: ['legendary', 'S'] }, 3: { gear: [2, 'epic'], player: ['legendary', 'S'] },
    2: { gear: [3, 'epic'], player: ['legendary', 'G'], xf: 'epic' }, 1: { gear: [1, 'legendary'], player: ['legendary', 'A'] }
  };
  function championshipRewards() {
    const c = CUP[st.div], got = [];
    let rarity = c.player[0];
    if (st.totals.cups === 1) rarity = D.RARITY[Math.max(D.RIDX[rarity], 2)].k;   // first title: at least a rare
    for (let n = 0; n < c.gear[0]; n++) { const g = M.makeGear(c.gear[1], M.rand() < 0.1 ? 'goalie' : 'skater'); st.gear.push(g); got.push(M.gearName(g)); }
    if (c.xf) { const x = M.pick(D.XFACTORS.filter(x => x.r === c.xf)); st.xfs.push(x.k); got.push(x.n + ' trait'); }
    const round = Math.max(1, Math.min(5, Math.ceil(st.div / 1.6)));
    addPick(round); got.push(ord(round) + '-round draft pick');
    const posName = { F: 'forward', D: 'defenseman', G: 'goalie', S: 'skater', A: 'player' }[c.player[1]];
    const pack = {
      kind: 'champion', title: 'Championship pack',
      sub: 'Also in the pack: ' + got.join(', ') + '. Now sign a ' + D.RARITY[D.RIDX[rarity]].n.toLowerCase() + ' ' + posName + ' who beats your team average. You choose his country.',
      rarity, posGroup: c.player[1], div: st.div, target: Math.round(teamOvr() + 5)
    };
    if (st.pending) { st.pickQueue = st.pickQueue || []; st.pickQueue.unshift({ pending: pack }); } else st.pending = pack;
  }

  // ---------------------------------------------------------------- season awards
  // AI rosters are not simulated player by player, so each award has one generated contender
  // whose numbers scale with the division's strongest teams.
  const AWARDS = [
    { k: 'points', n: 'Scoring Title', d: 'Most points', icon: 'star' },
    { k: 'goals', n: 'Goal Crown', d: 'Most goals', icon: 'flame' },
    { k: 'assists', n: 'Setup Award', d: 'Most assists', icon: 'pass' },
    { k: 'gwins', n: 'Iron Crease', d: 'Most wins by a goaltender', icon: 'mask' },
    { k: 'mvp', n: 'Most Valuable Player', d: 'Voted: biggest impact on a team', icon: 'trophy', voted: true },
    { k: 'def', n: 'Defenseman of the Year', d: 'Voted: best all-round defenseman', icon: 'shield', voted: true },
    { k: 'goalie', n: 'Goaltender of the Year', d: 'Voted: best goaltender', icon: 'mask', voted: true },
    { k: 'twoway', n: 'Two-Way Forward', d: 'Voted: best defensive forward', icon: 'swap', voted: true },
    { k: 'pomvp', n: 'Playoff MVP', d: 'Voted: best player of the playoffs', icon: 'trophy', voted: true }
  ];
  // stat titles go to whoever leads; voted awards need a standout season
  const VOTED_MARGIN = 1.2;
  function seasonAwards(wonCup) {
    const games = st.schedule.length, ai = sorted().filter(t => t.ai);
    // the bar is set by the best team in the league, and that includes yours
    const R = divRef(), fAI = M.clamp((ai[0].O + ai[0].D) / 2 / R, 0.85, 1.35), f = M.clamp(Math.max((ai[0].O + ai[0].D) / 2, teamOvr() * 0.9) / R, 0.85, 1.6);
    const me = teamById('me'), myPct = (me.w * 2 + me.otl) / (2 * games);
    const sk = st.team.roster.filter(p => p.pos !== 'G' && p.season.gp >= games * 0.4);
    const fw = sk.filter(p => p.pos !== 'D'), dm = sk.filter(p => p.pos === 'D');
    const gs = st.team.roster.filter(p => p.pos === 'G' && p.season.gp >= games * 0.3);
    const top = (arr, fn) => arr.slice().sort((a, b) => fn(b) - fn(a))[0];
    const r = () => M.rand();
    const svp = p => p.season.sa ? 1 - p.season.ga / p.season.sa : 0;
    const out = [];
    function decide(a, mine, myScore, aiScore, myStat, aiStat, pool) {
      const t = M.pick(pool || ai.slice(0, 4)), n = M.rollNation();
      const won = mine && myScore > aiScore * (a.voted ? VOTED_MARGIN : 1);
      out.push({ margin: mine && aiScore ? myScore / aiScore : (won ? 9 : 0), aiWinner: { mine: false, name: M.nameFor(n.c), nat: n.c, team: t.name, stat: aiStat },
        k: a.k, n: a.n, d: a.d, icon: a.icon, voted: !!a.voted,
        winner: won ? { mine: true, pid: mine.id, name: mine.name, nat: mine.nat, team: st.team.city + ' ' + st.team.name, stat: myStat }
          : { mine: false, name: M.nameFor(n.c), nat: n.c, team: t.name, stat: aiStat },
        finalist: !won && mine && myScore > aiScore * 0.75 ? { pid: mine.id, name: mine.name, stat: myStat } : null
      });
    }
    let p, x;
    p = top(sk, q => q.season.p); x = Math.round(games * (1.0 + r() * 0.45) * fAI); decide(AWARDS[0], p, p ? p.season.p : 0, x, p && p.season.p + ' pts', x + ' pts');
    p = top(sk, q => q.season.g); x = Math.round(games * (0.46 + r() * 0.24) * fAI); decide(AWARDS[1], p, p ? p.season.g : 0, x, p && p.season.g + ' goals', x + ' goals');
    p = top(sk, q => q.season.a); x = Math.round(games * (0.6 + r() * 0.3) * fAI); decide(AWARDS[2], p, p ? p.season.a : 0, x, p && p.season.a + ' assists', x + ' assists');
    p = top(gs, q => q.season.w); x = Math.round(games * (0.45 + r() * 0.12)); decide(AWARDS[3], p, p ? p.season.w : 0, x, p && p.season.w + ' wins', x + ' wins');
    const mvp = q => q.season.p * (0.7 + myPct * 0.6) + M.overall(q) * 0.2;
    p = top(sk, mvp); x = games * (1.05 + r() * 0.35) * f; decide(AWARDS[4], p, p ? mvp(p) : 0, x, p && p.season.p + ' pts, ' + Math.round(myPct * 100) + '% of points won', Math.round(x * 0.9) + ' pts');
    const dsc = q => q.season.p + 0.2 * q.season.blk + 0.3 * Math.max(0, q.season.pm) + M.eff(q, 'defense') * 0.15;
    p = top(dm, dsc); x = games * (0.7 + r() * 0.35) * f; decide(AWARDS[5], p, p ? dsc(p) : 0, x, p && p.season.p + ' pts, ' + p.season.blk + ' blocks', Math.round(x * 0.6) + ' pts');
    const gsc = q => (svp(q) - 0.88) * 1000 + q.season.w * 0.4;
    p = top(gs, gsc); const aiSv = 0.902 + r() * 0.02 + (f - 1) * 0.01; x = (aiSv - 0.88) * 1000 + games * 0.5 * 0.4;
    decide(AWARDS[6], p, p ? gsc(p) : 0, x, p && svp(p).toFixed(3).slice(1) + ' SV%', aiSv.toFixed(3).slice(1) + ' SV%');
    const tw = q => q.season.pm + 0.3 * q.season.blk + 0.1 * q.season.hits + 0.3 * q.season.p + M.eff(q, 'defense') * 0.2;
    p = top(fw, tw); x = games * (0.75 + r() * 0.3) * f; decide(AWARDS[7], p, p ? tw(p) : 0, x, p && (p.season.pm > 0 ? '+' : '') + p.season.pm + ', ' + p.season.p + ' pts', '+' + Math.round(games * 0.4) + ', ' + Math.round(x * 0.7) + ' pts');
    const po = st.playoff;
    if (wonCup && po) {
      const pid = Object.keys(po.pts || {}).sort((a, b) => po.pts[b] - po.pts[a])[0];
      const gid = Object.keys(po.gsv || {})[0], g = gid && po.gsv[gid];
      const gsv = g && g.sa ? 1 - g.ga / g.sa : 0;
      let mine = pid && byId(pid), stat = mine ? po.pts[pid] + ' playoff pts' : '';
      if (g && gsv >= 0.93) { mine = byId(gid); stat = gsv.toFixed(3).slice(1) + ' SV% in the playoffs'; }
      if (mine) decide(AWARDS[8], mine, 1, 0, stat, '');
    } else decide(AWARDS[8], null, 0, 1, '', Math.round(6 + r() * 10) + ' playoff pts', [ai[0]]);

    // winners keep a trophy and a permanent stat bonus (stacks up to five times per award)
    out.forEach(a => {
      if (!a.winner.mine) return;
      const pl = byId(a.winner.pid);
      st.totals.awards = (st.totals.awards || 0) + 1;
      bump('awards', st.totals.awards);
      if (!pl) return;
      pl.awards.push({ k: a.k, n: a.n, season: st.season, div: st.div, fr: franchiseNo() });
      const bonus = D.TROPHY_BONUS[a.k];
      if (bonus && (pl.tbc[a.k] || 0) < 5) {
        pl.tbc[a.k] = (pl.tbc[a.k] || 0) + 1;
        Object.keys(bonus).forEach(k => { if (pl.a[k] != null) pl.tb[k] = (pl.tb[k] || 0) + bonus[k]; });
        a.bonus = Object.keys(bonus).filter(k => pl.a[k] != null).map(k => '+' + bonus[k] + ' ' + D.ATTR_LABEL[k]).join(', ');
      }
    });
    return out;
  }

  function endSeason(wonCup) {
    const awards = seasonAwards(wonCup);
    const me = teamById('me');
    const skaters = st.team.roster.filter(p => p.pos !== 'G');
    const leaders = skaters.slice().sort((a, b) => b.season.p - a.season.p).slice(0, 3).map(p => ({ name: p.name, nat: p.nat, g: p.season.g, a: p.season.a, p: p.season.p }));
    st.history.unshift({
      fr: franchiseNo(), season: st.season, div: st.div, divName: div().n, w: me.w, l: me.l, otl: me.otl, gf: me.gf, ga: me.ga,
      result: wonCup ? 'Champion' : (st.phase === 'missed' ? 'Missed playoffs' : 'Eliminated'), leaders, awards
    });
    st.team.roster.forEach(p => {
      const isG = p.pos === 'G';
      (isG ? ['w', 'so'] : ['g', 'a', 'p', 'hits', 'blk', 'pim']).forEach(k => { if ((p.season[k] || 0) > (p.best[k] || 0)) p.best[k] = p.season[k]; });
      if (!isG) {
        if (p.season.g >= 50) { st.totals.fifty++; bump('fifty', st.totals.fifty); }
        if (p.season.p >= 100) { st.totals.hundred++; bump('hundred', st.totals.hundred); }
      }
      p.history.push({ fr: franchiseNo(), season: st.season, div: st.div, ovr0: p.startOvr != null ? p.startOvr : M.overall(p), ovr1: M.overall(p), line: Object.assign({}, p.season) });
    });
    const pack = shardPackage();
    st.shards.F += pack.F; st.shards.D += pack.D; st.shards.G += pack.G;
    addPick(7);
    if (st.phase !== 'missed') addPick(6);
    emit('card', { kind: 'awards', season: st.season, divName: div().n, list: awards, shards: pack, result: st.history[0].result });
    if (st.div === 1) st.eliteSeasons = (st.eliteSeasons || 0) + 1;
    st.season++;
    bump('seasons', st.season - 1);
    if (wonCup && st.div > 1) { st.div--; st.promos++; toast('Promoted to ' + div().n + '!', 'promo'); }
    st.phase = 'offseason';
    save();
    emit('seasonEnd', { wonCup });
  }

  // ---------------------------------------------------------------- shards and promotions
  function poolOf(p) { return p.pos === 'G' ? 'G' : (p.pos === 'D' ? 'D' : 'F'); }
  function promoCap() { return D.PROMO_CAP[st.div]; }
  function promoCost(p) { const next = D.RARITY[D.RIDX[p.rarity] + 1]; return next ? Math.round(next.shards * (p.pos === 'G' ? D.GOALIE_SHARD_MULT : 1)) : 0; }
  function canPromote(p) { return D.RIDX[p.rarity] < Math.min(4, promoCap() + (p.legacyB ? 1 : 0)); }
  function cheapestPromotion(pool) {
    const costs = st.team.roster.filter(p => poolOf(p) === pool && canPromote(p)).map(promoCost);
    return costs.length ? Math.min.apply(null, costs) : 0;
  }
  // sized so at least one promotion is always affordable at the end of a season, win or lose
  function shardPackage() {
    const i = D.DIVISIONS.findIndex(x => x.d === st.div);
    const base = 14 + i * 14;
    const pack = { F: base + M.ri(0, 8), D: Math.round(base * 0.6) + M.ri(0, 5), G: Math.round(base * 0.25) + M.ri(0, 3) };
    const affordable = ['F', 'D', 'G'].some(k => { const c = cheapestPromotion(k); return c && st.shards[k] + pack[k] >= c; });
    // a small top-up when a promotion is close, never a free one
    if (!affordable) { const c = cheapestPromotion('F'); if (c && c - st.shards.F <= pack.F * 2) pack.F = Math.max(pack.F, c - st.shards.F); }
    return pack;
  }
  // promotion lifts the caps only; stats stay where they are
  function promote(playerId) {
    const p = byId(playerId);
    if (!p || !canPromote(p)) return false;
    const next = D.RARITY[D.RIDX[p.rarity] + 1], pool = poolOf(p), cost = promoCost(p);
    if (st.shards[pool] < cost) return false;
    st.shards[pool] -= cost;
    p.rarity = next.k;
    toast(p.name + ' promoted to ' + next.n + '. Caps raised.', 'promo');
    save(); emit('roster'); return true;
  }
  // breakthroughs: once a player is Epic, shards keep lifting every cap by 1, up to the Legendary 99
  // pucks into shards: a late-game sink that rises 10% per buy and resets each season
  function shardPrice() { return Math.round(900 * payout() * Math.pow(1.1, st.shardBuys || 0)); }
  function buyShards(pool) { const c = shardPrice(); if (st.pucks < c) return false; st.pucks -= c; st.shards[pool] += 5; st.shardBuys = (st.shardBuys || 0) + 1; save(); return true; }
  const BREAK_MAX = 11, BREAK_STEP = 2;
  function canBreak(p) { return !!p && p.rarity === 'epic' && (p.capB || 0) < BREAK_MAX * BREAK_STEP; }
  function breakCost(p) { return Math.round((30 + 5 * (p.capB || 0)) * (p.pos === 'G' ? D.GOALIE_SHARD_MULT : 1)); }
  function breakthrough(playerId) {
    const p = byId(playerId);
    if (!canBreak(p)) return false;
    const pool = poolOf(p), cost = breakCost(p);
    if (st.shards[pool] < cost) return false;
    st.shards[pool] -= cost; p.capB = Math.min(BREAK_MAX * BREAK_STEP, (p.capB || 0) + BREAK_STEP);
    toast(p.name + ': breakthrough ' + p.capB / BREAK_STEP + '/' + BREAK_MAX + '. Every cap +' + BREAK_STEP + '.', 'promo');
    save(); emit('roster'); return true;
  }
  // the $0.99 Legend upgrade: one Epic player you love becomes Legendary (demo build: no real charge)
  function buyLegend(playerId) {
    const p = byId(playerId);
    if (!p || p.rarity !== 'epic') return false;
    p.rarity = 'legendary'; st.legendBuys = (st.legendBuys || 0) + 1;
    toast(p.name + ' is now Legendary. Every cap is 99 and a second trait slot is open.', 'gold');
    save(); emit('roster'); return true;
  }
  function beginNextSeason() { startSeason(); save(); emit('newSeason', {}); }

  // ---------------------------------------------------------------- rewards
  // drop rarity by division (8 down to 1): commons stop dropping from Division 5
  const DROP_W = [[60, 35, 5, 0, 0], [35, 45, 18, 2, 0], [15, 40, 35, 10, 0], [0, 25, 45, 27, 3], [0, 10, 40, 42, 8], [0, 0, 30, 55, 15], [0, 0, 15, 60, 25], [0, 0, 5, 55, 40]];
  // goalie gear in proportion to goalies on the roster (2 of 20); slots weighted toward what the team lacks
  function smartGear(rk) {
    const kind = M.rand() < 0.1 ? 'goalie' : 'skater';
    const slots = D.GEAR_SLOTS[kind];
    const wearers = st.team.roster.filter(p => (p.pos === 'G') === (kind === 'goalie'));
    const have = slots.map(s => wearers.filter(p => p.gear[s.k]).length + st.gear.filter(g => g.kind === kind && g.slot === s.k).length);
    const w = have.map(h => Math.max(1, wearers.length - h) + 2);
    return M.makeGear(rk, kind, slots[M.weightedIndex(w)].k);
  }
  function rollGearDrop() {
    if (M.rand() > 0.3) return null;
    const i = D.DIVISIONS.findIndex(x => x.d === st.div);
    let ri = M.weightedIndex(DROP_W[i]); if (ri < 4 && M.rand() * 100 < facVal('equip')) ri++;
    const g = smartGear(D.RARITY[ri].k);
    if (st.autoScrap != null && st.autoScrap >= 0 && ri <= st.autoScrap) { const t = salvageValue(g); st.tape += t; st.scrapped = (st.scrapped || 0) + 1; g.scrapped = t; return g; }
    st.gear.push(g);
    if (st.autoUp) D.RARITY.slice(0, 4).forEach(r => { while (st.gear.filter(x => x.rarity === r.k).length >= 5) tradeUpGear(r.k); });
    return g;
  }
  function setAutoUp(on) { st.autoUp = !!on; save(); }
  function setAutoScrap(ri) { st.autoScrap = ri; save(); }
  function offerPick(title, tier, theme) {
    if (st.pending) { st.pickQueue = st.pickQueue || []; st.pickQueue.push({ title, tier, theme }); return; }
    st.pending = buildPick(title, tier, theme);
    emit('pending', st.pending);
  }
  // theme (from an achievement) aims the gear at a matching slot and the shards at a matching pool:
  // goal achievements pay sticks and forward shards, shutouts pay goalie pads and goalie shards, and so on
  function buildPick(title, tier, theme) {
    const rk = D.RARITY[Math.min(4, Math.max(0, tier))].k;
    const opts = [];
    const g = theme && theme.slot ? M.makeGear(rk, theme.kind || 'skater', theme.slot) : smartGear(rk);
    opts.push({ t: 'gear', label: M.gearName(g), rarity: rk, g });
    const sp = Math.round((10 + tier * 14) * (1 + D.DIVISIONS.findIndex(x => x.d === st.div) * 0.15));
    const pos = theme && theme.pool ? theme.pool : M.pick(['F', 'F', 'F', 'F', 'D', 'D', 'D', 'G']);
    opts.push({ t: 'shards', label: sp + ' shards', pos, n: sp });
    const roll = M.rand();
    const xfPool = D.XFACTORS.filter(x => D.RIDX[x.r] <= Math.min(4, tier + 1));
    if (roll < 0.25 && xfPool.length) { const x = M.pick(xfPool); opts.push({ t: 'xf', label: x.n, rarity: x.r, xf: x.k }); }
    else if (roll < 0.5) { const b = M.pick(D.BOOSTS); opts.push({ t: 'boost', label: b.n, k: b.k, n: 1 + (tier >= 3 ? 1 : 0) }); }
    else { const pk = Math.round(900 * payout() * (1 + tier)); opts.push({ t: 'pucks', label: fmt(pk) + ' pucks', n: pk }); }
    return { kind: 'pick', title, sub: 'Pick one. The other two are gone.', options: opts, tier, rerolled: false };
  }
  function rerollPick() {
    const p = st.pending;
    if (!p || p.kind !== 'pick' || p.rerolled) return;
    st.pending = buildPick(p.title, p.tier); st.pending.rerolled = true;
    save(); emit('pending', st.pending);
  }
  function nextQueued() {
    st.pending = null;
    if (st.pickQueue && st.pickQueue.length) { const q = st.pickQueue.shift(); st.pending = q.pending || buildPick(q.title, q.tier, q.theme); }
    save(); emit('pending', st.pending);
  }
  function takePick(i) {
    const p = st.pending;
    if (!p || p.kind !== 'pick') return;
    const o = p.options[i];
    if (o) {
      if (o.t === 'gear') { st.gear.push(o.g); toast('Added ' + o.label + ' to the locker', 'win'); }
      else if (o.t === 'shards') st.shards[o.pos] += o.n;
      else if (o.t === 'xf') st.xfs.push(o.xf);
      else if (o.t === 'boost') st.boosts[o.k] = (st.boosts[o.k] || 0) + o.n;
      else if (o.t === 'pucks') st.pucks += o.n;
    }
    nextQueued();
  }
  function takeChampionPack(natCode) {
    const p = st.pending;
    if (!p || p.kind !== 'champion') return;
    const g = p.posGroup || 'A';
    const pos = g === 'F' ? M.pick(['LW', 'C', 'RW']) : g === 'D' ? 'D' : g === 'G' ? 'G' : g === 'S' ? M.pick(['LW', 'C', 'RW', 'D']) : M.pick(['LW', 'C', 'RW', 'D', 'G']);
    const d = D.DIVISIONS.find(x => x.d === (p.div || st.div)) || div();
    const target = Math.max(p.target || 0, Math.round((d.lo + d.hi) / 2));
    const np = M.makePlayer(pos, p.rarity, Math.min(D.RARITY[D.RIDX[p.rarity]].cap - 2, target), natCode, { avoid: nameSet() });
    np.num = freeNumber();
    np.how = 'Championship pack, season ' + (st.season - 1); np.acq = st.season;
    st.team.roster.push(np);
    toast('Signed ' + np.name + ' (' + M.rarityOf(np).n + ' ' + pos + ', ' + M.overall(np) + ' ovr). He is on your bench.', 'sign');
    nextQueued();
  }
  function nameSet() { const s = {}; st.team.roster.forEach(p => { s[p.name] = 1; }); return s; }
  function freeNumber() { const used = {}; st.team.roster.forEach(p => { used[p.num] = 1; }); for (let n = 1; n <= 99; n++) if (!used[n]) return n; return 0; }

  // ---------------------------------------------------------------- upgrades
  function spendUpgrade(playerId, attr) {
    const p = byId(playerId);
    if (!p) return false;
    if (p.a[attr] >= M.attrCap(p, attr)) return false;
    const cost = M.upgradeCost(p.a[attr]);
    if (st.pucks < cost) return false;
    st.pucks -= cost; p.a[attr]++;
    checkGold(p);
    save(); emit('roster'); return true;
  }
  function checkGold(p) {
    if (M.overall(p) > 99 && !p.goldAt) {
      p.goldAt = st.season; st.totals.gold++; bump('gold', st.totals.gold);
      toast('✨ ' + p.name + ' is a Hall of Famer', 'gold');
      card(p, 'Hall of Famer', 'Effective rating ' + M.overall(p) + '. The trophy wall keeps a page for this one.');
    }
  }

  // ---------------------------------------------------------------- gear
  function fuseCost(rk) { return 15 * (D.RIDX[rk] + 1); }
  function fuseGroups() {
    const g = {};
    st.gear.forEach(x => { if (D.RIDX[x.rarity] >= 4) return; const k = x.rarity + '|' + x.kind + '|' + x.slot; (g[k] = g[k] || []).push(x); });
    return Object.keys(g).filter(k => g[k].length >= 3).map(k => { const [rarity, kind, slot] = k.split('|'); return { key: k, rarity, kind, slot, count: g[k].length, cost: fuseCost(rarity) }; });
  }
  function fuse(key) {
    const [rarity, kind, slot] = key.split('|'), cost = fuseCost(rarity);
    const pool = st.gear.filter(x => x.rarity === rarity && x.kind === kind && x.slot === slot).sort((a, b) => M.gearBonus(a) - M.gearBonus(b)).slice(0, 3);
    if (pool.length < 3 || st.tape < cost) return null;
    st.tape -= cost;
    st.gear = st.gear.filter(x => pool.indexOf(x) < 0);
    const g = M.makeGear(D.RARITY[D.RIDX[rarity] + 1].k, kind, slot);
    st.gear.push(g);
    toast('Fused into ' + M.gearName(g) + ' (+' + g.p + ')', 'promo');
    save(); emit('roster'); return g;
  }
  function salvageValue(g) { return (D.RIDX[g.rarity] + 1) * 5 + g.level * 3; }
  function salvage(gearId) {
    const i = st.gear.findIndex(x => x.id === gearId);
    if (i < 0) return false;
    st.tape += salvageValue(st.gear[i]); st.gear.splice(i, 1);
    save(); emit('roster'); return true;
  }
  // bulk: salvage every spare of a rarity, or trade five spares of a rarity for one random piece of the next
  function salvageAll(rk) {
    const list = st.gear.filter(g => g.rarity === rk && !g.hof);
    if (!list.length) return 0;
    const tape = list.reduce((s, g) => s + salvageValue(g), 0);
    st.gear = st.gear.filter(g => g.rarity !== rk || g.hof); st.tape += tape;
    toast('Salvaged ' + list.length + ' ' + rk + ' pieces for ' + tape + ' tape', 'promo');
    save(); emit('roster'); return tape;
  }
  function tradeUpGear(rk) {
    const list = st.gear.filter(g => g.rarity === rk).sort((a, b) => M.gearValue(a) - M.gearValue(b));
    if (list.length < 5 || D.RIDX[rk] >= 4) return null;
    const out = list.slice(0, 5);
    st.gear = st.gear.filter(g => out.indexOf(g) < 0);
    const g = smartGear(D.RARITY[D.RIDX[rk] + 1].k);
    st.gear.push(g);
    toast('Traded 5 ' + rk + ' pieces for ' + M.gearName(g), 'promo');
    save(); emit('roster'); return g;
  }
  // best gear to the best players: highest trained overall picks first in every slot.
  // all=true strips every piece first so the whole roster is re-fitted.
  function autoEquip(all) {
    // only the lineup wears gear: anything on bench players goes back to the locker first
    bench().forEach(p => Object.keys(p.gear).forEach(k => { if (p.gear[k]) { st.gear.push(p.gear[k]); p.gear[k] = null; } }));
    const order = lineupIds().map(byId).filter(Boolean).sort((a, b) => M.trainedOverall(b) - M.trainedOverall(a));
    if (all) order.forEach(p => Object.keys(p.gear).forEach(k => { if (p.gear[k]) { st.gear.push(p.gear[k]); p.gear[k] = null; } }));
    let moved = 0;
    order.forEach(p => {
      const kind = p.pos === 'G' ? 'goalie' : 'skater';
      D.GEAR_SLOTS[kind].forEach(s => {
        const cands = st.gear.filter(g => g.kind === kind && g.slot === s.k).sort((a, b) => M.gearValue(b) - M.gearValue(a));
        const best = cands[0], cur = p.gear[s.k];
        if (best && (!cur || M.gearValue(best) > M.gearValue(cur))) {
          st.gear.splice(st.gear.indexOf(best), 1);
          if (cur) st.gear.push(cur);
          p.gear[s.k] = best; moved++;
        }
      });
    });
    st.team.roster.forEach(checkGold);
    save(); emit('roster');
    return moved;
  }
  function levelGear(gearId) {
    const g = findGear(gearId);
    if (!g || g.level >= 5) return false;
    const cost = gearLevelCost(g);
    if (st.pucks < cost) return false;
    st.pucks -= cost; g.level++;
    st.team.roster.forEach(checkGold);
    save(); emit('roster'); return true;
  }
  function gearLevelCost(g) { return Math.round(60 * Math.pow(1.6, D.RIDX[g.rarity]) * Math.pow(1.5, g.level) * payout()); }
  function findGear(id) {
    const g = st.gear.find(x => x.id === id); if (g) return g;
    for (const p of st.team.roster) for (const k in p.gear) if (p.gear[k] && p.gear[k].id === id) return p.gear[k];
    return null;
  }
  function equip(playerId, gearId) {
    const p = byId(playerId), idx = st.gear.findIndex(x => x.id === gearId);
    if (!p || idx < 0) return false;
    const g = st.gear[idx];
    if (g.kind !== (p.pos === 'G' ? 'goalie' : 'skater')) return false;
    const old = p.gear[g.slot];
    st.gear.splice(idx, 1);
    if (old) st.gear.push(old);
    p.gear[g.slot] = g;
    checkGold(p);
    save(); emit('roster'); return true;
  }
  function unequip(playerId, slot) {
    const p = byId(playerId);
    if (!p || !p.gear[slot]) return false;
    st.gear.push(p.gear[slot]); p.gear[slot] = null;
    save(); emit('roster'); return true;
  }
  function setXF(playerId, xfKey, slot) {
    const p = byId(playerId);
    if (!p || M.xfSlots(p) < (slot || 1)) return false;
    const i = st.xfs.indexOf(xfKey);
    if (i < 0) return false;
    // no stacking: the same trait cannot fill both slots
    if (p[slot === 2 ? 'xf' : 'xf2'] === xfKey) { toast('He already has that trait', 'loss'); return false; }
    const field = slot === 2 ? 'xf2' : 'xf';
    if (p[field]) st.xfs.push(p[field]);
    st.xfs.splice(i, 1);
    p[field] = xfKey;
    save(); emit('roster'); return true;
  }

  // ---------------------------------------------------------------- coach
  function upgradeCoach(track) {
    const lv = st.coach[track];
    if (lv >= 20) return false;
    const cost = coachCost(track);
    if (st.pucks < cost) return false;
    st.pucks -= cost; st.coach[track]++;
    save(); emit('roster'); return true;
  }
  function coachCost(track) { return Math.round(500 * Math.pow(1.45, st.coach[track]) * payout()); }
  function setStyle(s) { st.coach.style = s; save(); }
  function offlineHours() { return 4 + 4 * (st.coach.bench / 20); }
  function offlineCap() { const T = D.TUNING; return Math.round(T.offlineCapBase + (T.offlineCapMax - T.offlineCapBase) * (st.coach.bench / 20)); }

  // ---------------------------------------------------------------- draft picks
  const ROUND_ODDS = {
    1: [0, 15, 50, 28, 7], 2: [5, 35, 45, 13, 2], 3: [15, 45, 32, 8, 0], 4: [30, 48, 20, 2, 0],
    5: [50, 40, 10, 0, 0], 6: [72, 26, 2, 0, 0], 7: [100, 0, 0, 0, 0]
  };
  // drafted and signed players may sit one tier above what the division lets you promote to
  // legendary players only show up from Division 4
  function maxRarity() { return st.div <= 4 ? 4 : 3; }
  // each division climbed moves a quarter of every tier up one, so late-round picks stay relevant
  // Legendary odds are set by round and division only: a 1st-rounder always has a shot (1% in Division 8, 20% in Division 1)
  const LEG_ODDS = { 1: [1, 20], 2: [0, 8], 3: [0, 3] };
  function pickOdds(round) {
    const o = ROUND_ODDS[round].slice();
    for (let s = 0; s < 8 - st.div; s++) for (let i = 2; i >= 0; i--) { const m = o[i] * 0.35; o[i] -= m; o[i + 1] += m; }
    const t = (8 - st.div) / 7, L = LEG_ODDS[round];
    const leg = L ? L[0] + (L[1] - L[0]) * t : 0, rest = o[0] + o[1] + o[2] + o[3];
    for (let i = 0; i < 4; i++) o[i] = Math.round(o[i] / rest * (100 - leg) * 10) / 10;
    o[4] = Math.round(leg * 10) / 10;
    return o;
  }
  function addPick(round, n) { st.picks = st.picks || {}; st.picks[round] = (st.picks[round] || 0) + (n || 1); }
  function pickCount() { return Object.keys(st.picks || {}).reduce((s, k) => s + st.picks[k], 0); }
  // prospects are rated against your own team, not the division: a 1st-rounder walks into your top six
  // prospects are rated against your team but never past the top of your division (top picks may reach just over it),
  // so drafting alone cannot ratchet a team upward: training still has to do the climbing
  const ROUND_EDGE = { 1: 4, 2: 2, 3: 0, 4: -2, 5: -4, 6: -6, 7: -8 };
  function draftTarget(ri, round) {
    const d = div(), base = Math.max(d.lo, teamOvr());
    const edge = round ? ROUND_EDGE[round] : 0, ceil = d.hi + (round && round <= 2 ? 3 : 0) + facVal('scout');
    return Math.max(3, Math.min(D.RARITY[ri].cap - 2, ceil, Math.round(base + edge + ri + facVal('scout') + M.ri(-2, 2))));
  }
  // scouts lean toward the position of your weakest starter
  function needPos() {
    const L = st.team.lineup, slots = [];
    L.lines.forEach(l => l.forEach((id, j) => slots.push([id, ['LW', 'C', 'RW'][j]])));
    L.pairs.forEach(pr => pr.forEach(id => slots.push([id, 'D'])));
    slots.push([L.goalies[0], 'G']);
    let worst = null;
    slots.forEach(([id, pos]) => { const p = byId(id), o = p ? M.overall(p) : 0; if (!worst || o < worst.o) worst = { o, pos }; });
    return worst ? worst.pos : 'C';
  }
  function draft(round, free) {
    if (!free) { if (!st.picks || !st.picks[round]) return null; st.picks[round]--; }
    const odds = pickOdds(round), ri = M.weightedIndex(odds);
    const pos = M.rand() < 0.5 ? needPos() : M.pick(['LW', 'C', 'RW', 'LW', 'C', 'RW', 'D', 'D', 'D', 'G']);
    const p = M.makePlayer(pos, D.RARITY[ri].k, draftTarget(ri, round), null, { avoid: nameSet() });
    p.num = freeNumber();
    p.how = 'Drafted · ' + ord(round) + ' round, season ' + st.season; p.acq = st.season;
    st.team.roster.push(p);
    // luck is judged on Overall: how many of 200 possible picks from this round would rate at least as high
    const ovr = M.overall(p);
    let atLeast = 0;
    for (let i = 0; i < 200; i++) {
      const r2 = M.weightedIndex(odds), qpos = M.rand() < 0.5 ? needPos() : M.pick(['LW', 'C', 'RW', 'LW', 'C', 'RW', 'D', 'D', 'D', 'G']);
      const qo = M.overall(M.makePlayer(qpos, D.RARITY[r2].k, draftTarget(r2, round), null, {}));
      if (qo > ovr) atLeast++; else if (qo === ovr) atLeast += 0.5;
    }
    save(); emit('roster');
    return { p, round, odds, ri, topPct: Math.max(0.5, Math.round(1000 * atLeast / 200) / 10) };
  }
  // one ad-funded second look per pick: the first player leaves, a fresh one is drafted at the same odds
  function rescout(pid, round) {
    const p = byId(pid);
    if (!p || lineupIds().indexOf(pid) >= 0) return null;
    st.team.roster = st.team.roster.filter(q => q !== p);
    const r = draft(round, true);
    if (r) r.rescouted = true;
    return r;
  }
  // fair rates: each rarity is worth 4x the one below and each pick round 2x the round below,
  // so 1 uncommon = a 6th, 1 rare = a 4th, 1 epic = a 2nd, and two picks combine into one a round higher
  const TRADES = [
    { n: 2, r: 'common', round: 7 }, { n: 4, r: 'common', round: 6 },
    { n: 1, r: 'uncommon', round: 6 }, { n: 2, r: 'uncommon', round: 5 },
    { n: 1, r: 'rare', round: 4 }, { n: 2, r: 'rare', round: 3 },
    { n: 1, r: 'epic', round: 2 }, { n: 2, r: 'epic', round: 1 },
    { n: 3, r: 'legendary', legend: true }
  ];
  function bench() { const ids = lineupIds(); return st.team.roster.filter(p => ids.indexOf(p.id) < 0); }
  // a player who joined this season can't be flipped until next season (stops draft-and-trade loops)
  function tradeable(p) { return !p.locked; }
  function toggleLock(pid) { const p = byId(pid); if (!p) return false; p.locked = !p.locked; save(); emit('roster'); return p.locked; }
  // batch: trade every full group of the weakest tradeable bench players at this rate, as many times as possible
  function batchTrade(ti) {
    const t = TRADES[ti]; if (!t || t.legend) return 0;
    let n = 0;
    for (;;) {
      const ps = bench().filter(p => p.rarity === t.r && tradeable(p)).sort((a, b) => M.overall(a) - M.overall(b)).slice(0, t.n);
      if (ps.length < t.n || !tradePlayers(ti, ps.map(p => p.id), { quiet: true })) break;
      n++;
    }
    if (n) toast('Batch trade: ' + n * t.n + ' ' + t.r + ' player' + (n * t.n > 1 ? 's' : '') + ' for ' + n + ' ' + ord(t.round) + '-round pick' + (n > 1 ? 's' : '') + '. Gear and traits went to your locker.', 'promo');
    return n;
  }
  function stripToLocker(p) {
    Object.keys(p.gear).forEach(k => { if (p.gear[k]) { st.gear.push(p.gear[k]); p.gear[k] = null; } });
    if (p.xf) st.xfs.push(p.xf); if (p.xf2) st.xfs.push(p.xf2); p.xf = p.xf2 = null;
  }
  function tradePlayers(ti, ids, opt) {
    const t = TRADES[ti], b = bench();
    const ps = ids.filter((id, i) => ids.indexOf(id) === i).map(id => b.find(p => p.id === id)).filter(Boolean);
    if (ps.length !== t.n || ps.some(p => p.rarity !== t.r || !tradeable(p))) return false;
    ps.forEach(stripToLocker);
    st.team.roster = st.team.roster.filter(p => ps.indexOf(p) < 0);
    if (t.legend) {
      // three Legendaries for one, with the nationality and position you choose
      opt = opt || {};
      const pos = opt.pos === 'G' ? 'G' : opt.pos === 'D' ? 'D' : opt.pos && ['LW', 'C', 'RW'].indexOf(opt.pos) >= 0 ? opt.pos : M.pick(['LW', 'C', 'RW']);
      const target = Math.min(97, Math.max.apply(null, ps.map(p => M.trainedOverall(p))) + 2);
      const np = M.makePlayer(pos, 'legendary', target, opt.nat || null, { avoid: nameSet() });
      np.num = freeNumber(); np.acq = st.season;
      np.how = 'Three-for-one Legendary trade, season ' + st.season;
      st.team.roster.push(np);
      toast('Traded three Legendaries for ' + np.name + ' (' + pos + ', ' + M.overall(np) + ' ovr). Their gear and traits went to your locker.', 'sign');
      save(); emit('roster'); return np;
    }
    addPick(t.round);
    if (!(opt && opt.quiet)) toast('Traded ' + ps.map(p => p.name).join(', ') + ' for a ' + ord(t.round) + '-round pick. Their gear and traits went to your locker.', 'promo');
    save(); emit('roster'); return true;
  }
  function combinePicks(round) {
    if (round <= 1 || !st.picks || (st.picks[round] || 0) < 2) return false;
    st.picks[round] -= 2; addPick(round - 1);
    toast('Two ' + ord(round) + '-rounders became a ' + ord(round - 1) + '-round pick', 'promo');
    save(); return true;
  }
  function refreshAgents(force) {
    if (!force && st.fa && st.fa.length && Date.now() - (st.faAt || 0) < 4 * 3600e3) return;
    const i = D.DIVISIONS.findIndex(x => x.d === st.div);
    const w = [[55, 38, 7, 0, 0], [45, 42, 13, 0, 0], [30, 45, 22, 3, 0], [20, 45, 30, 5, 0], [12, 40, 38, 10, 0], [6, 30, 44, 18, 2], [3, 22, 45, 26, 4], [2, 15, 42, 33, 8]][i];
    const cap = maxRarity(), avoid = nameSet();
    st.fa = [];
    for (let n = 0; n < 3; n++) {
      const ri = Math.min(M.weightedIndex(w), cap);
      const pos = M.pick(['LW', 'C', 'RW', 'D', 'D', 'G']);
      const p = M.makePlayer(pos, D.RARITY[ri].k, draftTarget(ri), null, { avoid });
      st.fa.push({ p, cost: Math.round((350 * Math.pow(2.3, ri) + M.overall(p) * 25) * payout()), sold: false });
    }
    st.faAt = Date.now();
  }
  function signAgent(i) {
    const a = st.fa && st.fa[i];
    if (!a || a.sold || st.pucks < a.cost) return null;
    st.pucks -= a.cost; a.sold = true;
    const p = JSON.parse(JSON.stringify(a.p));
    p.id = M.uid('p'); p.num = freeNumber();
    p.how = 'Signed as a free agent, season ' + st.season; p.acq = st.season;
    st.team.roster.push(p);
    toast('Signed ' + p.name + '. He is on your bench.', 'sign');
    save(); emit('roster'); return p;
  }

  // ---------------------------------------------------------------- lineup
  function group(p) { return !p ? null : p.pos === 'G' ? 'G' : p.pos === 'D' ? 'D' : 'F'; }
  function slotOf(id) {
    const L = st.team.lineup;
    for (let i = 0; i < 4; i++) { const j = L.lines[i].indexOf(id); if (j >= 0) return { arr: L.lines[i], j }; }
    for (let i = 0; i < 3; i++) { const j = L.pairs[i].indexOf(id); if (j >= 0) return { arr: L.pairs[i], j }; }
    const j = L.goalies.indexOf(id); if (j >= 0) return { arr: L.goalies, j };
    return null;
  }
  // the position a lineup spot needs: LW/C/RW by column on forward lines, D on pairs, G in net
  function slotPos(id) {
    const L = st.team.lineup;
    for (let i = 0; i < 4; i++) { const j = L.lines[i].indexOf(id); if (j >= 0) return ['LW', 'C', 'RW'][j]; }
    if (L.pairs.some(pr => pr.indexOf(id) >= 0)) return 'D';
    if (L.goalies.indexOf(id) >= 0) return 'G';
    return null;
  }
  function canSwap(aId, bId) {
    const a = byId(aId), b = byId(bId);
    if (!a || !b || aId === bId || !(slotOf(aId) || slotOf(bId))) return false;
    const sa = slotPos(aId), sb = slotPos(bId);
    return (!sa || b.pos === sa) && (!sb || a.pos === sb);
  }
  function lineupSwap(aId, bId) {
    if (!canSwap(aId, bId)) return false;
    const a = slotOf(aId), b = slotOf(bId);
    // gear stays with the lineup spot: whoever goes to the bench hands his gear to whoever comes in
    if (!a !== !b) { const pa = byId(aId), pb = byId(bId), g = pa.gear; pa.gear = pb.gear; pb.gear = g; }
    if (a) a.arr[a.j] = bId;
    if (b) b.arr[b.j] = aId;
    save(); emit('roster'); return true;
  }
  function repairRoster() {
    const seen = {};
    st.team.roster.forEach(p => { if (seen[p.id]) p.id = M.uid('p'); seen[p.id] = 1; });
    const gseen = {};
    const fixG = g => { if (!g) return; if (gseen[g.id]) g.id = M.uid('g'); gseen[g.id] = 1; };
    st.team.roster.forEach(p => Object.keys(p.gear).forEach(k => fixG(p.gear[k])));
    st.gear.forEach(fixG);
    const L = st.team.lineup, used = {};
    const FP = ['LW', 'C', 'RW'];
    const ok = (id, pos) => { const p = byId(id); if (!p || p.pos !== pos || used[id]) return false; used[id] = 1; return true; };
    let holes = 0;
    L.lines.forEach(l => l.forEach((id, i) => { if (!ok(id, FP[i])) { l[i] = null; holes++; } }));
    L.pairs.forEach(l => l.forEach((id, i) => { if (!ok(id, 'D')) { l[i] = null; holes++; } }));
    L.goalies.forEach((id, i) => { if (!ok(id, 'G')) { L.goalies[i] = null; holes++; } });
    if (!holes) return 0;
    // best free player at the exact position; only if there is none, any free player of the same group
    const fill = (arr, posOf) => arr.forEach((id, i) => {
      if (id) return;
      const pos = posOf(i), free = st.team.roster.filter(p => !used[p.id]).sort((a, b) => M.overall(b) - M.overall(a));
      const c = free.find(p => p.pos === pos) || free.find(p => group(p) === group({ pos }));
      if (c) { arr[i] = c.id; used[c.id] = 1; }
    });
    L.lines.forEach(l => fill(l, i => FP[i])); L.pairs.forEach(l => fill(l, () => 'D')); fill(L.goalies, () => 'G');
    return holes;
  }

  // ---------------------------------------------------------------- prestige
  // After an Elite (Division 1) title you may start over in Division 8 with up to three Legacy players.
  // Legacy players drop to Rare with Division 8 ratings, but keep their trophies, look and history, get +2 to
  // every attribute per prestige they carry, and can be promoted all the way to Legendary with shards.
  // The whole club earns +10% income per prestige level.
  // Legacy slots grow with each franchise: 1 for your second franchise, 2 for your third, up to 5
  function keepLimit() { return Math.min(5, (st.prestige || 0) + 1); }
  // only in the offseason right after winning the Division 1 championship
  function canPrestige() { const h = st && st.history[0]; return !!h && st.phase === 'offseason' && h.result === 'Champion' && h.div === 1 && (h.fr || 1) === franchiseNo(); }
  function prestige(keepIds) {
    if (!canPrestige()) return false;
    const keep = (keepIds || []).slice(0, keepLimit()).map(byId).filter(Boolean);
    // Hall of Fame gear is forever: collect it from the locker and every player before the reset
    const hof = st.gear.filter(g => g.hof);
    st.team.roster.forEach(p => Object.keys(p.gear).forEach(k => { if (p.gear[k] && p.gear[k].hof) hof.push(p.gear[k]); }));
    st.prestige = (st.prestige || 0) + 1;
    keep.forEach(p => {
      Object.keys(p.gear).forEach(k => { p.gear[k] = null; });
      p.xf = p.xf2 = null; p.capB = 0; p.locked = false;
      p.rarity = 'rare';
      const f = 16 / Math.max(16, M.trainedOverall(p));
      Object.keys(p.a).forEach(k => { p.a[k] = Math.max(3, Math.min(M.attrCap(p, k), Math.round(p.a[k] * f))); });
      p.legacyB = (p.legacyB || 0) + 2;
      p.how = 'Legacy player · carried into Franchise ' + (st.prestige + 1);
      p.acq = null;
    });
    const fresh = M.makeRoster(10, 'common');
    keep.forEach(k => { const i = fresh.findIndex(p => p.pos === k.pos && !p.kept); if (i >= 0) fresh.splice(i, 1); });
    const used = {}; keep.forEach(k => { used[k.num] = 1; });
    fresh.forEach(p => { if (used[p.num]) { let n = 1; while (used[n]) n++; p.num = n; } used[p.num] = 1; });
    st.team.roster = keep.concat(fresh);
    st.team.lineup = M.defaultLineup(st.team.roster);
    st.div = 8; st.promos = 0; st.eliteSeasons = 0;
    st.pucks = 0; st.tape = 0; st.shards = { F: 0, D: 0, G: 0 }; st.gear = hof; st.picks = {}; st.xfs = [];
    st.fac = {}; applyFac(); st.pending = null; st.pickQueue = [];
    // a new franchise starts clean: coach skills, achievements and the Elite-title requirement all reset;
    // lifetime totals are kept for the franchise achievements
    st.coach.bench = 0; st.coach.skills = 0; st.coach.video = 0;
    st.life = st.life || {}; Object.keys(st.totals).forEach(k => { st.life[k] = (st.life[k] || 0) + (st.totals[k] || 0); st.totals[k] = 0; });
    st.life.elite = (st.life.elite || 0) + (st.eliteTitles || 0); st.eliteTitles = 0;
    st.life.legacy = (st.life.legacy || 0) + keep.length;
    st.ach = {}; st.achClaim = []; st.season = 1;
    st.daily = { day: 1, claimed: 0, last: null, ready: true }; st.tapDay = null; st.tapNext = 0;
    startSeason();
    toast('Franchise ' + (st.prestige + 1) + ' begins! Back to the Rec League with ' + keep.length + ' Legacy player' + (keep.length === 1 ? '' : 's') + ' and +' + (st.prestige * 10) + '% income.', 'gold');
    save(); emit('roster'); emit('newSeason', {});
    return true;
  }
  // ---------------------------------------------------------------- franchise achievements (never reset)
  // Franchise Builder pays out every new franchise; the others are long career and tapping goals.
  // Each claim lets you pick one reward: a Hall of Fame gear piece or a trait.
  const FACH = [
    { k: 'franchises', n: 'Franchise Builder', d: 'Start a new franchise (pays every time)', repeat: true },
    { k: 'points', n: 'Franchise Icon', d: 'One player reaches career points', tiers: [1000, 2500, 5000] },
    { k: 'games', n: 'Iron Man', d: 'One player reaches career games played', tiers: [500, 1000, 2000] },
    { k: 'combo', n: 'Golden Touch', d: 'Reach a tap combo', tiers: [5000, 10000] }
  ];
  function careerBest() {
    const life = st.life = st.life || {};
    st.team.roster.forEach(p => {
      if (p.pos !== 'G') life.maxPts = Math.max(life.maxPts || 0, p.career.p || 0);
      life.maxGp = Math.max(life.maxGp || 0, p.career.gp || 0);
    });
    return life;
  }
  function fachValue(k) {
    if (k === 'franchises') return st.prestige || 0;
    const life = careerBest();
    if (k === 'points') return life.maxPts || 0;
    if (k === 'games') return life.maxGp || 0;
    if (k === 'combo') return st.bestCombo || 0;
    return 0;
  }
  function fachNeed(a, got) { return a.repeat ? got + 1 : a.tiers[got]; }
  function makeHofGear() {
    const kind = M.rand() < 0.15 ? 'goalie' : 'skater', slot = M.pick(D.GEAR_SLOTS[kind]).k;
    const g = M.makeGear('legendary', kind, slot);
    g.hof = true; g.p = Math.round(g.p * 1.35) + 1; g.s = Math.round((g.s || 0) * 1.35) + 1;
    return g;
  }
  // step 1: roll the two choices for the next tier and hold them until you pick
  function offerFach(k) {
    const a = FACH.find(x => x.k === k); if (!a) return null;
    st.fach = st.fach || {};
    const got = st.fach[k] || 0, need = fachNeed(a, got);
    if (need == null || fachValue(k) < need) return null;
    const pool = D.XFACTORS.filter(x => D.RIDX[x.r] >= (got >= 1 ? 3 : 2));
    st.fachOffer = { k, tier: got + 1, g: makeHofGear(), x: M.pick(pool).k };
    save(); return st.fachOffer;
  }
  // step 2: take the gear or the trait
  function takeFach(choice) {
    const o = st.fachOffer; if (!o) return false;
    const a = FACH.find(x => x.k === o.k);
    st.fach[o.k] = (st.fach[o.k] || 0) + 1;
    if (choice === 'gear') { st.gear.push(o.g); toast(a.n + ' ' + o.tier + ': ' + M.gearName(o.g), 'gold'); }
    else { st.xfs.push(o.x); toast(a.n + ' ' + o.tier + ': the ' + D.XFACTORS.find(x => x.k === o.x).n + ' trait', 'gold'); }
    st.fachOffer = null;
    save(); emit('roster'); return true;
  }
  // what the player can act on right now, for the red dots on the tab bar
  function alerts() {
    const out = { team: 0, store: 0, season: 0, trophies: 0 };
    if (!st) return out;
    const ids = lineupIds();
    let gearUp = false;
    ids.forEach(id => {
      const p = byId(id); if (!p || gearUp) return;
      const kind = p.pos === 'G' ? 'goalie' : 'skater';
      D.GEAR_SLOTS[kind].forEach(s => {
        const cur = p.gear[s.k], best = st.gear.filter(g => g.kind === kind && g.slot === s.k).reduce((m, g) => Math.max(m, M.gearValue(g)), -1);
        if (best >= 0 && (!cur || best > M.gearValue(cur))) gearUp = true;
      });
    });
    if (gearUp) out.team++;
    ids.forEach(id => { const p = byId(id); if (p && ((canPromote(p) && st.shards[poolOf(p)] >= promoCost(p)) || (canBreak(p) && st.shards[poolOf(p)] >= breakCost(p)))) out.team++; });
    out.store = pickCount();
    if (st.phase === 'playoffs' || st.phase === 'offseason') out.season = 1;
    out.trophies = (st.achClaim || []).length + (dailyState().ready ? 1 : 0) +
      FACH.filter(a => { const got = (st.fach && st.fach[a.k]) || 0, need = fachNeed(a, got); return need != null && fachValue(a.k) >= need; }).length;
    return out;
  }
  // ---------------------------------------------------------------- daily, demo, dev
  // daily practice goals: tap milestones that pay shards (and a pick at the top), so tapping matters beyond pucks
  const TAP_GOALS = [{ n: 200, s: 12 }, { n: 800, s: 30 }, { n: 2000, s: 40, pick: 5 }];
  function tapDay() { const d = new Date().toDateString(); if (!st.tapDay || st.tapDay.d !== d) st.tapDay = { d, n: 0, got: 0 }; return st.tapDay; }
  // after the daily goals, every 500 more taps drops something: gear, a late pick, pucks or shards, in turn
  const TAP_DROP_EVERY = 500, TAP_DROPS = ['gear', 'pucks', 'pick', 'shards'];
  function countTap(n) {
    if (!st) return;
    const t = tapDay();
    for (let i = 0; i < (n || 1); i++) {
      t.n++;
      const g = TAP_GOALS[t.got];
      if (g && t.n >= g.n) {
        t.got++;
        const F = Math.round(g.s * 0.5), Dd = Math.round(g.s * 0.35), Gg = g.s - F - Dd;
        st.shards.F += F; st.shards.D += Dd; st.shards.G += Gg;
        if (g.pick) addPick(g.pick);
        toast('Practice goal ' + t.got + '/' + TAP_GOALS.length + ': ' + g.n + ' taps today. +' + F + ' F, +' + Dd + ' D, +' + Gg + ' G shards' + (g.pick ? ' and a ' + ord(g.pick) + '-round pick' : ''), 'promo');
        save();
      } else if (!g) {
        const past = t.n - TAP_GOALS[TAP_GOALS.length - 1].n;
        if (past > 0 && past % TAP_DROP_EVERY === 0) tapDrop(t);
      }
    }
  }
  function tapDrop(t) {
    const kind = TAP_DROPS[(t.drops = (t.drops || 0) + 1) % TAP_DROPS.length];
    let msg = '';
    if (kind === 'gear') { const i = D.DIVISIONS.findIndex(x => x.d === st.div); const g = smartGear(D.RARITY[Math.min(4, M.weightedIndex(DROP_W[i]))].k); st.gear.push(g); msg = M.gearName(g); }
    else if (kind === 'pucks') { const pk = Math.round(clickValue() * 150); st.pucks += pk; msg = fmt(pk) + ' pucks'; }
    else if (kind === 'pick') { const r = M.rand() < 0.5 ? 6 : 7; addPick(r); msg = 'a ' + ord(r) + '-round pick'; }
    else { const s = 6 + D.DIVISIONS.findIndex(x => x.d === st.div) * 2; st.shards.F += s; st.shards.D += Math.round(s / 2); msg = s + ' F and ' + Math.round(s / 2) + ' D shards'; }
    toast('Practice bonus: ' + msg, 'promo');
    save(); emit('roster');
  }
  function noteCombo(c) { if (st && c > (st.bestCombo || 0)) { st.bestCombo = c; bump('combo', c); } }
  // weekly login calendar: claim once a day; miss a day and it restarts at day 1; day 7 is the big one
  const DAILY = [
    { n: 'Pucks', d: 'A bag of pucks' },
    { n: 'Shards', d: '25 forward shards' },
    { n: 'Boost', d: 'A random boost' },
    { n: 'Gear', d: 'A piece of Rare-or-better gear' },
    { n: 'Tape', d: '60 tape and 15 defense shards' },
    { n: '3rd-rounder', d: 'A 3rd-round draft pick' },
    { n: 'Jackpot', d: 'A 1st-round pick, 40 shards of each kind and a trait' }
  ];
  function dailyState() { st.daily = st.daily || { day: 1, claimed: 0, last: null, ready: false }; return st.daily; }
  function checkDaily() {
    const d = dailyState(), today = new Date().toDateString();
    if (d.ready || d.last === today) return d.ready;
    const y = new Date(Date.now() - 864e5).toDateString();
    d.day = d.last === y ? (d.claimed % 7) + 1 : 1;
    d.ready = true;
    save(); return true;
  }
  function dailyReward(day) {
    const P = payout();
    if (day === 1) return { pucks: Math.round(800 * P) };
    if (day === 2) return { shards: { F: 25 } };
    if (day === 3) return { boost: M.pick(D.BOOSTS).k };
    if (day === 4) return { gear: true };
    if (day === 5) return { tape: 60, shards: { D: 15 } };
    if (day === 6) return { pick: 3 };
    return { pick: 1, shards: { F: 40, D: 40, G: 40 }, trait: true };
  }
  function claimDaily() {
    const d = dailyState();
    if (!d.ready) return null;
    const r = dailyReward(d.day), got = [];
    if (r.pucks) { st.pucks += r.pucks; got.push(fmt(r.pucks) + ' pucks'); }
    if (r.shards) Object.keys(r.shards).forEach(k => { st.shards[k] += r.shards[k]; got.push(r.shards[k] + ' ' + k + ' shards'); });
    if (r.tape) { st.tape += r.tape; got.push(r.tape + ' tape'); }
    if (r.boost) { st.boosts[r.boost] = (st.boosts[r.boost] || 0) + 1; got.push(D.BOOSTS.find(b => b.k === r.boost).n + ' boost'); }
    if (r.gear) { const ri = Math.min(4, Math.max(2, D.PROMO_CAP[st.div])); const g = smartGear(D.RARITY[ri].k); st.gear.push(g); got.push(M.gearName(g)); }
    if (r.pick) { addPick(r.pick); got.push('a ' + ord(r.pick) + '-round pick'); }
    if (r.trait) { const x = M.pick(D.XFACTORS.filter(x => D.RIDX[x.r] <= 3)); st.xfs.push(x.k); got.push(x.n + ' trait'); }
    d.ready = false; d.claimed = d.day; d.last = new Date().toDateString();
    toast('Day ' + d.day + ': ' + got.join(', '), 'promo');
    save(); emit('roster');
    return got;
  }
  function applySpeed() {
    const T = D.TUNING;
    if (st && st.demo) { T.gameIntervalSec = 8; T.playoffGameSec = 12; } else { T.gameIntervalSec = 30; T.playoffGameSec = 36; }
  }
  function setDemo(on) { st.demo = !!on; applySpeed(); save(); }
  function devGrant() {
    const pk = Math.max(250000, Math.round(M.upgradeCost(teamOvr()) * 400));
    st.pucks += pk; st.tape += 500;
    st.shards.F += 500; st.shards.D += 500; st.shards.G += 500;
    [1, 2, 3, 4, 5, 6, 7].forEach(r => addPick(r));
    D.BOOSTS.forEach(b => { st.boosts[b.k] = (st.boosts[b.k] || 0) + 1; });
    toast('Developer: +' + fmt(pk) + ' pucks, +500 tape, +500 of each shard, one pick per round, one of each boost', 'promo');
    save(); emit('roster');
  }
  function ord(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function addPucks(n) { st.pucks += n; }

  // ---------------------------------------------------------------- achievements: reached tiers wait to be claimed
  function bump(key, value) {
    const a = D.ACHIEVEMENTS.find(x => x.k === key); if (!a) return;
    st.ach[key] = st.ach[key] || 0;
    a.tiers.forEach((t, i) => {
      if (value >= t && st.ach[key] < i + 1) {
        st.ach[key] = i + 1;
        st.achClaim = st.achClaim || [];
        st.achClaim.push({ k: key, tier: i, t });
        toast('🏅 Achievement ready to claim: ' + a.n + ' ' + t, 'ach');
      }
    });
  }
  function claimAch(idx) {
    const c = st.achClaim && st.achClaim[idx];
    if (!c) return false;
    st.achClaim.splice(idx, 1);
    const a = D.ACHIEVEMENTS.find(x => x.k === c.k);
    offerPick(a.n + ' · ' + c.t, Math.min(4, Math.floor(c.tier / 2) + 1), a.theme);
    save(); return true;
  }

  // ---------------------------------------------------------------- misc
  function sorted() { return st.standings.slice().sort((a, b) => (b.w * 2 + b.otl) - (a.w * 2 + a.otl) || (b.gf - b.ga) - (a.gf - a.ga)); }
  function toast(msg, kind) {
    if (awayLog) return; emit('toast', { msg, kind }); }
  function fmt(n) {
    n = Math.round(n);
    if (n >= 1e9) return (n / 1e9).toFixed(n < 1e10 ? 2 : 1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(n < 1e7 ? 2 : 1) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(n < 1e5 ? 1 : 0) + 'K';
    return String(n);
  }

  // ---------------------------------------------------------------- save
  function save() {
    try { st.lastSave = Date.now(); const s = Object.assign({}, st); delete s.toasts; localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* quota or private mode */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      st = JSON.parse(raw);
      if (!st || st.v !== 1) { st = null; return null; }
      M.setFavorite(st.fav || null);
      st.team.roster.forEach(M.migratePlayer);
      (st.fa || []).forEach(a => M.migratePlayer(a.p));
      st.gear.forEach(g => { if (g.kind === 'goalie' && !D.GEAR_SLOTS.goalie.some(s => s.k === g.slot)) g.slot = 'glove'; });
      const lv = g => { if (g && g.level) { g.p += g.level; g.level = 0; } if (g && !st.gearV2) { g.p = Math.max(1, Math.round(g.p * 0.47)); g.s = Math.round((g.s || 0) * 0.4); } };
      st.gear.forEach(lv); st.team.roster.forEach(p => Object.keys(p.gear).forEach(k => lv(p.gear[k])));
      (st.shop || []).forEach(it => lv(it.g)); st.gearV2 = true;
      if (!st.coach.name) Object.assign(st.coach, makeCoach(), { bench: st.coach.bench, skills: st.coach.skills, video: st.coach.video });
      st.coach.style = st.coach.style || 'bal';
      st.boosts = st.boosts || {}; st.active = st.active || []; st.achClaim = st.achClaim || [];
      if (st.pending && st.pending.kind === 'pick' && st.pending.options.some(o => !o.g && o.n == null && !o.xf && !o.k)) st.pending = buildPick(st.pending.title, st.pending.tier || 1);
      if (st.phase === 'missed') endSeason(false);
      if (st.tokens != null) { if (st.tokens > 0) addPick(6, st.tokens); delete st.tokens; }
      st.picks = st.picks || {}; st.fac = st.fac || {}; applyFac();
      if (st.demo && !st.dev) st.demo = false;
      const fixed = repairRoster();
      if (fixed) setTimeout(() => toast('Fixed ' + fixed + ' lineup slot' + (fixed > 1 ? 's' : '') + ' that held the wrong player', 'promo'), 600);
      applySpeed();
      return st;
    } catch (e) { console.error(e); st = null; return null; }
  }
  function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } st = null; }

  // games and pucks banked while the app was closed: half the passive rate, up to four hours
  // while away: offline pucks plus banked games; milestones are collected for the welcome-back summary instead of popping up
  let awayLog = null;
  function catchUp() {
    if (!st) return { games: 0, pucks: 0 };
    const now = Date.now();
    let pucks = 0;
    const awaySec = (now - (st.lastSave || now)) / 1000;
    // away earnings: a quarter of passive, for up to 2 hours (the bench boss stretches it to 4)
    // the away allowance is per calendar day, not per visit: checking in five times does not earn five allowances
    const today = new Date().toDateString();
    if (!st.offDay || st.offDay.d !== today) st.offDay = { d: today, sec: 0, games: 0 };
    if (awaySec > 60) {
      const sec = Math.max(0, Math.min(awaySec, offlineHours() * 3600 - st.offDay.sec));
      st.offDay.sec += sec;
      pucks = Math.round(0.5 * passiveRate() * sec); st.pucks += pucks;
    }
    let n = 0;
    const me0 = teamById('me') ? Object.assign({}, teamById('me')) : null, rank0 = sorted().findIndex(t => t.id === 'me') + 1;
    const pts0 = {}; st.team.roster.forEach(p => { pts0[p.id] = p.pos === 'G' ? (p.season.w || 0) : (p.season.p || 0); });
    const bank0 = st.pucks, gear0 = st.gear.length, ach0 = (st.achClaim || []).length, phase0 = st.phase;
    awayLog = { cards: [] };
    if (st.phase === 'season') {
      const elapsed = (now - (st.lastTick || now)) / 1000;
      n = Math.max(0, Math.min(Math.floor(elapsed / D.TUNING.gameIntervalSec), offlineCap() - st.offDay.games, st.schedule.length - st.gameIndex));
      st.offDay.games += n;
      for (let i = 0; i < n && st.phase === 'season'; i++) playNextGame();
    }
    const cards = awayLog.cards; awayLog = null;
    st.lastTick = now;
    save();
    const out = { games: n, pucks, awaySec: Math.round(awaySec), cards };
    if (n && me0) {
      const me1 = teamById('me') || me0;
      out.rec = { w: me1.w - me0.w, l: me1.l - me0.l, otl: me1.otl - me0.otl, gf: me1.gf - me0.gf, ga: me1.ga - me0.ga };
      out.rank0 = rank0; out.rank1 = sorted().findIndex(t => t.id === 'me') + 1;
      out.gamePucks = Math.max(0, st.pucks - bank0);
      out.gear = Math.max(0, st.gear.length - gear0);
      let best = null;
      st.team.roster.forEach(p => { if (p.pos === 'G') return; const d = (p.season.p || 0) - (pts0[p.id] || 0); if (d > 0 && (!best || d > best.d)) best = { d, name: p.name, g: (p.season.g || 0), id: p.id }; });
      out.top = best;
      out.ach = Math.max(0, (st.achClaim || []).length - ach0);
      out.playoffs = phase0 === 'season' && st.phase === 'playoffs';
      out.missed = phase0 === 'season' && st.phase !== 'season' && st.phase !== 'playoffs';
    }
    return out;
  }

  G.ST = {
    on, emit, get, div, divRef, franchiseNo, payout, newGame, startSeason, beginNextSeason,
    prepareGame, commitGame, playNextGame, enterPlayoffs, preparePlayoff, commitPlayoff, playPlayoffGame,
    sorted, teamById, offerPick, takePick, rerollPick, takeChampionPack,
    spendUpgrade, promote, promoCost, canPromote, promoCap, levelGear, gearLevelCost, equip, unequip, salvage, salvageAll, tradeUpGear, autoEquip, setXF,
    upgradeCoach, coachCost, setStyle, offlineCap, offlineHours, addPucks, breakCost, canBreak, breakthrough, buyLegend, BREAK_MAX, shardPrice, buyShards,
    teamOvr, clickValue, passiveRate, tickPassive, activeBoosts, buyBoost, activateBoost, boostCost,
    fuseGroups, fuse, fuseCost, checkDaily, claimDaily, dailyState, DAILY, countTap, tapDay, TAP_GOALS, TAP_DROP_EVERY, noteCombo, alerts, setDemo, applySpeed, devGrant, claimAch,
    AWARDS, ROUND_ODDS, TRADES, pickOdds, maxRarity, addPick, pickCount, draft, rescout, tradePlayers, combinePicks,
    refreshAgents, signAgent, lineupIds, bench, canSwap, lineupSwap, group, repairRoster, tradeable, toggleLock, batchTrade,
    facLvl, facVal, facMax, facCost, buildFac, canPrestige, prestige, keepLimit, FACH, fachValue, fachNeed, offerFach, takeFach, setAutoScrap, setAutoUp,
    save, load, wipe, catchUp, toast, fmt, findGear, freeNumber, checkGold, rollGearDrop, ord
  };
})(window.BK = window.BK || {});
