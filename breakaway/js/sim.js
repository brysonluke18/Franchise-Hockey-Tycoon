/* Breakaway — game simulation */
(function (G) {
  'use strict';
  const D = G.DATA, M = G.M;
  const LINE_W = [0.35, 0.28, 0.22, 0.15];
  const PAIR_W = [0.40, 0.34, 0.26];
  const PO_LINE = [1.3, 1.1, 0.85, 0.5], PO_PAIR = [1.2, 1, 0.75];
  const hasXF = M.hasXF;

  function avg(ps, k) { return ps.reduce((s, p) => s + M.eff(p, k), 0) / ps.length; }
  function goalieRating(gp) {
    const w = D.OVR_W.G; let t = 0;
    for (const k in w) t += w[k] * M.eff(gp, k);
    return t;
  }

  // ---------------------------------------------------------------- ratings
  // opts.goalieIdx picks the starter (the backup plays ~30% of regular-season nights)
  // opts.style is the coach's system: 'off' tilts toward offense, 'def' toward defense
  function ratePlayerTeam(team, opts) {
    opts = opts || {};
    const byId = {};
    team.roster.forEach(p => { byId[p.id] = p; });
    const chem = team.chem || {};

    const lines = team.lineup.lines.map((ids, i) => {
      const ps = ids.map(id => byId[id]);
      let o = 0.30 * avg(ps, 'shooting') + 0.22 * avg(ps, 'passing') + 0.20 * avg(ps, 'hands') + 0.16 * avg(ps, 'skating') + 0.12 * avg(ps, 'iq');
      if (ps.some(p => hasXF(p, 'playmaker'))) o *= 1.03;
      const c = M.chemInfo(ids, chem, ps).mult;
      // playoff hockey shortens the bench: top lines play more, the fourth line barely
      let w = LINE_W[i] * (opts.playoff ? PO_LINE[i] : 1);
      if (ps.some(p => hasXF(p, 'franchise'))) w = Math.max(w, LINE_W[0]);
      // backcheckers lift a line's defensive work, lazy forwards drag it down
      const back = ps.reduce((s, p) => s + M.tfx(p, 'back'), 0) / ps.length;
      const dshare = (0.5 * avg(ps, 'defense') + 0.3 * avg(ps, 'iq') + 0.2 * avg(ps, 'skating')) * back;
      return { ids, ps, o, dfw: dshare, chem: c, w, idx: i };
    });
    const pairs = team.lineup.pairs.map((ids, j) => {
      const ps = ids.map(id => byId[id]);
      const d = (0.34 * avg(ps, 'defense') + 0.24 * avg(ps, 'iq') + 0.22 * avg(ps, 'skating') + 0.20 * avg(ps, 'grit')) * (ps.reduce((s, p) => s + M.tfx(p, 'back'), 0) / ps.length);
      const off = 0.35 * avg(ps, 'passing') + 0.35 * avg(ps, 'shooting') + 0.3 * avg(ps, 'skating');
      const c = M.chemInfo(ids, chem, ps).mult;
      return { ids, ps, d, off, chem: c, w: PAIR_W[j] * (opts.playoff ? PO_PAIR[j] : 1), idx: j, shutdown: ps.some(p => hasXF(p, 'shutdown')) };
    });

    const gi = opts.goalieIdx || 0;
    const gp = byId[team.lineup.goalies[gi]] || byId[team.lineup.goalies[0]];
    const grat = goalieRating(gp);

    const wsum = lines.reduce((s, l) => s + l.w, 0);
    let O = lines.reduce((s, l) => s + (l.w / wsum) * l.chem * l.o, 0);
    // forwards help defend a little; defense pairs carry most of it
    const psum = pairs.reduce((s, p) => s + p.w, 0);
    let Dr = pairs.reduce((s, p) => s + (p.w / psum) * p.chem * p.d, 0) * 0.82 + lines.reduce((s, l) => s + (l.w / wsum) * l.dfw, 0) * 0.18;
    if (opts.style === 'off') { O *= 1.04; Dr *= 0.97; }
    if (opts.style === 'def') { Dr *= 1.04; O *= 0.97; }

    return {
      name: team.name, abbr: team.abbr, user: true, byId,
      O, D: Dr, G: grat, lines, pairs, goalie: gp, playoff: !!opts.playoff, gsv: M.tfx(gp, 'sv', !!opts.playoff),
      gloveflash: hasXF(gp, 'gloveflash'),
      shutdown: pairs.some(p => p.shutdown)
    };
  }

  function rateAI(t) { return { name: t.name, abbr: t.abbr, user: false, O: t.O, D: t.D, G: t.G }; }

  // ---------------------------------------------------------------- one game
  function simGame(A, B, ref, opts) {
    opts = opts || {};
    const sideA = sideSetup(A, B, ref);
    const sideB = sideSetup(B, A, ref);

    // a lopsided roster leaks: offense far above defense gives up extra shots and goals,
    // defense far above offense struggles to score
    [[A, sideA, sideB], [B, sideB, sideA]].forEach(([T, self, other]) => {
      if (!T.user) return;
      const imb = T.O / Math.max(4, T.D);
      if (imb > 1.25) { const x = Math.min(1, imb - 1.25); other.shots = Math.round(other.shots * (1 + 0.5 * x)); other.goalRate *= 1 + 0.3 * x; }
      if (imb < 0.8) { const x = Math.min(0.4, 0.8 - imb); self.shots = Math.round(self.shots * (1 - 0.8 * x)); }
      self.imbalance = imb;
    });

    // home-ice feel for the user in the playoffs (opts.edge), and a push when trailing late
    const user = A.user ? sideA : B.user ? sideB : null, them = user === sideA ? sideB : sideA;
    if (user && opts.edge) { user.goalRate *= opts.edge; them.goalRate /= opts.edge; }
    let ga = 0, gb = 0;
    const periods = [], pens = [];
    sideA.disc = discipline(A); sideB.disc = discipline(B);
    for (let per = 0; per < 3; per++) {
      const down = !user ? 0 : user === sideA ? gb - ga : ga - gb;
      const push = per > 0 && down > 0 ? 1 + Math.min(0.3, 0.12 * down) * (opts.edge ? 1.3 : 1) : 1;
      if (user) user.goalRate *= push;
      let pa = periodGoals(sideA, per), pb = periodGoals(sideB, per);
      const st2 = specialTeams(sideA, sideB, per, pens);
      pa += st2.a; pb += st2.b;
      if (user) user.goalRate /= push;
      ga += pa; gb += pb;
      periods.push({ a: pa, b: pb });
    }

    let ot = false, so = false;
    if (ga === gb) {
      ot = true;
      const ea = bestLineRating(A), eb = bestLineRating(B);
      const pA = ea / (ea + eb);
      const aWins = M.rand() < pA;
      if (M.rand() < 0.62) {
        if (aWins) { ga++; if (A.user) attribute(sideA, 1, 0, 3); } else { gb++; if (B.user) attribute(sideB, 1, 0, 3); }
      } else {
        so = true;
        if (aWins) ga++; else gb++;
      }
    }
    if (A.user) extras(sideA);
    if (B.user) extras(sideB);

    const res = {
      a: { goals: ga, shots: sideA.shots, stats: sideA.stats, list: sideA.list, saves: sideB.shots - gb },
      b: { goals: gb, shots: sideB.shots, stats: sideB.stats, list: sideB.list, saves: sideA.shots - ga },
      periods, ot, so, pens, imbalance: sideA.imbalance || sideB.imbalance || 1
    };
    res.a.ga = gb; res.a.sa = sideB.shots;
    res.b.ga = ga; res.b.sa = sideA.shots;
    res.a.ppg = pens.filter(p => p.g === 'a' && !p.sh).length; res.b.ppg = pens.filter(p => p.g === 'b' && !p.sh).length;
    res.a.pp = pens.filter(p => p.s === 'b').length; res.b.pp = pens.filter(p => p.s === 'a').length;
    return res;
  }

  function bestLineRating(T) { return T.lines ? T.lines.reduce((m, l) => Math.max(m, l.o * l.chem), 0) : T.O; }

  function sideSetup(self, opp, ref) {
    let O = self.O;
    if (opp.shutdown) O *= 0.97;
    const shots = Math.round(M.clamp(30 * Math.pow(O / Math.max(6, opp.D), 0.65), 16, 50));
    // goaltending swings hard: a goalie well above the division carries a team
    let psave = 0.900 + 0.0020 * (opp.G - ref) - 0.0010 * (O - ref);
    if (opp.gloveflash) psave += 0.006;
    psave += opp.gsv || 0;   // goalie tendencies
    psave = M.clamp(psave, 0.83, 0.965);
    return { self, opp, O, shots, psave, ref, stats: self.user ? {} : null, list: self.user ? [] : null, goalRate: 1 - psave };
  }

  // ---------------------------------------------------------------- special teams
  // Even strength scores a little less than before because power plays now add their own goals.
  const ES_SCALE = 0.84;
  // how often a team takes penalties: player types (enforcers, power forwards) and grit
  function discipline(T) {
    if (!T.user) return 1;
    const sk = T.lines.reduce((a, l) => a.concat(l.ps), []).concat(T.pairs.reduce((a, p) => a.concat(p.ps), []));
    const f = sk.reduce((s, p) => s + M.typeOf(p).pim * M.tfx(p, 'pim') * (0.7 + M.eff(p, 'grit') / 100), 0) / sk.length;
    return M.clamp(f, 0.6, 1.8);
  }
  // each period: penalties for both sides, each one a two-minute power play for the other team.
  // The power play converts on about one in five, more with better offense against a weaker kill;
  // now and then the short-handed team scores instead.
  function specialTeams(sA, sB, per, pens) {
    const out = { a: 0, b: 0 };
    [[sA, sB, 'a', 'b'], [sB, sA, 'b', 'a']].forEach(([pk, pp, sk, sp]) => {
      const n = M.binomial(6, 0.13 * pk.disc);
      for (let k = 0; k < n; k++) {
        const pen = { per, s: sk, g: null };
        if (pk.self.user) {
          const ps = pk.self.lines.reduce((a, l) => a.concat(l.ps), []).concat(pk.self.pairs.reduce((a, p) => a.concat(p.ps), []));
          const who = ps[M.weightedIndex(ps.map(p => T(p).pim * M.tfx(p, 'pim') * (0.6 + M.eff(p, 'grit') / 60)))];
          row(pk.stats, who.id).pim += 2; pen.pid = who.id;
        }
        const pGoal = M.clamp(0.2 * Math.pow(pp.O / Math.max(4, pp.opp.D), 0.6) * ((1 - pp.psave) / 0.095), 0.06, 0.42);
        pp.shots += 2;
        if (M.rand() < pGoal) { pen.g = sp; out[sp]++; if (pp.self.user) { attribute(pp, 1, 2, per, 'pp'); pp.list[pp.list.length - 1].pen = pens.length; } }
        else if (M.rand() < 0.03) { pen.g = sk; pen.sh = true; out[sk]++; pk.shots++; if (pk.self.user) { attribute(pk, 1, 1, per, 'sh'); pk.list[pk.list.length - 1].pen = pens.length; } }
        pens.push(pen);
      }
    });
    return out;
  }

  function periodGoals(side, per) {
    const perShots = Math.round(side.shots / 3);
    const goals = M.binomial(perShots, side.goalRate * ES_SCALE);
    if (side.self.user) attribute(side, goals, perShots, per);
    return goals;
  }

  // ------------------------------------------------- attribution (user team)
  function row(st, id) { if (!st[id]) st[id] = { g: 0, a: 0, s: 0, hits: 0, blk: 0, pm: 0, pim: 0 }; return st[id]; }
  const T = p => M.typeOf(p);

  function attribute(side, goals, shots, per, tag) {
    const Tn = D.TUNING, self = side.self, oppD = side.opp.D, st = side.stats;
    const lw = self.lines.map(l => {
      let w = l.w;
      if (per === 2) {
        if (l.idx === 0 && !l.ps.some(p => hasXF(p, 'workhorse'))) w *= 0.94;
        if (l.idx >= 2) w *= 1.06;
      }
      return w * l.chem * l.o;
    });
    const pw = self.pairs.map(p => p.w);

    // shots: three in four from forwards
    for (let s = 0; s < shots; s++) {
      if (M.rand() < 0.75) { const l = self.lines[M.weightedIndex(lw)]; row(st, l.ids[M.weightedIndex(usage(l, oppD, Tn, self.playoff).map((u, i) => u * M.tfx(l.ps[i], 'shot')))]).s++; }
      else { const pr = self.pairs[M.weightedIndex(pw)]; row(st, pr.ids[M.weightedIndex(pr.ps.map(p => Math.max(1, M.eff(p, 'shooting')) * T(p).goal * M.tfx(p, 'shot')))]).s++; }
    }

    for (let g = 0; g < goals; g++) {
      const line = self.lines[M.weightedIndex(lw)];
      const pair = self.pairs[M.weightedIndex(pw.map((w, i) => w * self.pairs[i].chem))];
      // about one goal in six comes from the blue line, more with offensive defensemen
      const dShare = M.clamp(0.13 * pair.ps.reduce((s, p) => s + T(p).goal, 0) / 2 * (pair.off / Math.max(5, line.o)), 0.05, 0.32);
      let scorer;
      if (M.rand() < dShare) scorer = pair.ps[M.weightedIndex(pair.ps.map(p => Math.max(1, M.eff(p, 'shooting')) * T(p).goal * M.tfx(p, 'goal', self.playoff)))];
      else scorer = line.ps[M.weightedIndex(usage(line, oppD, Tn, self.playoff))];
      row(st, scorer.id).g++;
      const onIce = line.ps.concat(pair.ps);
      if (tag !== 'pp') onIce.forEach(p => row(st, p.id).pm++);

      // assists: weighted by passing and the player's role; quarterbacks take the primary
      let a1 = null, a2 = null;
      if (M.rand() < 0.88) {
        const mates = onIce.filter(p => p !== scorer);
        const qb = mates.find(p => hasXF(p, 'playmaker'));
        const wts = ps => ps.map(p => Math.pow(Math.max(1, M.eff(p, 'passing') + 0.4 * M.eff(p, 'iq')), 1.3) * T(p).ast * M.tfx(p, 'ast') * (line.ps.indexOf(p) >= 0 ? 1.4 : 1));
        a1 = qb || mates[M.weightedIndex(wts(mates))];
        row(st, a1.id).a++;
        if (M.rand() < 0.72) {
          const rest = mates.filter(p => p !== a1);
          a2 = rest[M.weightedIndex(wts(rest))];
          row(st, a2.id).a++;
        }
      }
      side.list.push({ per, sc: scorer.id, a1: a1 && a1.id, a2: a2 && a2.id, tag: tag || null });
    }
  }

  // hits, blocks and penalties once per game, shaped by player type
  function extras(side) {
    const self = side.self, st = side.stats;
    const sk = self.lines.reduce((a, l) => a.concat(l.ps), []).concat(self.pairs.reduce((a, p) => a.concat(p.ps), []));
    const nh = M.ri(10, 22);
    for (let i = 0; i < nh; i++) row(st, sk[M.weightedIndex(sk.map(x => Math.pow(Math.max(1, M.eff(x, 'grit')), 1.2) * T(x).hits * M.tfx(x, 'hits')))].id).hits++;
    const nb = M.ri(6, 15);
    for (let i = 0; i < nb; i++) row(st, sk[M.weightedIndex(sk.map(x => Math.pow(Math.max(1, M.eff(x, 'defense')), 1.2) * T(x).blk * M.tfx(x, 'blk') * (x.pos === 'D' ? 1.6 : 1)))].id).blk++;
    sk.forEach(p => {
      // minors come from the power-play model; fights (five minutes, no power play) stay here
      const fight = p.type === 'enforcer' ? 0.16 : p.type === 'power' ? 0.04 : 0.01;
      if (M.rand() < fight) row(st, p.id).pim += 5;
    });
  }

  // the star share: rating^starExp * mismatch * Gamma noise * type scoring
  function usage(line, oppD, Tn, po) {
    return line.ps.map(p => {
      const R = Math.max(1, M.overall(p));
      let mism = Math.pow(R / Math.max(6, oppD), hasXF(p, 'generational') ? Tn.mismatchExp * 1.6 : Tn.mismatchExp);
      mism = M.clamp(mism, Tn.mismatchLo, Tn.mismatchHi);
      let u = Math.pow(R, Tn.starExp) * mism * M.gammaUnit(Tn.gammaShape) * T(p).goal;
      if (hasXF(p, 'heavyshot')) u *= 1.08;
      return u * M.tfx(p, 'goal', po);
    });
  }

  function applyMinus(stats, team, conceded) {
    if (!stats) return;
    for (let i = 0; i < conceded; i++) {
      const l = team.lines[M.weightedIndex(team.lines.map(x => x.w / Math.max(1, x.dfw) * 10))];
      const p = team.pairs[M.weightedIndex(team.pairs.map(x => x.w / Math.max(1, x.d) * 10))];
      l.ids.concat(p.ids).forEach(id => { row(stats, id).pm--; });
    }
  }

  G.SIM = { ratePlayerTeam, rateAI, simGame, applyMinus, LINE_W, PAIR_W, usage, goalieRating };
})(window.BK = window.BK || {});
