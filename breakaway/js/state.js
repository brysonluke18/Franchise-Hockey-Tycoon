/* Breakaway — game state, season loop, economy, save */
(function (G) {
  'use strict';
  const D = G.DATA, M = G.M, S = G.SIM;
  // three save files: slot 1 keeps the original key so existing saves stay where they are
  const SAVE_BASE = 'breakaway.save.v1', SLOT_KEY = 'breakaway.slot', SLOTS = 3;
  function slotKey(i) { return i ? SAVE_BASE + '.s' + i : SAVE_BASE; }
  function curSlot() { try { const v = parseInt(localStorage.getItem(SLOT_KEY), 10); return v >= 0 && v < SLOTS ? v : 0; } catch (e) { return 0; } }
  let SAVE_KEY = slotKey(curSlot());
  function slotInfo(i) {
    try {
      const raw = localStorage.getItem(slotKey(i)); if (!raw) return null;
      const s = JSON.parse(raw); if (!s || !s.team) return null;
      const d = D.DIVISIONS.find(x => x.d === s.div);
      return { city: s.team.city, name: s.team.name, abbr: s.team.abbr, c1: s.team.c1, c2: s.team.c2, c3: s.team.c3, team: s.team, div: s.div, divName: d ? d.n : '', fr: (s.prestige || 0) + 1, season: s.season, cups: (s.totals && s.totals.cups) || 0, last: s.lastSave || 0 };
    } catch (e) { return null; }
  }
  // switching saves the current file first; the page then reloads into the chosen one (an empty slot starts a new team)
  // st is dropped so nothing (like the save that runs when the page hides) can write this team into the new slot
  function useSlot(i) { if (st) save(); try { localStorage.setItem(SLOT_KEY, String(i)); } catch (e) { return false; } st = null; return true; }
  function deleteSlot(i) { try { localStorage.removeItem(slotKey(i)); } catch (e) { } if (i === curSlot()) st = null; }

  let st = null;
  const listeners = [];
  function on(fn) { listeners.push(fn); }
  function emit(ev, data) { listeners.forEach(f => f(ev, data)); }

  function get() { return st; }
  function div() { return D.DIVISIONS.find(d => d.d === st.div); }
  // 15 divisions share the reward and odds tables that were built for 8: tier() is that older 8..1 scale
  // (15-14 -> 8, 13-12 -> 7, ... 3-2 -> 2, 1 -> 1) and tierIdx() its 0..7 index
  function tier() { return 8 - Math.floor((15 - st.div) / 2); }
  function tierIdx() { return 8 - tier(); }
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
  function facMax() { return 2 + (15 - st.div); }
  // early levels used to cost almost nothing; now each level is a real decision (about 3x early, +40% late)
  function facCost(k) { return Math.round(1200 * Math.pow(2.0, facLvl(k)) * payout()); }
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
      v: 1, team, div: 15, div15: true, season: 1, promos: 0, fav: kit.fav || null,
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
  // Division 1 is a 32-team league (16 make the playoffs, four rounds); every other division has 16 teams (8, three rounds)
  function leagueSize() { return st.div === 1 ? 32 : 16; }
  function poTeams() { return st.div === 1 ? 16 : 8; }
  function poRounds() { return poTeams() === 16 ? 4 : 3; }
  function roundNames() { return poRounds() === 4 ? ['Round 1', 'Round 2', 'Conference Finals', 'Finals'] : ['Round 1', 'Round 2', 'Finals']; }
  function aiTeams() {
    const d = div();
    const out = [];
    const local = st.fav && tier() >= 6 && D.CITY_BY_NAT[st.fav];
    const cities = (local ? D.CITY_BY_NAT[st.fav] : D.CITIES).slice();
    const mascots = D.MASCOTS.slice();
    const uniq = a => a.filter((x, i) => a.indexOf(x) === i);
    if (cities.length < leagueSize()) cities.push.apply(cities, uniq(D.CITIES.concat(D.EXTRA_CITIES || [])).filter(c => cities.indexOf(c) < 0));
    mascots.push.apply(mascots, (D.EXTRA_MASCOTS || []).filter(m => mascots.indexOf(m) < 0));
    // the very first season leans a little easier
    const ease = st.season === 1 && st.div === 15 ? -1.5 : 0;
    // low divisions keep the field within about 30% of the middle, so no Rec League superteam runs the table
    const ref = (d.lo + d.hi) / 2, lo = Math.max(d.lo, ref / 1.3), hi = Math.min(d.hi, ref * 1.3);
    // from Division 10 up the league is deeper than its rating band: about +1 per division, +9 in Elite
    const deep = Math.max(0, (11 - st.div) * 0.9);
    // in Division 1 the league catches up: rivals improve each season you spend there
    const climb = st.div === 1 ? Math.min(30, 2.5 * (st.eliteSeasons || 0)) : 0;
    // every new franchise the whole league is stronger: +5% and +1 Overall per franchise (up to +35%)
    const fr = st.prestige || 0, hard = Math.min(1.35, 1 + 0.05 * fr);
    const nAI = leagueSize() - 1;
    for (let i = 0; i < nAI; i++) {
      const strength = (lo + (hi - lo) * ((i + 0.5) / nAI) + ease + climb + deep) * hard + fr;
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

  // every league team gets its own crest (never the player's) and colour, so standings never show look-alikes
  function assignBadges() {
    const A = G.ART; if (!A || !A.setBadges) return;
    const names = st.standings.filter(t => t.ai).map(t => t.name);
    const have = st.badges && names.every(n => st.badges[n]);
    if (!have) {
      const crests = D.CRESTS.filter(c => c !== st.team.crest), cols = A.BADGE.slice();
      const order = names.slice().sort((a, b) => A.hash(a) - A.hash(b)), off = A.hash(order.join('|'));
      st.badges = {};
      order.forEach((n, i) => { st.badges[n] = { crest: crests[(i + off) % crests.length], color: cols[(i + (off >> 3)) % cols.length] }; });
    }
    A.setBadges(st.badges);
  }
  function startSeason() {
    const d = div();
    const ai = aiTeams();
    st.standings = [{ ai: false, id: 'me', name: st.team.city + ' ' + st.team.name, abbr: st.team.abbr, w: 0, l: 0, otl: 0, gf: 0, ga: 0 }].concat(ai);
    st.badges = null; assignBadges();
    st.schedule = [];
    for (let i = 0; i < d.games; i++) st.schedule.push(ai[i % ai.length].id);
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
  // how a goal went in, shaped by who scored it (shown on the live pop-up)
  const GOAL_KINDS = {
    sniper: ['BAR DOWN!', 'TOP SHELF!', 'SNIPE!', 'ONE-TIMER!', 'PICKED THE CORNER!'],
    playmaker: ['BACKHAND!', 'WRAPAROUND!', 'WHAT A DEKE!', 'FIVE-HOLE!', 'SAUCER FINISH!'],
    power: ['TIP-IN!', 'REBOUND!', 'SLAPSHOT!', 'POWER MOVE!', 'CRASHED THE NET!'],
    twoway: ['WRISTER!', 'BREAKAWAY!', 'FIVE-HOLE!', 'OFF THE FORECHECK!'],
    enforcer: ['GARBAGE GOAL!', 'REBOUND!', 'TIP-IN!', 'OFF THE SKATE!'],
    ofd: ['FROM THE POINT!', 'SLAPSHOT!', 'ONE-TIMER!', 'PINCHED IN!'],
    dfd: ['FROM THE POINT!', 'SEEING-EYE SHOT!', 'SLAPSHOT!'],
    twd: ['FROM THE POINT!', 'WRISTER!', 'ONE-TIMER!']
  };
  function goalKind(id, tag, ot) {
    if (ot) return 'OT WINNER!';
    if (tag === 'gg') return 'GOALIE GOAL!';
    if (tag === 'sh') return 'SHORTY!';
    if (tag === 'pp' && M.rand() < 0.35) return 'POWER PLAY GOAL!';
    const p = id && byId(id), l = GOAL_KINDS[p && p.type] || GOAL_KINDS.twoway;
    return l[M.ri(0, l.length - 1)];
  }
  // the game as timed events: goals, penalties (two-minute power plays), pop-up highlights.
  // Power-play goals land inside their penalty; everything else is spread through the period.
  function timeline(res, A) {
    const ev = [], rt = per => per * 20 + 0.6 + M.rand() * 19;
    const pens = (res.pens || []).map(p => Object.assign({}, p, { t: p.per * 20 + 0.8 + M.rand() * 17, who: nameOf(p.pid) }));
    pens.forEach(p => { p.end = p.t + 2; });
    const inPen = p => p.t + 0.15 + M.rand() * 1.75;
    const mine = (res.a.list || []).slice();
    res.periods.forEach((p, i) => {
      const myPer = mine.filter(g => g.per === i);
      for (let k = 0; k < p.a; k++) {
        const g = myPer[k] || {}, pen = g.pen != null ? pens[g.pen] : null, t = g.tag === 'gg' ? 57.8 + M.rand() * 1.8 : pen ? inPen(pen) : rt(i);
        if (pen && !pen.sh) pen.end = t;
        ev.push({ t, s: 'a', sc: nameOf(g.sc), a1: nameOf(g.a1), a2: nameOf(g.a2), scId: g.sc, tag: g.tag || null, kind: goalKind(g.sc, g.tag) });
      }
      // opponent goals: first the ones scored on their power plays / short-handed, then the rest
      const theirs = pens.filter(x => x.per === i && x.g === 'b');
      for (let k = 0; k < p.b; k++) {
        const pen = theirs[k], t = pen ? inPen(pen) : rt(i);
        if (pen && !pen.sh) pen.end = t;
        ev.push({ t, s: 'b', tag: pen ? (pen.sh ? 'sh' : 'pp') : null });
      }
    });
    let total = 60;
    if (res.ot) {
      const s = res.a.goals > res.b.goals ? 'a' : 'b';
      const g = mine.find(x => x.per === 3) || {};
      if (res.so) { ev.push({ t: 65, s, so: true }); total = 65.2; }
      else { const t = 60.3 + M.rand() * 4.4; ev.push({ t, s, ot: true, sc: s === 'a' ? nameOf(g.sc) : null, a1: s === 'a' ? nameOf(g.a1) : null, scId: s === 'a' ? g.sc : null, kind: s === 'a' ? goalKind(g.sc, null, true) : null }); total = t + 0.05; }
    }
    ev.sort((x, y) => x.t - y.t);
    pens.sort((x, y) => x.t - y.t);
    return { ev, total, pens, hl: highlights(res, A, ev) };
  }
  // cartoon pop-ups during the live game: big hits by your skaters, big saves by your goalie.
  // They land away from goals so the GOAL! banner never collides with one.
  function highlights(res, A, ev) {
    const out = [], st0 = res.a.stats || {}, free = t => t > 1.5 && t < 59 && !ev.some(e => Math.abs(e.t - t) < 2.6) && !out.some(h => Math.abs(h.t - t) < 4.5);
    const hitters = Object.keys(st0).filter(id => st0[id].hits > 0 && byId(id));
    const nh = Math.min(hitters.length ? 3 : 0, M.ri(1, 3)), ns = res.a.saves > 0 && A && A.goalie ? Math.min(3, M.ri(1, 2) + (res.b.shots > 32 ? 1 : 0)) : 0;
    const place = (k, id) => { for (let i = 0; i < 30; i++) { const t = 1.5 + M.rand() * 57; if (free(t)) { out.push({ t, k, id }); return; } } };
    for (let i = 0; i < nh; i++) place('hit', hitters[M.weightedIndex(hitters.map(id => st0[id].hits * st0[id].hits))]);
    for (let i = 0; i < ns; i++) place('save', A.goalie.id);
    return out.sort((x, y) => x.t - y.t);
  }
  function rateMe(playoff) {
    const g0 = byId(st.team.lineup.goalies[0]), backup = g0 && (g0.tend || []).indexOf('workhorse') >= 0 ? 0.2 : 0.3;
    return S.ratePlayerTeam(st.team, { goalieIdx: !playoff && M.rand() < backup ? 1 : 0, style: st.coach.style, playoff: !!playoff });
  }

  function prepareGame() {
    if (!st || st.phase !== 'season' || st.gameIndex >= st.schedule.length) return null;
    const oppId = st.schedule[st.gameIndex];
    const opp = teamById(oppId);
    const A = rateMe(false);
    const res = S.simGame(A, S.rateAI(opp), divRef(), {});
    S.applyMinus(res.a.stats, A, res.b.goals - (res.b.ppg || 0));
    return { kind: 'season', idx: st.gameIndex, season: st.season, oppId, oppName: opp.name, oppAbbr: opp.abbr, A, res, tl: timeline(res, A) };
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
    if (res.a.gg === gp.id) goalieGoal(gp, true);

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
    if (seed >= poTeams()) {
      st.phase = 'missed';
      toast('Finished ' + ord(seed + 1) + ' — missed the playoffs', 'loss');
      endSeason(false);
      emit('missed', { seed: seed + 1 });
    } else {
      st.phase = 'playoffs';
      const seeds = table.slice(0, poTeams()).map(t => t.id);
      st.playoff = { round: 0, w: 0, l: 0, opp: null, log: [], seeds, alive: seeds.slice(), mySeed: seed + 1, pts: {}, gsv: {} };
      nextOpponent();
      toast('Playoffs! You are the ' + ord(seed + 1) + ' seed', 'promo');
      emit('playoffs', st.playoff);
    }
    save();
  }
  function aliveInSeedOrder() {
    const po = st.playoff;
    if (!po.seeds) { const n = poTeams(); po.seeds = sorted().slice(0, n).map(t => t.id); if (po.seeds.indexOf('me') < 0) po.seeds[n - 1] = 'me'; }
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
    S.applyMinus(res.a.stats, A, res.b.goals - (res.b.ppg || 0));
    return { kind: 'playoff', round: po.round, game: po.log.length, oppName: po.opp.name, oppAbbr: po.opp.abbr, A, res, tl: timeline(res, A) };
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
      if (po.round >= Math.log2(po.seeds.length) - 1) { champion(); out.champion = true; }
      else { resolveOtherSeries(); po.round++; nextOpponent(); offerPick('Round ' + po.round + ' won', 1 + po.round); }
    } else if (seriesDone) { endSeason(false); out.eliminated = true; }
    save();
    emit('playoffGame', out);
    return out;
  }
  // a goalie goal: counted on the season (regular season only) and career lines, and for the franchise achievement
  function goalieGoal(gp, season) {
    if (season) gp.season.g = (gp.season.g || 0) + 1;
    gp.career.g = (gp.career.g || 0) + 1;
    st.life = st.life || {}; st.life.gg = (st.life.gg || 0) + 1;
    toast('🥅 ' + gp.name + ' scores into the empty net! A goalie goal!', 'gold');
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
    if (res.a.gg === gp.id) goalieGoal(gp, false);
  }

  function champion() {
    st.totals.cups++;
    // franchise achievement checks: a world roster, or a one-country lineup
    st.life = st.life || {};
    if (new Set(st.team.roster.map(p => p.nat)).size >= 20) st.life.worldTitle = 1;
    const dressed = lineupIds().map(byId).filter(Boolean);
    if (dressed.length && dressed.every(p => p.nat === dressed[0].nat)) st.life.homeTitle = 1;
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
    6: { gear: [1, 'rare'], player: ['rare', 'S'] }, 5: { gear: [3, 'rare'], player: ['epic', 'G'] },
    4: { gear: [3, 'rare'], player: ['legendary', 'S'] }, 3: { gear: [2, 'epic'], player: ['legendary', 'S'] },
    2: { gear: [4, 'epic'], player: ['legendary', 'G'] }, 1: { gear: [1, 'legendary'], player: ['legendary', 'A'] }
  };
  function championshipRewards() {
    const c = CUP[tier()], got = [];
    let rarity = c.player[0];
    if (st.totals.cups === 1) rarity = D.RARITY[Math.max(D.RIDX[rarity], 2)].k;   // first title: at least a rare
    for (let n = 0; n < c.gear[0]; n++) { const g = M.makeGear(c.gear[1], M.rand() < 0.1 ? 'goalie' : 'skater'); st.gear.push(g); got.push(M.gearName(g)); }
    const round = Math.max(1, Math.min(5, Math.ceil(tier() / 1.6)));
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
    // voters reward winning: a team that missed the playoffs costs its players votes on the judged awards
    // (MVP, defense, two-way, goalie); pure stat titles (points, goals, assists, wins) are unchanged
    const seedNow = sorted().findIndex(t => t.id === 'me') + 1, missed = st.phase === 'missed';
    const teamF = missed ? 0.78 : seedNow <= 3 ? 1.05 : 1;
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
    p = top(sk, mvp); x = games * (1.05 + r() * 0.35) * f; decide(AWARDS[4], p, p ? mvp(p) * teamF : 0, x, p && p.season.p + ' pts, ' + Math.round(myPct * 100) + '% of points won', Math.round(x * 0.9) + ' pts');
    const dsc = q => q.season.p + 0.2 * q.season.blk + 0.3 * Math.max(0, q.season.pm) + M.eff(q, 'defense') * 0.15;
    p = top(dm, dsc); x = games * (0.7 + r() * 0.35) * f; decide(AWARDS[5], p, p ? dsc(p) * teamF : 0, x, p && p.season.p + ' pts, ' + p.season.blk + ' blocks', Math.round(x * 0.6) + ' pts');
    const gsc = q => (svp(q) - 0.88) * 1000 + q.season.w * 0.4;
    p = top(gs, gsc); const aiSv = 0.902 + r() * 0.02 + (f - 1) * 0.01; x = (aiSv - 0.88) * 1000 + games * 0.5 * 0.4;
    decide(AWARDS[6], p, p ? gsc(p) * teamF : 0, x, p && svp(p).toFixed(3).slice(1) + ' SV%', aiSv.toFixed(3).slice(1) + ' SV%');
    const tw = q => q.season.pm + 0.3 * q.season.blk + 0.1 * q.season.hits + 0.3 * q.season.p + M.eff(q, 'defense') * 0.2;
    p = top(fw, tw); x = games * (0.75 + r() * 0.3) * f; decide(AWARDS[7], p, p ? tw(p) * teamF : 0, x, p && (p.season.pm > 0 ? '+' : '') + p.season.pm + ', ' + p.season.p + ' pts', '+' + Math.round(games * 0.4) + ', ' + Math.round(x * 0.7) + ' pts');
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
    const mine = awards.filter(a => a.winner.mine).length;
    if (st.history[0].result === 'Missed playoffs' && mine >= 3) toast('Players win awards, teams win games: ' + mine + ' awards, but no playoffs. Your stars carried a thin roster. Look at depth, chemistry and defense.', 'loss');
    emit('card', { kind: 'awards', season: st.season, divName: div().n, list: awards, shards: pack, result: st.history[0].result, warn: st.history[0].result === 'Missed playoffs' && mine >= 3 ? mine : 0 });
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
  function promoCap() { return D.PROMO_CAP[tier()]; }
  function promoCost(p) { const next = D.RARITY[D.RIDX[p.rarity] + 1]; return next ? Math.round(next.shards * (p.pos === 'G' ? D.GOALIE_SHARD_MULT : 1)) : 0; }
  function canPromote(p) { return D.RIDX[p.rarity] < Math.min(4, promoCap() + (p.legacyB ? 1 : 0)); }
  function cheapestPromotion(pool) {
    const costs = st.team.roster.filter(p => poolOf(p) === pool && canPromote(p)).map(promoCost);
    return costs.length ? Math.min.apply(null, costs) : 0;
  }
  // sized so at least one promotion is always affordable at the end of a season, win or lose
  function shardPackage() {
    const i = tierIdx();
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
  // six breakthroughs of +3: the last one puts an Epic exactly on Legendary caps (base 78 + 18, capped at 95)
  const BREAK_MAX = 6, BREAK_STEP = 3;
  function canBreak(p) { return !!p && p.rarity === 'epic' && (p.capB || 0) < BREAK_MAX * BREAK_STEP; }
  function breakCost(p) { return Math.round((45 + 8 * (p.capB || 0)) * (p.pos === 'G' ? D.GOALIE_SHARD_MULT : 1)); }
  function breakthrough(playerId) {
    const p = byId(playerId);
    if (!canBreak(p)) return false;
    const pool = poolOf(p), cost = breakCost(p);
    if (st.shards[pool] < cost) return false;
    st.shards[pool] -= cost; p.capB = Math.min(BREAK_MAX * BREAK_STEP, (p.capB || 0) + BREAK_STEP);
    toast(p.name + ': breakthrough ' + p.capB / BREAK_STEP + '/' + BREAK_MAX + '. Caps raised' + (p.capB >= BREAK_MAX * BREAK_STEP ? ' to Legendary level.' : '.'), 'promo');
    save(); emit('roster'); return true;
  }
  // the $0.99 Legend upgrade: one Epic player you love becomes Legendary (demo build: no real charge)
  // Legend upgrade: spend Legend tokens (sold 5 for $0.99 in the demo; one also comes from each weekly tap goal)
  const LEGEND_COST = 1;
  function buyTokens() { st.legendTokens = (st.legendTokens || 0) + 5; toast('+5 Legend tokens', 'gold'); save(); return true; }
  function buyLegend(playerId) {
    const p = byId(playerId);
    if (!p || p.rarity !== 'epic' || (st.legendTokens || 0) < LEGEND_COST) return false;
    st.legendTokens -= LEGEND_COST;
    p.rarity = 'legendary'; st.legendBuys = (st.legendBuys || 0) + 1;
    toast(p.name + ' is now Legendary. His strengths can reach 99 (weaker skills a little lower, by type) and he can now wear a trait.', 'gold');
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
    const i = tierIdx();
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
    const sp = Math.round((10 + tier * 14) * (1 + tierIdx() * 0.15));
    const pos = theme && theme.pool ? theme.pool : M.pick(['F', 'F', 'F', 'F', 'D', 'D', 'D', 'G']);
    opts.push({ t: 'shards', label: sp + ' shards', pos, n: sp });
    const roll = M.rand();
    // traits are Hall of Fame only now (franchise achievements), so picks never offer one
    if (roll < 0.15) opts.push({ t: 'scout', label: 'Rescout token', n: 1 + (tier >= 3 ? 1 : 0) });
    else if (roll < 0.5) { const b = M.pick(D.BOOSTS); opts.push({ t: 'boost', label: b.n, k: b.k, n: 1 + (tier >= 3 ? 1 : 0) }); }
    else { // worth taking: about 12 minutes of passive income plus 600 taps, more for bigger rewards
      const pk = Math.round(Math.max(900 * payout() * (1 + tier), (passiveRate() * 60 * 12 + clickValue() * 600) * (1 + 0.7 * tier))); opts.push({ t: 'pucks', label: fmt(pk) + ' pucks', n: pk }); }
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
      else if (o.t === 'scout') st.faTokens = (st.faTokens || 0) + o.n;
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
    toast('Fused 5 ' + rk + ' spares into ' + M.gearName(g), 'promo');
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
  // gear tuning: the late-game puck sink. +1 to the piece's main stat per step, up to +3, priced in minutes of
  // passive income so it stays meaningful however rich the club gets
  const TUNE_MAX = 3;
  function levelGear(gearId) {
    const g = findGear(gearId);
    if (!g || (g.tune || 0) >= TUNE_MAX) return false;
    const cost = gearLevelCost(g);
    if (st.pucks < cost) return false;
    st.pucks -= cost; g.tune = (g.tune || 0) + 1; g.p += 1;
    st.team.roster.forEach(checkGold);
    save(); emit('roster'); return true;
  }
  function gearLevelCost(g) { const t = g.tune || 0, ri = D.RIDX[g.rarity]; return Math.round(Math.max(400 * Math.pow(1.6, ri) * Math.pow(1.6, t) * payout(), passiveRate() * 60 * (6 + 8 * t) * (1 + 0.25 * ri))); }
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
    1: [0, 15, 50, 28, 7], 2: [5, 35, 45, 13, 2], 3: [15, 45, 32, 8, 0], 4: [35, 48, 16, 1, 0],
    5: [58, 36, 6, 0, 0], 6: [80, 19, 1, 0, 0], 7: [100, 0, 0, 0, 0]
  };
  // drafted and signed players may sit one tier above what the division lets you promote to
  // legendary free agents only show up from Division 7 (tier 4)
  function maxRarity() { return tier() <= 4 ? 4 : 3; }
  // each division climbed moves a quarter of every tier up one, so late-round picks stay relevant
  // Legendary odds are set by round and division only: a 1st-rounder always has a shot (1% in Division 15, 20% in Division 1)
  const LEG_ODDS = { 1: [1, 20], 2: [0, 8], 3: [0, 3] };
  function pickOdds(round) {
    const o = ROUND_ODDS[round].slice();
    // late rounds climb with the division more slowly than early ones
    const lift = round >= 4 ? 0.22 : 0.35;
    for (let s = 0; s < 8 - tier(); s++) for (let i = 2; i >= 0; i--) { const m = o[i] * lift; o[i] -= m; o[i + 1] += m; }
    const t = (15 - st.div) / 14, L = LEG_ODDS[round];
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
  const ROUND_EDGE = { 1: 4, 2: 2, 3: 0, 4: -3, 5: -6, 6: -9, 7: -12 };
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
  // ---------------------------------------------------------------- draft boards
  // A pick opens a board of five prospects; you choose one. Country and position are always known; better
  // scouting (the Scouting Dept) reveals type, then rarity, then an Overall range that narrows to the exact number.
  function scoutInfo() {
    const L = facLvl('scout');
    return { lvl: L, type: L >= 1, rarity: L >= 3, range: L >= 11 ? 0 : L >= 8 ? 4 : L >= 5 ? 8 : null };
  }
  function prospect(round, used) {
    const odds = pickOdds(round), ri = M.weightedIndex(odds);
    const pos = M.rand() < 0.4 ? needPos() : M.pick(['LW', 'C', 'RW', 'LW', 'C', 'RW', 'D', 'D', 'D', 'G']);
    const p = M.makePlayer(pos, D.RARITY[ri].k, draftTarget(ri, round), null, { avoid: used });
    p.est = M.overall(p) + M.ri(-3, 3);   // the scouts' read, centre of the shown range
    return p;
  }
  function openBoard(round) {
    if (st.board) return st.board;
    if (!st.picks || !st.picks[round]) return null;
    st.picks[round]--;
    const used = nameSet(), list = [];
    for (let i = 0; i < 5; i++) list.push(prospect(round, used));
    st.board = { round, list, rescouted: false };
    save(); emit('roster'); return st.board;
  }
  function rescoutBoard() {
    const b = st.board; if (!b || b.rescouted) return null;
    const used = nameSet(); b.list = []; for (let i = 0; i < 5; i++) b.list.push(prospect(b.round, used));
    b.rescouted = true; save(); return b;
  }
  // the pick the scouts would make with what they can see: exact or estimated Overall, else rarity, else the team's need
  function scoutPick(b) {
    const si = scoutInfo(), need = needPos();
    const score = p => si.range != null ? p.est : si.rarity ? D.RIDX[p.rarity] * 10 + (p.pos === need ? 1 : 0) : (p.pos === need ? 1 : 0) + M.rand() * 0.5;
    let best = 0; b.list.forEach((p, i) => { if (score(p) > score(b.list[best])) best = i; });
    return best;
  }
  function chooseBoard(i) {
    const b = st.board; if (!b || !b.list[i]) return null;
    const p = b.list[i], round = b.round, odds = pickOdds(round);
    delete p.est;
    p.num = freeNumber(); p.how = 'Drafted · ' + ord(round) + ' round, season ' + st.season; p.acq = st.season;
    st.team.roster.push(p); st.board = null;
    // luck is judged on Overall against 200 possible picks from this round
    const ovr = M.overall(p); let atLeast = 0;
    for (let k = 0; k < 200; k++) { const r2 = M.weightedIndex(odds), qo = M.overall(M.makePlayer(p.pos, D.RARITY[r2].k, draftTarget(r2, round), null, {})); if (qo > ovr) atLeast++; else if (qo === ovr) atLeast += 0.5; }
    save(); emit('roster');
    return { p, round, odds, ri: D.RIDX[p.rarity], topPct: Math.max(0.5, Math.round(1000 * atLeast / 200) / 10), rescouted: true };
  }
  function autoDraft(round) { if (st.board ? false : !openBoard(round)) return null; return chooseBoard(scoutPick(st.board)); }
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
  // ---------------------------------------------------------------- trade-in
  // Pick any bench players and one kind of reward. Each player is worth points by rarity, scaled by how good he is
  // for this division; the reward is bought with those points. Picks are priced by their real draft odds here,
  // so a trade never hands back more than it takes.
  const RV = [1, 2.5, 6, 15, 40];
  function tradeValue(p) { return RV[D.RIDX[p.rarity]] * (0.6 + 0.4 * M.clamp(M.trainedOverall(p) / Math.max(10, div().hi), 0.3, 1.6)); }
  // a pick is worth what it will produce: rarity odds times the trade value of a player at the expected draft rating
  // for this team (so draft-then-trade-back can never make value out of nothing)
  function pickValue(round) {
    const o = pickOdds(round), d = div(), exp = Math.min(d.hi + (round <= 2 ? 3 : 0), Math.max(d.lo, teamOvr()) + ROUND_EDGE[round] + 2);
    const f = 0.6 + 0.4 * M.clamp(exp / Math.max(10, d.hi), 0.3, 1.6);
    // choosing the best of a five-player board lifts what a pick produces by roughly 40-90% (more in late rounds)
    return o.reduce((s, x, i) => s + x / 100 * RV[i], 0) * f * 1.15 * (1.45 + 0.07 * (round - 1));
  }
  function tradeQuote(ids, kind) {
    const ps = ids.map(byId).filter(p => p && tradeable(p) && bench().indexOf(p) >= 0);
    const P = ps.reduce((s, p) => s + tradeValue(p), 0), out = { P, n: ps.length, kind, items: [], text: '' };
    if (!ps.length) return out;
    if (kind === 'picks') {
      let left = P * 0.85;
      for (let k = 0; k < 6; k++) {
        let r = 0; for (let x = 1; x <= 7; x++) if (pickValue(x) <= left) { r = x; break; }
        if (!r) break;
        out.items.push(r); left -= pickValue(r);
      }
      const c = {}; out.items.forEach(r => { c[r] = (c[r] || 0) + 1; });
      out.text = Object.keys(c).sort().map(r => (c[r] > 1 ? c[r] + ' ' : 'a ') + ord(+r) + '-round pick' + (c[r] > 1 ? 's' : '')).join(', ');
    } else if (kind === 'gear') {
      const v = P * 0.8; let ri = 0; for (let i = 4; i >= 0; i--) if (RV[i] <= v) { ri = i; break; }
      const n = Math.max(1, Math.min(5, Math.floor(v / RV[ri])));
      out.items = Array(n).fill(D.RARITY[ri].k);
      out.text = n + ' ' + D.RARITY[ri].n.toLowerCase() + ' gear piece' + (n > 1 ? 's' : '');
    } else if (kind === 'shards') {
      const n = Math.max(1, Math.round(P * 9 * (1 + tierIdx() * 0.15))), w = { F: 0, D: 0, G: 0 };
      ps.forEach(p => { w[poolOf(p)] += tradeValue(p); });
      out.items = ['F', 'D', 'G'].map(k => [k, Math.round(n * w[k] / P)]).filter(x => x[1] > 0);
      out.text = out.items.map(([k, x]) => x + ' ' + k + ' shards').join(', ');
    } else {
      const n = Math.round(P * (passiveRate() * 60 * 2 + 400 * payout()));
      out.items = [n]; out.text = fmt(n) + ' pucks';
    }
    return out;
  }
  function tradeIn(ids, kind) {
    const q = tradeQuote(ids, kind); if (!q.n || !q.items.length) return null;
    const ps = ids.map(byId).filter(p => p && tradeable(p) && bench().indexOf(p) >= 0);
    ps.forEach(stripToLocker);
    st.team.roster = st.team.roster.filter(p => ps.indexOf(p) < 0);
    if (kind === 'picks') q.items.forEach(r => addPick(r));
    else if (kind === 'gear') q.items.forEach(rk => st.gear.push(smartGear(rk)));
    else if (kind === 'shards') q.items.forEach(([k, x]) => { st.shards[k] += x; });
    else st.pucks += q.items[0];
    toast('Traded ' + ps.length + ' player' + (ps.length > 1 ? 's' : '') + ' for ' + q.text + '. Their gear and traits went to your locker.', 'promo');
    save(); emit('roster'); return q;
  }
  function combinePicks(round) {
    if (round <= 1 || !st.picks || (st.picks[round] || 0) < 2) return false;
    st.picks[round] -= 2; addPick(round - 1);
    toast('Two ' + ord(round) + '-rounders became a ' + ord(round - 1) + '-round pick', 'promo');
    save(); return true;
  }
  const FA_MIN = [8, 16, 30, 60, 60];   // minutes of passive income per rarity
  const FA_TAPS = [800, 2000, 4500, 10000, 10000];   // taps at a full 5x combo per rarity
  // what the team seems to want: the weakest starter's position, a player who fixes a unit's bad fit
  // (two of one type, two OFDs or DFDs), and the country most of the lineup comes from
  // the position group that is weakest on average over the top three lines, top three pairs and the starter
  // (not just the single weakest player, who might sit on an otherwise strong wing)
  function thinnestPos() {
    const L = st.team.lineup, g = { LW: [], C: [], RW: [], D: [], G: [] };
    L.lines.slice(0, 3).forEach(l => l.forEach((id, j) => { const p = byId(id); if (p) g[['LW', 'C', 'RW'][j]].push(M.overall(p)); }));
    L.pairs.forEach(pr => pr.forEach(id => { const p = byId(id); if (p) g.D.push(M.overall(p)); }));
    const gp = byId(L.goalies[0]); if (gp) g.G.push(M.overall(gp));
    let best = 'C', low = Infinity;
    Object.keys(g).forEach(k => { if (!g[k].length) return; const a = g[k].reduce((s, x) => s + x, 0) / g[k].length; if (a < low) { low = a; best = k; } });
    return best;
  }
  function faTargets() {
    const L = st.team.lineup, out = [], FT = ['sniper', 'playmaker', 'power', 'twoway', 'enforcer'];
    const tp = thinnestPos(); out.push({ pos: tp, why: 'Depth at ' + tp + ', your thinnest position' });
    L.lines.forEach((ids, i) => {
      const ps = ids.map(byId).filter(Boolean), types = ps.map(p => p.type);
      if (types.length === 3 && new Set(types).size < 3) {
        const dupe = types.find((t, j) => types.indexOf(t) !== j), slot = types.lastIndexOf(dupe), free = FT.filter(t => types.indexOf(t) < 0);
        const nats = ps.map(p => p.nat), nat = nats.find((x, j) => nats.indexOf(x) !== j) || null;
        out.push({ pos: ['LW', 'C', 'RW'][slot], type: M.pick(free), nat, why: 'Mixes up Line ' + (i + 1) + (nat ? ' and keeps it ' + M.nationOf({ nat }).n : '') });
      }
    });
    L.pairs.forEach((ids, i) => {
      const ps = ids.map(byId).filter(Boolean), s = ps.map(p => p.type).sort().join('+');
      const want = s === 'ofd+ofd' ? 'dfd' : s === 'dfd+dfd' ? 'ofd' : s === 'dfd+twd' ? 'ofd' : s === 'ofd+twd' ? 'dfd' : null;
      if (want) out.push({ pos: 'D', type: want, nat: ps[0] && ps[1] && ps[0].nat === ps[1].nat ? ps[0].nat : null, why: 'Balances Pair ' + (i + 1) });
    });
    const cnt = {}, ls = lineupIds().map(byId).filter(Boolean);
    ls.forEach(p => { cnt[p.nat] = (cnt[p.nat] || 0) + 1; });
    const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    if (top && cnt[top] >= ls.length * 0.35) out.push({ pos: M.rand() < 0.5 ? needPos() : M.pick(['LW', 'C', 'RW', 'D']), nat: top, why: 'Fits your ' + M.nationOf({ nat: top }).n + ' core' });
    return out;
  }
  function refreshAgents(force) {
    if (!force && st.fa && st.fa.length && Date.now() - (st.faAt || 0) < 4 * 3600e3) return;
    const i = tierIdx();
    const w = [[55, 38, 7, 0, 0], [45, 42, 13, 0, 0], [30, 45, 22, 3, 0], [20, 45, 30, 5, 0], [12, 40, 38, 10, 0], [6, 30, 44, 18, 2], [3, 22, 45, 26, 4], [2, 15, 42, 33, 8]][i];
    // free agents fill out a lineup: never Legendary, rarely Epic, and rated a few points under your lineup
    const avoid = nameSet();
    st.fa = [];
    const ls = lineupIds().map(byId).filter(Boolean), avgL = ls.reduce((s, q) => s + M.overall(q), 0) / Math.max(1, ls.length);
    const avgT = ls.reduce((s, q) => s + M.trainedOverall(q), 0) / Math.max(1, ls.length), d = div();
    const tgs = [], seen = {};
    const pool = faTargets().sort(() => M.rand() - 0.5).concat([
      { pos: 'G', why: 'A backup goalie to share the load' },
      { pos: M.pick(['LW', 'C', 'RW']), why: 'Forward depth for injuries and line changes' },
      { pos: 'D', why: 'Depth on the blue line' }
    ]);
    pool.forEach(t => { const key = t.why.replace(/Line d|Pair d/, 'unit'); if (tgs.length < 3 && !seen[key] && !seen[t.pos + t.why]) { seen[key] = 1; seen[t.pos + t.why] = 1; tgs.push(t); } });
    for (let n = 0; n < 3; n++) {
      const ri = Math.min(3, M.weightedIndex(w.slice(0, 3).concat([w[3] * 0.4])));
      // each of the three is scouted for a different reason: a thin position, a chemistry fix, your country core, depth
      const tg = tgs[n] || null;
      const pos = tg ? tg.pos : M.pick(['LW', 'C', 'RW', 'D', 'D', 'G']);
      const target = M.clamp(Math.round(avgT - M.ri(3, 8) + ri), Math.max(3, d.lo - 4), d.hi);
      const p = M.makePlayer(pos, D.RARITY[ri].k, Math.min(D.RARITY[ri].cap - 2, target), tg ? tg.nat : null, { avoid, type: tg ? tg.type : undefined });
      // priced in minutes of your own passive income (so they never go cheap as the team grows), plus a premium
      // for anyone better than your current lineup average
      const over = Math.max(0, M.overall(p) - avgL), base = (350 * Math.pow(2.3, ri) + M.overall(p) * 25) * payout();
      // and never cheap: the higher of passive minutes and a long session of 5x-combo tapping
      const cost = Math.max((base + passiveRate() * 60 * FA_MIN[ri]) * (1 + 0.06 * over), clickValue() * 5 * FA_TAPS[ri]);
      st.fa.push({ p, cost: Math.round(cost), sold: false, why: tg ? tg.why : null });
    }
    st.faAt = Date.now();
  }
  // free agent rescout: one ad refresh every 30 minutes, or a rescout token (earned from rewards) any time
  const FA_AD_MS = 30 * 60e3;
  function faRescoutLeft() { return Math.max(0, FA_AD_MS - (Date.now() - (st.faAdAt || 0))); }
  function faRescout(how) {
    if (how === 'token') { if (!(st.faTokens > 0)) return false; st.faTokens--; }
    else { if (faRescoutLeft() > 0) return false; st.faAdAt = Date.now(); }
    refreshAgents(true); toast('New free agents are in.', 'sign'); save(); return true;
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
  function keepLimit() { return (st.prestige || 0) + 1; }
  // only in the offseason right after winning the Division 1 championship
  function canPrestige() { const h = st && st.history[0]; return !!h && st.phase === 'offseason' && h.result === 'Champion' && h.div === 1 && (h.fr || 1) === franchiseNo(); }
  // a Legacy player: Legendary caps, +2 to every attribute per franchise, but starting just above
  // the team he joins (about 5 Overall over its average, Legacy bonus included)
  function makeLegacy(p, teamAvg, how) {
    Object.keys(p.gear).forEach(k => { p.gear[k] = null; });
    p.xf = p.xf2 = null; p.capB = 0; p.locked = false;
    p.rarity = 'legendary';
    p.legacyB = (p.legacyB || 0) + 2;
    const target = Math.max(5, Math.round(teamAvg + 5 - p.legacyB));
    for (let i = 0; i < 6; i++) {
      const f = target / Math.max(1, M.trainedOverall(p));
      Object.keys(p.a).forEach(k => { p.a[k] = Math.max(1, Math.min(M.attrCap(p, k), Math.round(p.a[k] * f))); });
    }
    p.how = how; p.acq = null;
  }
  // franchise history: bring a retired player back ($0.99 in the demo) as a Legacy player, onto the bench
  function bringBack(id) {
    const i = (st.alumni || []).findIndex(p => p.id === id); if (i < 0) return false;
    const p = st.alumni.splice(i, 1)[0], ls = lineupIds().map(byId).filter(Boolean);
    const avg = ls.reduce((s, q) => s + M.trainedOverall(q), 0) / Math.max(1, ls.length);
    makeLegacy(p, avg, 'Legacy player · brought back from Franchise ' + (p.fr || 1));
    if (st.team.roster.some(q => q.num === p.num)) p.num = freeNumber();
    p.season = M.blankLine(p.pos === 'G'); p.startOvr = M.overall(p);
    delete p.fr; delete p.peak;
    st.team.roster.push(p); st.backBuys = (st.backBuys || 0) + 1;
    toast(p.name + ' is back as a Legacy player (' + M.overall(p) + ' ovr). He is on your bench.', 'gold');
    save(); emit('roster'); return true;
  }
  function prestige(keepIds) {
    if (!canPrestige()) return false;
    const keep = (keepIds || []).slice(0, keepLimit()).map(byId).filter(Boolean);
    // Hall of Fame gear is forever: collect it from the locker and every player before the reset
    const hof = st.gear.filter(g => g.hof);
    st.team.roster.forEach(p => Object.keys(p.gear).forEach(k => { if (p.gear[k] && p.gear[k].hof) hof.push(p.gear[k]); }));
    // traits are Hall of Fame rewards too: take them off every player and keep them in the locker
    const traits = (st.xfs || []).slice();
    st.team.roster.forEach(p => { if (p.xf) traits.push(p.xf); if (p.xf2) traits.push(p.xf2); });
    st.prestige = (st.prestige || 0) + 1;
    // Legacy players come back Legendary (full caps to grow into) but start just above the new roster:
    // about 5 Overall over the fresh team's average, Legacy bonus included
    const fresh = M.makeRoster(10, 'common');
    const freshAvg = fresh.reduce((s, p) => s + M.trainedOverall(p), 0) / fresh.length;
    keep.forEach(p => makeLegacy(p, freshAvg, 'Legacy player · carried into Franchise ' + (st.prestige + 1)));
    // everyone else retires into the franchise history, where they can be brought back later
    st.alumni = st.alumni || [];
    st.team.roster.filter(p => keep.indexOf(p) < 0).forEach(p => {
      Object.keys(p.gear).forEach(k => { p.gear[k] = null; }); p.xf = p.xf2 = null; p.locked = false;
      p.fr = st.prestige; p.peak = Math.max(p.peak || 0, M.overall(p));
      st.alumni.push(p);
    });
    keep.forEach(k => { const i = fresh.findIndex(p => p.pos === k.pos && !p.kept); if (i >= 0) fresh.splice(i, 1); });
    const used = {}; keep.forEach(k => { used[k.num] = 1; });
    fresh.forEach(p => { if (used[p.num]) { let n = 1; while (used[n]) n++; p.num = n; } used[p.num] = 1; });
    st.team.roster = keep.concat(fresh);
    st.team.lineup = M.defaultLineup(st.team.roster);
    st.div = 15; st.promos = 0; st.eliteSeasons = 0;
    st.pucks = 0; st.tape = 0; st.shards = { F: 0, D: 0, G: 0 }; st.gear = hof; st.picks = {}; st.xfs = traits;
    st.fac = {}; applyFac(); st.pending = null; st.pickQueue = [];
    // everything scouted, stocked or earned for the old league goes too: free agents, the gear shop, an open draft board,
    // rescout tokens and the ad timer, boosts on the shelf and running, the seen-picks counter
    st.fa = []; st.faAt = 0; st.faAdAt = 0; st.faTokens = 0; st.shop = []; st.shopAt = 0; st.board = null;
    st.boosts = {}; st.active = []; st.picksSeen = 0; st.streak = 0;
    // a new franchise starts clean: coach skills, achievements and the Elite-title requirement all reset;
    // lifetime totals are kept for the franchise achievements
    st.coach.bench = 0; st.coach.skills = 0; st.coach.video = 0;
    st.life = st.life || {}; Object.keys(st.totals).forEach(k => { st.life[k] = (st.life[k] || 0) + (st.totals[k] || 0); st.totals[k] = 0; });
    st.life.elite = (st.life.elite || 0) + (st.eliteTitles || 0); st.eliteTitles = 0;
    st.life.legacy = (st.life.legacy || 0) + keep.length;
    st.ach = {}; st.achClaim = []; st.season = 1;
    st.daily = { day: 1, claimed: 0, last: null, ready: true }; st.tapDay = null; st.tapNext = 0;
    // a head start that grows each franchise: 1st-round picks and shards
    addPick(1, Math.min(5, st.prestige)); ['F', 'D', 'G'].forEach(k => { st.shards[k] += 60 * st.prestige; });
    startSeason();
    toast('Franchise ' + (st.prestige + 1) + ' begins! Back to the Rec League with ' + keep.length + ' Legacy player' + (keep.length === 1 ? '' : 's') + ' and +' + (st.prestige * 10) + '% income, plus ' + Math.min(5, st.prestige) + ' 1st-round pick' + (Math.min(5, st.prestige) > 1 ? 's' : '') + ' and ' + (60 * st.prestige) + ' of each shard. The league is ' + Math.round((Math.min(1.35, 1 + 0.05 * st.prestige) - 1) * 100) + '% tougher.', 'gold');
    save(); emit('roster'); emit('newSeason', {});
    return true;
  }
  // ---------------------------------------------------------------- franchise achievements (never reset)
  // Franchise Builder pays out every new franchise; the others are long career and tapping goals.
  // Each claim lets you pick one reward: a Hall of Fame gear piece or a trait.
  const FACH = [
    { k: 'franchises', n: 'Franchise Builder', d: 'Start a new franchise (pays every time)', repeat: true },
    { k: 'points', n: 'Franchise Icon', d: 'One player reaches career points', tiers: [2500, 5000, 10000] },
    { k: 'games', n: 'Iron Man', d: 'One player reaches career games played', tiers: [1000, 2000, 4000] },
    { k: 'combo', n: 'Golden Touch', d: 'Reach a tap combo', tiers: [10000, 25000] },
    { k: 'taps', n: 'Iron Fingers', d: 'Total taps, every franchise', tiers: [250000, 1000000, 5000000] },
    { k: 'twins', n: 'Winning Culture', d: 'Team wins, every franchise', tiers: [1000, 2500, 5000] },
    { k: 'euro', n: 'European Star', d: 'A European player reaches career points', tiers: [2500] },
    { k: 'world', n: 'United Nations', d: 'Win a title with players from 20 countries on the roster', tiers: [1] },
    { k: 'home', n: 'Homegrown', d: 'Win a title with every dressed player from one country', tiers: [1] },
    { k: 'line', n: 'Lifers', d: 'A line plays games together', tiers: [2000] },
    { k: 'gg', n: 'Goalie Goal', d: 'One of your goalies scores a goal', tiers: [1] }
  ];
  const EURO = ['SE', 'RU', 'FI', 'CZ', 'CH', 'SK', 'DE', 'DK', 'LV', 'AT', 'NO', 'SI', 'FR', 'BY', 'UA', 'LT', 'PL', 'IT', 'GB', 'NL', 'HR', 'EE', 'HU', 'RO', 'RS', 'IS', 'ES', 'BE', 'IE'];
  function careerBest() {
    const life = st.life = st.life || {};
    st.team.roster.forEach(p => {
      if (p.pos !== 'G') life.maxPts = Math.max(life.maxPts || 0, p.career.p || 0);
      if (p.pos !== 'G' && EURO.indexOf(p.nat) >= 0) life.maxEuroPts = Math.max(life.maxEuroPts || 0, p.career.p || 0);
      life.maxGp = Math.max(life.maxGp || 0, p.career.gp || 0);
    });
    st.team.lineup.lines.forEach(ids => { life.maxLineGp = Math.max(life.maxLineGp || 0, Math.round(M.avgGames(ids, st.team.chem || {}))); });
    return life;
  }
  function fachValue(k) {
    if (k === 'franchises') return st.prestige || 0;
    const life = careerBest();
    if (k === 'points') return life.maxPts || 0;
    if (k === 'games') return life.maxGp || 0;
    if (k === 'combo') return st.bestCombo || 0;
    if (k === 'taps') return st.tapsAll || 0;
    if (k === 'euro') return life.maxEuroPts || 0;
    if (k === 'world') return life.worldTitle || 0;
    if (k === 'home') return life.homeTitle || 0;
    if (k === 'line') return life.maxLineGp || 0;
    if (k === 'gg') return life.gg || 0;
    if (k === 'twins') return ((st.life && st.life.wins) || 0) + (st.totals.wins || 0);
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
    // gear and promotions show on the Team page itself (Auto-equip button, player tiles), not on the tab
    out.gear = gearUp;
    // per player, three separate markers: a better piece of gear in the locker, an attribute you can afford
    // to train, a promotion or breakthrough you can afford
    out.promo = {}; out.gearP = {}; out.train = {};
    const bestBy = {};
    st.gear.forEach(g => { const k = g.kind + '|' + g.slot; bestBy[k] = Math.max(bestBy[k] == null ? -1 : bestBy[k], M.gearValue(g)); });
    st.team.roster.forEach(p => {
      if ((canPromote(p) && st.shards[poolOf(p)] >= promoCost(p)) || (canBreak(p) && st.shards[poolOf(p)] >= breakCost(p))) out.promo[p.id] = 1;
      const kind = p.pos === 'G' ? 'goalie' : 'skater';
      if (D.GEAR_SLOTS[kind].some(s => { const b = bestBy[kind + '|' + s.k]; return b != null && (!p.gear[s.k] || b > M.gearValue(p.gear[s.k])); })) out.gearP[p.id] = 1;
      if (Object.keys(p.a).some(k => p.a[k] < M.attrCap(p, k) && M.upgradeCost(p.a[k]) <= st.pucks)) out.train[p.id] = 1;
    });
    // the Store dot shows only for picks you have not seen yet, so a stockpile kept for trade-ups stays quiet
    const pc = pickCount(); if ((st.picksSeen || 0) > pc) st.picksSeen = pc;
    out.store = pc > (st.picksSeen || 0) ? pc - (st.picksSeen || 0) : 0;
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
  const TAP_DROP_EVERY = 500, TAP_DROPS = ['gear', 'pick', 'shards', 'scout'];   // no pucks: tapping already pays pucks
  // weekly practice goal: 15,000 taps Monday to Sunday pays a 2nd-round pick, shards and a piece of gear
  const WEEK_GOAL = 15000;
  function weekKey() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toDateString(); }
  function tapWeek() { const k = weekKey(); if (!st.tapWeek || st.tapWeek.k !== k) st.tapWeek = { k, n: 0, done: false }; return st.tapWeek; }
  function weekTap() {
    st.tapsAll = (st.tapsAll || 0) + 1;
    const w = tapWeek(); w.n++;
    if (!w.done && w.n >= WEEK_GOAL) {
      w.done = true; addPick(2); st.legendTokens = (st.legendTokens || 0) + 1;
      const s = 30 + tierIdx() * 10; st.shards.F += s; st.shards.D += s; st.shards.G += Math.round(s / 2);
      const ri = Math.min(4, Math.max(2, D.PROMO_CAP[tier()] + 1)), g = smartGear(D.RARITY[ri].k); st.gear.push(g);
      toast('Weekly goal: ' + fmt(WEEK_GOAL) + ' taps! A Legend token, a 2nd-round pick, ' + s + ' F and D shards, ' + Math.round(s / 2) + ' G shards and ' + M.gearName(g), 'gold');
      save();
    }
  }
  function countTap(n) {
    if (!st) return;
    const t = tapDay();
    for (let i = 0; i < (n || 1); i++) {
      t.n++;
      weekTap();
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
    if (kind === 'gear') { const i = tierIdx(); const g = smartGear(D.RARITY[Math.min(4, M.weightedIndex(DROP_W[i]))].k); st.gear.push(g); msg = M.gearName(g); }
    else if (kind === 'pucks') { const pk = Math.round(clickValue() * 150); st.pucks += pk; msg = fmt(pk) + ' pucks'; }
    else if (kind === 'pick') { const r = M.rand() < 0.5 ? 6 : 7; addPick(r); msg = 'a ' + ord(r) + '-round pick'; }
    else if (kind === 'scout') { st.faTokens = (st.faTokens || 0) + 1; msg = 'a free agent rescout token'; }
    else { const s = 6 + tierIdx() * 2; st.shards.F += s; st.shards.D += Math.round(s / 2); msg = s + ' F and ' + Math.round(s / 2) + ' D shards'; }
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
    { n: 'Jackpot', d: 'A 1st-round pick, 40 shards of each kind and a piece of gear' }
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
    return { pick: 1, shards: { F: 40, D: 40, G: 40 }, gear: true };
  }
  function claimDaily() {
    const d = dailyState();
    if (!d.ready) return null;
    const r = dailyReward(d.day), got = [];
    if (r.pucks) { st.pucks += r.pucks; got.push(fmt(r.pucks) + ' pucks'); }
    if (r.shards) Object.keys(r.shards).forEach(k => { st.shards[k] += r.shards[k]; got.push(r.shards[k] + ' ' + k + ' shards'); });
    if (r.tape) { st.tape += r.tape; got.push(r.tape + ' tape'); }
    if (r.boost) { st.boosts[r.boost] = (st.boosts[r.boost] || 0) + 1; got.push(D.BOOSTS.find(b => b.k === r.boost).n + ' boost'); }
    if (r.gear) { const ri = Math.min(4, Math.max(2, D.PROMO_CAP[tier()])); const g = smartGear(D.RARITY[ri].k); st.gear.push(g); got.push(M.gearName(g)); }
    if (r.pick) { addPick(r.pick); got.push('a ' + ord(r.pick) + '-round pick'); }
    d.ready = false; d.claimed = d.day; d.last = new Date().toDateString();
    toast('Day ' + d.day + ': ' + got.join(', '), 'promo');
    save(); emit('roster');
    return got;
  }
  function applySpeed() {
    const T = D.TUNING;
    if (st && st.demo) { T.gameIntervalSec = 8; T.playoffGameSec = 12; } else { T.gameIntervalSec = 20; T.playoffGameSec = 24; }
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
      // breakthroughs went from 11 x +2 to 6 x +3: round old progress up to the new steps
      st.team.roster.forEach(p => { if (p.capB) p.capB = Math.min(BREAK_MAX * BREAK_STEP, Math.ceil(p.capB / BREAK_STEP) * BREAK_STEP); });
      if (st.team.pattern === 'sash' || st.team.pattern === 'barber') st.team.pattern = 'double';   // retired patterns
      st.boosts = st.boosts || {}; st.active = st.active || []; st.achClaim = st.achClaim || [];
      if (st.pending && st.pending.kind === 'pick' && st.pending.options.some(o => !o.g && o.n == null && !o.xf && !o.k)) st.pending = buildPick(st.pending.title, st.pending.tier || 1);
      if (st.phase === 'missed') endSeason(false);
      if (st.tokens != null) { if (st.tokens > 0) addPick(6, st.tokens); delete st.tokens; }
      st.picks = st.picks || {}; st.fac = st.fac || {}; applyFac();
      if (st.standings) assignBadges();
      // the league went from 8 divisions to 15: old division d becomes 2d - 1 (Rec League stays the bottom, Elite the top)
      if (!st.div15) { st.div = 2 * st.div - 1; st.div15 = true; (st.history || []).forEach(h => { if (h.div && !h.d15) { h.div = 2 * h.div - 1; h.d15 = true; } }); }
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
      pucks = Math.round(0.25 * passiveRate() * sec);   // away: a quarter of the passive rate, so active play matters more st.pucks += pucks;
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
    on, emit, get, div, divRef, tier, tierIdx, leagueSize, poTeams, poRounds, roundNames, franchiseNo, payout, newGame, startSeason, beginNextSeason,
    prepareGame, commitGame, playNextGame, enterPlayoffs, preparePlayoff, commitPlayoff, playPlayoffGame,
    sorted, teamById, offerPick, takePick, rerollPick, takeChampionPack,
    spendUpgrade, promote, promoCost, canPromote, promoCap, levelGear, gearLevelCost, TUNE_MAX, equip, unequip, salvage, salvageAll, tradeUpGear, autoEquip, setXF,
    upgradeCoach, coachCost, setStyle, offlineCap, offlineHours, addPucks, breakCost, canBreak, breakthrough, buyLegend, buyTokens, LEGEND_COST, BREAK_MAX, shardPrice, buyShards,
    teamOvr, clickValue, passiveRate, tickPassive, activeBoosts, buyBoost, activateBoost, boostCost,
    fuseGroups, fuse, fuseCost, checkDaily, claimDaily, dailyState, DAILY, countTap, tapDay, tapWeek, WEEK_GOAL, TAP_GOALS, TAP_DROP_EVERY, noteCombo, alerts, setDemo, applySpeed, devGrant, claimAch,
    AWARDS, ROUND_ODDS, TRADES, pickOdds, maxRarity, addPick, pickCount, draft, rescout, scoutInfo, openBoard, rescoutBoard, chooseBoard, autoDraft, scoutPick, tradePlayers, combinePicks, tradeValue, tradeQuote, tradeIn, pickValue,
    refreshAgents, signAgent, faRescout, faRescoutLeft, lineupIds, bench, canSwap, lineupSwap, group, repairRoster, tradeable, toggleLock, batchTrade,
    facLvl, facVal, facMax, facCost, buildFac, canPrestige, prestige, keepLimit, FACH, fachValue, fachNeed, offerFach, takeFach, setAutoScrap, setAutoUp,
    SLOTS, curSlot, slotInfo, useSlot, deleteSlot, bringBack,
    byId, save, load, wipe, catchUp, toast, fmt, findGear, freeNumber, checkGold, rollGearDrop, ord
  };
})(window.BK = window.BK || {});
