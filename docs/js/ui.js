/* Breakaway — views */
(function (G) {
  'use strict';
  const D = G.DATA, M = G.M, ST = G.ST, P = G.PRACTICE, A = G.ART;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ic = A.icon;
  let tab = 'team', selSwap = null, practiceOn = false, feed = [], editMode = false, drillMode = false, autoAll = false;
  const crestSVG = A.crestSVG, jerseySVG = A.jerseySVG;

  // ------------------------------------------------------------ helpers
  const fmt = n => ST.fmt(n);
  const rcol = p => M.isGold(p) ? D.GOLD : M.rarityOf(p).color;
  const rname = p => M.isGold(p) ? 'HoF' : M.rarityOf(p).n;
  const natOf = p => M.nationOf(p);
  const flag = (code, w) => A.flag(code, w || 16);
  const last = p => { const s = p.name.split(' '); return s.length > 1 ? s.slice(1).join(' ') : p.name; };
  const first = p => p.name.split(' ')[0];
  const team = () => ST.get().team;
  const pucks = n => '<span class="pk">' + ic('puck', 13) + fmt(n) + '</span>';
  const stars = n => '<span class="stars' + (n === 5 ? ' max' : '') + '">' + [0, 1, 2, 3, 4].map(i => ic('star', 10, i < n ? 'on' : '')).join('') + '</span>';
  const ovr = (p, big) => '<span class="ovr' + (big ? ' big' : '') + (M.isGold(p) ? ' gold' : '') + '" style="--rc:' + rcol(p) + '">' + M.overall(p) + '</span>';
  const sh = (title, extra) => '<div class="sec-h"><h2>' + title + '</h2>' + (extra || '') + '</div>';
  const poolOf = p => p.pos === 'G' ? 'G' : p.pos === 'D' ? 'D' : 'F';
  const POOLC = { F: '#ff8a4c', D: '#5cc8ff', G: '#c58bff' };
  const POOLN = { F: 'Forward', D: 'Defense', G: 'Goalie' };
  const typeTag = p => { const t = M.typeOf(p); return '<span class="ttag" title="' + esc(t.n) + '">' + t.ab + '</span>'; };
  const shardIc = (k, s) => ic('shard', s || 15).replace('class="ic"', 'class="ic" style="color:' + POOLC[k] + '"');

  // ------------------------------------------------------------ TEAM
  let gtilePromo = null;
  function renderTeam() {
    const st = ST.get(), t = st.team, L = t.lineup;
    gtilePromo = ST.alerts().promo;
    const by = {}; t.roster.forEach(p => by[p.id] = p);
    const me = ST.teamById('me');
    let h = '';
    if (!st.hintClosed) {
      h += '<section class="hint"><div class="hint-h"><b>How Breakaway works</b><button class="xbtn" data-act="hint" aria-label="Dismiss">' + ic('close', 16) + '</button></div>' +
        '<div class="hint-steps">' +
        '<div>' + ic('season', 22) + '<span>The season plays itself, one game every ' + D.TUNING.gameIntervalSec + 's.</span></div>' +
        '<div>' + ic('practice', 22) + '<span>Tap on Train for pucks. A better team earns more per tap and while idle.</span></div>' +
        '<div>' + ic('dumbbell', 22) + '<span>Spend pucks on players. Their next game uses it.</span></div>' +
        '<div>' + ic('trophy', 22) + '<span>Top 8 make the playoffs. Win it all to move up.</span></div></div></section>';
    }
    h += '<section class="club" style="--tc:' + t.c1 + '"><div class="club-jersey">' + jerseySVG(t, 92) + '</div>' +
      '<div class="club-main"><div class="eyebrow">Division ' + st.div + ' · ' + esc(ST.div().n) + '</div>' +
      '<h1 class="club-name"><span>' + esc(t.city) + '</span>' + esc(t.name) + '</h1>' +
      '<div class="club-stats"><div><b>' + Math.round(ST.teamOvr()) + '</b><i>team ovr</i></div>' +
      '<div><b>' + (me ? me.w + '-' + me.l + '-' + me.otl : '—') + '</b><i>season ' + st.season + '</i></div>' +
      '<div><b>' + st.totals.cups + '</b><i>titles</i></div></div></div></section>';
    h += '<div class="quick"><button class="qbtn" data-act="history">' + ic('season', 20) + '<span>History</span></button>' +
      '<button class="qbtn coachq" data-act="coach">' + A.coachPortrait(st.coach, t, 26) + '<span>Coach</span></button>' +
      '<button class="qbtn" data-act="kit">' + ic('jersey', 20) + '<span>Jersey + Logo</span></button>' +
      '<button class="qbtn" data-act="saves">' + ic('swap', 20) + '<span>Saves</span></button></div>';
    h += '<div class="wallet">' + ['F', 'D', 'G'].map(k => '<span class="wchip" title="' + POOLN[k] + ' shards">' + shardIc(k) + '<b>' + fmt(st.shards[k]) + '</b><i>' + k + ' shards</i></span>').join('') +
      '<span class="wchip">' + ic('tape', 15) + '<b>' + fmt(st.tape) + '</b><i>tape</i></span>' +
      '<span class="wchip">' + ic('token', 15) + '<b>' + ST.pickCount() + '</b><i>picks</i></span>' +
      '<span class="wchip">' + A.gearIcon('stick', 'var(--dim)', 15) + '<b>' + st.gear.length + '</b><i>spare gear</i></span></div>';

    h += sh('Lineup', '<span class="sec-btns"><button class="btn sm chemtg' + (st.showChem ? ' primary' : '') + '" data-act="chemnotes">Chem details</button><button class="btn sm' + (editMode ? ' primary' : '') + '" data-act="editlines">' + ic(editMode ? 'check' : 'swap', 15) + (editMode ? ' Done' : ' Edit lines') + '</button></span>');
    h += '<div class="gearbar"><button class="btn sm' + (ST.alerts().gear ? ' alert' : '') + '" data-act="autoequip">' + ic('gear', 15) + ' Auto-equip gear</button>' +
      '<label class="chk"><input type="checkbox" id="autoAll"' + (autoAll ? ' checked' : '') + '><span>' + ic('check', 12) + '</span>Re-fit equipped gear too</label></div>';
    if (editMode) {
      const sp = selSwap && by[selSwap];
      h += '<div class="editbar">' + ic('swap', 18) + '<span>' + (sp ? 'Moving <b>' + esc(last(sp)) + '</b>. Tap a highlighted spot to swap.' : 'Tap a player, then tap a highlighted spot. Players only play their own position.') + '</span></div>';
    }
    const slotLbl = ['LW', 'C', 'RW'];
    const pct = v => (v >= 0 ? '+' : '−') + Math.abs(Math.round(v * 100)) + '%';
    // unit Overall includes gear, trophies, legacy and active boosts, so weak spots show at a glance
    const unitOvr = ids => { const ps = ids.map(id => by[id]).filter(Boolean); return ps.length ? Math.round(ps.reduce((s, p) => s + M.overall(p), 0) / ps.length) : 0; };
    const chemBlock = (info, ov) => '<div class="lg-chem"><b class="u-ovr">' + ov + '</b><span class="chem">Chem ' + stars(info.stars) + '</span><em>' + pct(info.mult - 1) + '</em></div>';
    const chemNotes = (info) => '<div class="lg-n"><span class="cn g">' + info.games + ' GP together ' + pct(info.gb) + '</span>' +
      info.parts.map(x => '<span class="cn ' + (x.v >= 0 ? 'p' : 'm') + '">' + esc(x.t) + ' ' + pct(x.v) + (x.faded ? ' (fading)' : '') + '</span>').join('') + '</div>';
    h += '<section class="lgrid' + (editMode ? ' editing' : '') + (st.showChem ? ' notes' : '') + '">';
    for (let i = 0; i < 4; i++) {
      const f = L.lines[i], d = i < 3 ? L.pairs[i] : L.goalies;
      const fi = M.chemInfo(f, t.chem, f.map(id => by[id])), di = i < 3 ? M.chemInfo(d, t.chem, d.map(id => by[id])) : null;
      h += '<div class="lg-row"><div class="lg-h"><b>Line ' + (i + 1) + '</b></div><div class="lg-body">' +
        '<div class="lg-col">' + chemBlock(fi, unitOvr(f)) + '<div class="lg-tiles f">' + f.map((id, j) => gtile(by[id], slotLbl[j])).join('') + '</div>' + chemNotes(fi) + '</div>' +
        '<i class="lg-gap"></i>' +
        '<div class="lg-col dcol">' + (di ? chemBlock(di, unitOvr(d)) : '<div class="lg-chem"><b class="u-ovr">' + unitOvr(d.slice(0, 1)) + '</b><span class="chem">Starter · no chem</span></div>') +
        '<div class="lg-tiles d">' + d.map((id, j) => gtile(by[id], i < 3 ? 'D' : (j === 0 ? 'Starter' : 'Backup'))).join('') + '</div>' + (di ? chemNotes(di) : '') + '</div>' +
        '</div></div>';
    }
    h += '</section><div class="note chemnote' + (st.showChem ? ' on' : '') + '">Chemistry is mostly <b>games played together</b>: it keeps growing the longer a unit stays together, and by ' + M.CHEM_FADE + ' games it fully erases any bad fit. Fit is a small instant bonus: mixed roles and a shared country help a line, two of one type hurts. OFD with DFD or two TWDs help a pair; two OFDs or two DFDs hurt. Goalies have no chemistry. The backup starts about 30% of regular-season games.</div>';
    const extras = ST.bench().sort((a, b) => M.overall(b) - M.overall(a));
    h += sh('Bench', '<span class="sec-note">' + extras.length + ' player' + (extras.length === 1 ? '' : 's') + '</span>');
    h += extras.length ? '<section class="bgrid' + (editMode ? ' editing' : '') + '">' + extras.map(p => gtile(p, p.pos)).join('') + '</section>' +
      '<div class="note">Signed, drafted and spare players wait here. Use Edit lines to play one, or trade them on the Office tab.</div>'
      : '<div class="empty">' + ic('team', 24) + '<span>Nobody on the bench. Players you sign or draft land here.</span></div>';
    return h;
  }
  function gearMini(p) {
    const slots = D.GEAR_SLOTS[p.pos === 'G' ? 'goalie' : 'skater'];
    return '<span class="gmini">' + slots.map(s => { const g = p.gear[s.k]; return A.gearIcon(s.k, g ? A.gearColor(g) : 'var(--line2)', 11); }).join('') + '</span>';
  }
  function gtile(p, slot) {
    if (!p) return '<span class="gt empty"></span>';
    const promo = !editMode && gtilePromo && gtilePromo[p.id];
    const sel = selSwap === p.id, can = editMode && selSwap && !sel && ST.canSwap(selSwap, p.id);
    const off = ['LW', 'C', 'RW'].indexOf(slot) >= 0 && p.pos !== slot;
    return '<button class="gt' + (sel ? ' sel' : '') + (can ? ' can' : '') + (editMode && selSwap && !sel && !can ? ' dim' : '') + '" data-p="' + p.id + '">' +
      (promo ? '<span class="gt-up" title="Can promote">' + ic('plus', 9) + '</span>' : '') + (p.locked ? '<span class="lk">' + ic('lock', 11) + '</span>' : '') + '<span class="gt-slot' + (off ? ' off' : '') + '">' + (off ? slot + '·' + p.pos : slot) + '</span>' +
      '<span class="pt-face">' + A.portrait(p, team(), 44, rcol(p)) + ovr(p) + '</span>' +
      '<span class="gt-n">' + flag(p.nat, 12) + esc(last(p)) + '</span>' +
      '<span class="gt-m">' + typeTag(p) + gearMini(p) + '</span></button>';
  }

  // ------------------------------------------------------------ TRAIN
  function renderTrain() {
    const st = ST.get();
    if (drillMode) {
      return '<section class="hud"><div class="hud-row"><div class="hud-c"><b id="pCombo">0</b><span>combo</span></div>' +
        '<div class="hud-c mult"><b id="pMult">1.0×</b><span>multiplier</span></div><div class="hud-c bank"><b id="pPending">0</b><span>earned</span></div></div>' +
        '<div class="combo-bar"><i id="pDecay" style="width:0%"></i></div><div class="hud-foot"><span>Shooting Drill</span><span class="num" id="pTime">30s</span></div>' +
        '<div class="timebar"><i id="pTimeBar" style="width:100%"></i></div></section>' +
        '<div class="rink-wrap"><div class="rink" id="rink"></div>' +
        '<div class="rink-start" id="rinkStart"><div class="rs-card"><div class="rs-ic">' + ic('net', 30) + '</div><h3>Shooting Drill</h3>' +
        '<ul><li>A hole in the tarp lights up. Tap it before its ring runs out.</li><li>Inside 0.3s is a SNIPE: double combo.</li><li>Up to five holes lit at once. Each hit pays 3× a normal tap, times your combo.</li><li>Finish with 10+ hits for an accuracy bonus.</li></ul>' +
        '<div class="grid2"><button class="btn" data-act="drillback">Back</button><button class="btn primary" data-act="startround">Start · 30s</button></div></div></div></div>';
    }
    const rush = ST.activeBoosts().find(b => b.k === 'rush');
    let h = '<section class="clicker">' +
      '<div class="ck-top"><div><b id="ckVal">+' + fmt(ST.clickValue()) + '</b><i>per tap at 1.0×</i></div>' +
      '<div class="r"><b id="ckPass">+' + fmt(ST.passiveRate()) + '/s</b><i>passive, from team overall</i></div></div>' +
      '<div class="ck-arena" id="ckArena"><button class="ck-puck" id="ckPuck" aria-label="Tap for pucks"><span class="ck-ring"></span>' + ic('puck', 92) + '</button></div>' +
      '<div class="ck-combo"><div><b id="ckCombo">0</b><i>combo</i></div><div class="ck-bar"><i id="ckDecay"></i></div><div class="r"><b id="ckMult">1.0×</b><i>multiplier</i></div></div>' +
      '<div class="ck-goal" id="ckGoal">' + goalHTML() + '</div>' +
      (rush ? '<div class="boost-on">' + ic('bolt', 14) + ' Puck Rush: double income</div>' : (st.boosts.rush ? '<button class="btn sm" data-boost="rush">' + ic('bolt', 14) + ' Use Puck Rush (' + st.boosts.rush + ')</button>' : '')) +
      '</section>';
    h += '<div class="note c">Team overall ' + Math.round(ST.teamOvr()) + ' sets tap and passive income. Upgrade players and both go up. A golden puck shows up now and then: tap it for 25 taps’ worth.</div>';
    h += sh(ic('net', 18) + ' Shooting Drill') + '<section class="panel drillcard"><div class="dc-ic">' + ic('net', 30) + '</div>' +
      '<div><b>30-second tarp round</b><i>Hectic: up to five lit holes. 3× per hit plus an accuracy bonus.</i></div>' +
      '<button class="btn primary sm" data-act="drill">Play</button></section>';
    return h;
  }

  let goldenAt = 0, golden = null, ckRaf = 0;
  function clickLoop() {
    cancelAnimationFrame(ckRaf);
    if (!goldenAt) goldenAt = performance.now() + 15000 + Math.random() * 15000;
    const frame = now => {
      if (tab !== 'train' || drillMode || !$('#ckPuck')) return;
      const s = P.clickState();
      const c = $('#ckCombo'), m = $('#ckMult'), d = $('#ckDecay');
      if (c) { c.textContent = s.combo; m.textContent = s.mult.toFixed(1) + '×'; d.style.width = (s.decay * 100).toFixed(1) + '%'; m.parentNode.classList.toggle('hot', s.mult >= 3); }
      const ar = $('#ckArena');
      if (!golden && now > goldenAt && ar) {
        golden = document.createElement('button');
        golden.className = 'golden'; golden.setAttribute('aria-label', 'Golden puck');
        golden.innerHTML = ic('puck', 34);
        golden.style.left = (12 + Math.random() * 70) + '%'; golden.style.top = (10 + Math.random() * 65) + '%';
        golden.dataset.until = now + 2600;
        ar.appendChild(golden);
      }
      if (golden && now > +golden.dataset.until) { golden.remove(); golden = null; goldenAt = now + 18000 + Math.random() * 14000; }
      ckRaf = requestAnimationFrame(frame);
    };
    ckRaf = requestAnimationFrame(frame);
  }
  // daily practice goals under the clicker
  function goalHTML() {
    const t = ST.tapDay(), G = ST.TAP_GOALS, next = G[t.got], prev = t.got ? G[t.got - 1].n : 0;
    if (!next) { const E = ST.TAP_DROP_EVERY, past = t.n - G[G.length - 1].n, into = past % E; return '<div class="cg-h"><b>Goals done · bonus drop: ' + into + ' / ' + E + ' taps</b><i>gear, pucks, a pick or shards</i></div><div class="cg-bar"><i style="width:' + (100 * into / E).toFixed(1) + '%"></i></div>'; }
    const pct = Math.min(100, 100 * (t.n - prev) / (next.n - prev));
    return '<div class="cg-h"><b>Practice goal ' + (t.got + 1) + '/' + G.length + ': ' + fmt(t.n) + ' / ' + fmt(next.n) + ' taps</b><i>+' + next.s + ' shards' + (next.pick ? ' + a ' + ST.ord(next.pick) + '-round pick' : '') + '</i></div>' +
      '<div class="cg-bar"><i style="width:' + pct.toFixed(1) + '%"></i></div>';
  }
  function clickTap(x, y, isGolden) {
    const ar = $('#ckArena'); if (!ar) return;
    const r = ar.getBoundingClientRect();
    const out = isGolden ? P.tapGolden() : P.tap();
    if (!out.v) return;
    const cg = $('#ckGoal'); if (cg) cg.innerHTML = goalHTML();
    if (isGolden && golden) { golden.remove(); golden = null; goldenAt = performance.now() + 18000 + Math.random() * 14000; }
    const pop = document.createElement('div');
    pop.className = 'ckpop' + (isGolden ? ' gold' : '');
    pop.textContent = '+' + fmt(out.v);
    pop.style.left = (x - r.left) + 'px'; pop.style.top = (y - r.top) + 'px';
    ar.appendChild(pop);
    setTimeout(() => pop.remove(), 650);
    const pk = $('#ckPuck'); if (pk) { pk.classList.remove('hit'); void pk.offsetWidth; pk.classList.add('hit'); }
    header();
  }

  function drillEvent(ev) {
    if (ev.type === 'end') { roundOver(ev); return; }
    const c = $('#pCombo'); if (!c) return;
    c.textContent = ev.combo || 0;
    $('#pMult').textContent = (ev.mult || 1).toFixed(1) + '×';
    if (ev.type === 'tick') {
      $('#pPending').textContent = fmt(ev.banked || 0);
      $('#pDecay').style.width = ((ev.decay || 0) * 100).toFixed(1) + '%';
      $('#pTime').textContent = Math.ceil(ev.left / 1000) + 's';
      $('#pTimeBar').style.width = (100 * ev.left / ev.dur).toFixed(1) + '%';
      header();
    }
  }
  function startRound() {
    const rink = $('#rink'); if (!rink || P.running || modalOpen()) return;
    $('#rinkStart').classList.add('hidden');
    const v = $('#view'), hud = document.querySelector('.hud');
    v.scrollTop += rink.parentNode.getBoundingClientRect().top - (v.getBoundingClientRect().top + (hud ? hud.offsetHeight : 0) + 10);
    document.body.classList.add('drilling');
    practiceOn = true;
    P.start(rink, drillEvent);
  }
  function roundOver(out) {
    practiceOn = false;
    document.body.classList.remove('drilling');
    header();
    openModal('<div class="result"><div class="eyebrow">Shooting Drill · ' + out.sec + 's</div><h2 class="big-title">Round over</h2>' +
      '<div class="result-pucks">' + ic('puck', 34) + '<b>+' + fmt(out.banked) + '</b></div>' +
      (out.bonus ? '<div class="note c">Accuracy ' + out.acc + '% · finish bonus +' + fmt(out.bonus) + ' pucks</div>' : '') + '<div class="trio"><div><b>' + out.best + '</b><i>best combo</i></div><div><b>' + out.hits + '</b><i>hits</i></div><div><b>' + out.misses + '</b><i>misses</i></div></div>' +
      '<div class="grid2"><button class="btn" data-act="again">Run it again</button><button class="btn primary" data-act="spend">Spend on the team</button></div></div>', true);
  }
  function stopPractice() {
    if (!practiceOn) return;
    practiceOn = false;
    document.body.classList.remove('drilling');
    P.stop(); header(); ST.save();
  }

  // ------------------------------------------------------------ SEASON
  function badgeFor(t, s) {
    if (t.id === 'me') { const k = team(); return '<span class="tb" style="width:' + s + 'px;height:' + s + 'px;background:' + k.c1 + '">' + crestSVG(k.crest, k.c2, Math.round(s * .62), k.c1) + '</span>'; }
    return A.teamBadge(t.name, s);
  }
  function renderSeason() {
    const st = ST.get(), d = ST.div();
    let h = '';
    if (st.phase === 'season') {
      const done = st.gameIndex, total = st.schedule.length, me = ST.teamById('me');
      const seed = ST.sorted().findIndex(t => t.id === 'me') + 1;
      h += '<section class="panel"><div class="ss-top"><div><div class="eyebrow">Regular season · ' + esc(d.n) + '</div>' +
        '<div class="ss-rec"><b>' + me.w + '-' + me.l + '-' + me.otl + '</b><span class="pill ' + (seed <= 8 ? 'good' : 'bad') + '">' + ST.ord(seed) + (seed <= 8 ? ' · in' : ' · out') + '</span></div></div>' +
        '<div class="ss-prog"><b>' + done + '<small>/' + total + '</small></b><i>games</i></div></div>' +
        livePanel('Game ' + (done + 1)) +
        '<div class="tick"><span>Next result</span><span class="tickbar"><i id="tickBar"></i></span><span id="tickTxt" class="num"></span></div>' +
        (st.dev ? '<div class="ss-tools"><button class="toggle' + (st.demo ? ' on' : '') + '" data-act="demo"><span class="tg-dot"></span>Demo clock ' + (st.demo ? 'on · 8s' : 'off · 30s') + '</button>' +
        '<button class="btn sm devb" data-act="skip">' + ic('skip', 14) + ' Skip game (dev)</button></div>' : '') + '</section>';
    } else if (st.phase === 'playoffs') h += playoffPanel();
    else {
      const lastS = st.history[0], champ = lastS && lastS.result === 'Champion';
      h += '<section class="panel offseason' + (champ ? ' champ' : '') + '"><div class="off-ic">' + ic(champ ? 'trophy' : 'season', 36) + '</div><div class="eyebrow">Offseason</div>' +
        (lastS ? '<h2 class="big-title">' + (champ ? 'Champions' : esc(lastS.result)) + '</h2><p class="sub">Season ' + lastS.season + ' · ' + esc(lastS.divName) + ' · ' + lastS.w + '-' + lastS.l + '-' + lastS.otl + '</p>' : '') +
        (champ && lastS.div > 1 ? '<p class="sub">Promoted to <b>' + esc(d.n) + '</b>. Expect a season of catching up.</p>' : champ ? '<p class="sub">Elite champions. The league will be gunning for you.</p>' : '<p class="sub">Nothing is lost. Roster, pucks and gear carry over.</p>') +
        '<button class="btn primary big" data-act="nextseason">Start season ' + st.season + '</button></section>';
      if (ST.canPrestige()) h += '<section class="panel prest"><div class="eyebrow">Franchise ' + ((st.prestige || 0) + 2) + ' available</div><h3>Start a new franchise</h3>' +
        '<p>Back to the Rec League with up to ' + ST.keepLimit() + ' Legacy player' + (ST.keepLimit() > 1 ? 's' : '') + ' and +' + (((st.prestige || 0) + 1) * 10) + '% income for good. Legacy players come back Legendary, starting about 5 Overall above the new roster, and keep their trophies plus +2 to every attribute per franchise they carry. Coach skills, achievements and dailies start over. Hall of Fame gear, traits, chemistry and franchise achievements carry over.</p>' +
        '<button class="btn gold" data-act="prestige">' + ic('trophy', 16) + ' Choose Legacy players</button></section>';
    }
    if (feed.length) h += sh('Results') + '<div class="feed">' + feed.slice(0, 20).map(f => '<span class="fchip ' + (f.win ? 'w' : 'l') + '"><b>' + (f.win ? 'W' : 'L') + '</b>' + f.gf + '–' + f.ga + (f.ot ? '<i>' + (f.so ? 'SO' : 'OT') + '</i>' : '') + '<em>' + esc(f.oppAbbr) + '</em></span>').join('') + '</div>';

    const table = ST.sorted();
    h += sh('Standings', '<span class="sec-note">Top 8 make the playoffs' + (st.div === 1 && st.eliteSeasons ? ' · rivals +' + Math.min(30, 2.5 * st.eliteSeasons) + ' after ' + st.eliteSeasons + ' Elite season' + (st.eliteSeasons > 1 ? 's' : '') : '') + '</span>') +
      '<section class="panel flush"><div class="scroll-x"><table class="stand"><thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>OT</th><th>PTS</th><th>DIFF</th></tr></thead><tbody>' +
      table.map((t, i) => (i === 8 ? '<tr class="cut"><td colspan="7"><span>Playoff line</span></td></tr>' : '') +
        '<tr class="' + (t.id === 'me' ? 'me' : '') + '"><td>' + (i + 1) + '</td><td><span class="tn">' + badgeFor(t, 20) + '<span>' + esc(t.name) + '</span></span></td>' +
        '<td>' + t.w + '</td><td>' + t.l + '</td><td>' + t.otl + '</td><td><b>' + (t.w * 2 + t.otl) + '</b></td>' +
        '<td class="' + (t.gf - t.ga > 0 ? 'pos' : t.gf - t.ga < 0 ? 'neg' : '') + '">' + (t.gf - t.ga > 0 ? '+' : '') + (t.gf - t.ga) + '</td></tr>').join('') +
      '</tbody></table></div></section>';

    const sk = st.team.roster.filter(p => p.pos !== 'G' && p.season.gp);
    const gs = st.team.roster.filter(p => p.pos === 'G' && p.season.gp && p.season.sa);
    if (sk.length) {
      const cats = [
        ['Goals', p => p.season.g, v => v], ['Assists', p => p.season.a, v => v], ['Points', p => p.season.p, v => v],
        ['Penalty minutes', p => p.season.pim || 0, v => v], ['Plus-minus', p => p.season.pm, v => (v > 0 ? '+' : '') + v]
      ];
      h += sh('Team leaders') + '<section class="panel flush leaders">' + cats.map(([n, f, show]) => {
        const p = sk.slice().sort((a, b) => f(b) - f(a))[0];
        return '<button class="lead" data-p="' + p.id + '"><span class="lead-c">' + n + '</span>' + A.portrait(p, st.team, 30, rcol(p)) +
          '<span class="lead-n"><b>' + esc(last(p)) + '</b><i>' + p.pos + ' · ' + M.typeOf(p).ab + '</i></span><span class="lead-p">' + show(f(p)) + '</span></button>';
      }).join('') + (gs.length ? (() => {
        const g = gs.slice().sort((a, b) => (1 - b.season.ga / b.season.sa) - (1 - a.season.ga / a.season.sa))[0];
        return '<button class="lead" data-p="' + g.id + '"><span class="lead-c">Save %</span>' + A.portrait(g, st.team, 30, rcol(g)) +
          '<span class="lead-n"><b>' + esc(last(g)) + '</b><i>' + g.season.gp + ' GP · ' + g.season.w + ' W</i></span><span class="lead-p">' + (1 - g.season.ga / g.season.sa).toFixed(3).slice(1) + '</span></button>';
      })() : '') + '</section>';
    }
    return h;
  }

  function playoffPanel() {
    const st = ST.get(), po = st.playoff, d = ST.div();
    const names = ['Quarterfinal', 'Semifinal', 'Final'];
    let h = '<section class="panel po"><div class="eyebrow">Playoffs · best of ' + d.series + '</div>';
    h += '<div class="bracket">' + names.map((n, i) => '<div class="bk' + (i < po.round ? ' won' : i === po.round ? ' now' : '') + '">' + (i < po.round ? ic('check', 14) : '') + n + '</div>').join('') + '</div>';
    const opp = po.opp || { name: '—', abbr: '—' };
    h += '<div class="matchup"><div class="mu-side">' + badgeFor({ id: 'me' }, 44) + '<b>' + esc(st.team.abbr) + '</b><i>' + ST.ord(po.mySeed || 0) + ' seed</i></div>' +
      '<div class="mu-score"><div class="mu-lbl">Series · <em>' + (po.w > po.l ? 'You lead' : po.w < po.l ? 'You trail' : 'Tied') + '</em></div><b>' + po.w + '–' + po.l + '</b><div class="series-dots">' +
      Array.from({ length: d.series }, (_, i) => { const g = po.log[i]; return '<i class="' + (g ? (g.win ? 'w' : 'l') : '') + '"></i>'; }).join('') + '</div></div>' +
      '<div class="mu-side">' + A.teamBadge(opp.name, 44) + '<b>' + esc(opp.abbr) + '</b><i>' + ST.ord(po.oppSeed || 0) + ' seed</i></div></div>' +
      '<div class="mu-name">vs ' + esc(opp.name) + (po.bump ? ' · playing +' + po.bump + ' harder than in the season' : '') + '</div>';
    if (po.results && po.results.length) h += '<div class="mu-other">' + po.results.slice(-3).map(esc).join(' · ') + '</div>';
    const lv = G.CLOCK && G.CLOCK.current();
    if (lv && lv.pre.kind === 'playoff') {
      h += livePanel('Game ' + (lv.pre.game + 1), true) + '<button class="btn sm ghost skipf" data-act="poskip">' + ic('skip', 14) + ' Skip to final</button><div class="muted-c">The starter plays every playoff game.</div>';
    } else {
      h += (st.dev ? '<div class="dropdev"><button class="btn primary big" data-act="playoffgame">Drop the puck · Game ' + (po.log.length + 1) + '</button><button class="btn devb" data-act="poinstant">' + ic('skip', 16) + ' Skip</button></div>' : '<button class="btn primary big" data-act="playoffgame">Drop the puck · Game ' + (po.log.length + 1) + '</button>') +
        '<div class="muted-c">Playoff games never play while you are away.</div>';
    }
    return h + '</section>';
  }

  function livePanel(label, playoff) {
    const st = ST.get(), lv = G.CLOCK && G.CLOCK.current();
    return '<div class="live"><div class="lv-top">' +
      '<span class="lv-side">' + badgeFor({ id: 'me' }, 24) + '<b>' + esc(st.team.abbr) + '</b><em id="lvA">0</em></span>' +
      '<span class="lv-clock"><b id="lvPer">—</b><i id="lvTime"></i></span>' +
      '<span class="lv-side r"><em id="lvB">0</em><b>' + (lv ? esc(lv.pre.oppAbbr) : '—') + '</b>' + (lv ? A.teamBadge(lv.pre.oppName, 24) : '') + '</span></div>' +
      '<div class="lv-rink"><canvas id="lvCanvas" class="lv-canvas"></canvas><div id="lvPop" class="lv-pop" aria-live="polite"></div></div>' +
      '<div class="lv-bot"><span>' + esc(label) + (lv ? ' · ' + esc(lv.pre.oppName) : '') + '</span><b id="lvPP" class="lv-pp"></b><span id="lvShots" class="num"></span></div>' +
      '<div class="lv-log" id="lvLog"></div>' +
      (playoff ? '<table class="lv-per"><thead><tr><th></th><th>1st</th><th>2nd</th><th>3rd</th><th>OT</th><th>T</th></tr></thead><tbody id="lvPerT"></tbody></table>' : '') + '</div>';
  }
  let liveRaf = 0, logKey = '', popKey = '';
  const POP_WORDS = { hit: ['BIG HIT!', 'BOOM!', 'CRUNCH!', 'WHAM!', 'LIGHTS OUT!'], save: ['BIG SAVE!', 'ROBBED!', 'DENIED!', 'WHAT A SAVE!', 'STONEWALLED!'] };
  function popHTML(h) {
    const p = ST.byId(h.id); if (!p) return '';
    const w = POP_WORDS[h.k], word = h.word || w[Math.floor(h.t * 7) % w.length];
    const sub = h.k === 'save' ? ' · G' : h.k === 'goal' ? (h.tag === 'pp' ? ' · PPG' : h.tag === 'sh' ? ' · SHG' : ' · #' + (p.num || '')) : ' · #' + (p.num || '');
    return '<div class="hlpop pop-' + h.k + '"><span class="pop-face">' + A.portrait(p, team(), 42, rcol(p)) + '</span>' +
      '<span class="pop-burst"><b>' + word + '</b><i>' + esc(last(p)) + sub + '</i></span></div>';
  }
  // place the pop-up on the player it is about: face on the spot, burst toward the middle of the rink
  function placePop(el, a, at) {
    const pop = el.firstChild; if (!pop || !a || !at) return;
    const W = el.clientWidth, H = el.clientHeight, pw = pop.offsetWidth, ph = pop.offsetHeight, right = at.x > W / 2;
    pop.classList.toggle('r', right);
    let x = right ? at.x + 24 - pw : at.x - 24, y = at.y - ph / 2;
    x = Math.max(2, Math.min(W - pw - 2, x)); y = Math.max(2, Math.min(H - ph - 2, y));
    pop.style.left = Math.round(x) + 'px'; pop.style.top = Math.round(y) + 'px';
    pop.style.transformOrigin = (right ? 'right' : 'left') + ' center';
  }
  function liveLoop() {
    cancelAnimationFrame(liveRaf); logKey = ''; popKey = '';
    const frame = now => {
      const cv = $('#lvCanvas');
      if (!cv || tab !== 'season') return;
      const lv = G.CLOCK && G.CLOCK.current(), st = ST.get();
      if (lv) {
        const pre = lv.pre, tl = pre.tl, el = Date.now() - lv.start;
        let min, inter = null;
        if (pre.kind === 'playoff') { const c = G.LIVE.playoffClock(el, lv.dur, pre.res.ot); min = c.min; inter = c.inter; }
        else min = Math.min(tl.total, tl.total * el / lv.dur);
        const fin = min >= tl.total - 0.001, sc = G.LIVE.score(tl, min);
        const frac = Math.min(1, min / Math.max(60, tl.total));
        $('#lvA').textContent = sc.a; $('#lvB').textContent = sc.b;
        $('#lvPer').textContent = inter ? 'INT' : G.LIVE.period(min, tl).toUpperCase();
        $('#lvTime').textContent = inter ? 'after ' + ['', '1st', '2nd', '3rd'][inter] : G.LIVE.clock(min, tl);
        $('#lvShots').textContent = 'Shots ' + Math.round(pre.res.a.shots * frac) + '–' + Math.round(pre.res.b.shots * frac);
        const pens = tl.pens || [];
        const past = tl.ev.concat(pens.map(p => Object.assign({ pen: true }, p))).filter(e => e.t <= min).sort((x, y) => x.t - y.t);
        const key = past.length + '|' + pre.idx + pre.game;
        if (key !== logKey) {
          logKey = key;
          $('#lvLog').innerHTML = past.slice().reverse().map(e => '<div class="lg ' + (e.pen ? 'pen' : e.s) + '"><span>' + G.LIVE.stamp(e) + '</span><b>' + (e.s === 'a' ? esc(st.team.abbr) : esc(pre.oppAbbr)) + '</b><i>' +
            (e.pen ? (e.who ? esc(e.who) + ' · ' : '') + '2 min penalty' : e.s === 'a' ? esc(G.LIVE.goalLine(e)) : 'Goal' + (e.tag === 'pp' ? ' · PPG' : e.tag === 'sh' ? ' · SHG' : '')) + '</i></div>').join('');
        }
        const pt = $('#lvPerT');
        if (pt) {
          const r = G.LIVE.perScores(tl, min);
          const row = (name, i) => '<tr><td>' + esc(name) + '</td>' + r.map((x, p) => '<td>' + (min > p * 20 || x[i] ? x[i] : '·') + '</td>').join('') + '<td><b>' + (i ? sc.b : sc.a) + '</b></td></tr>';
          pt.innerHTML = row(st.team.abbr, 0) + row(pre.oppAbbr, 1);
        }
        // power play: who is short and how long is left
        const pen = !fin && !inter ? pens.find(p => min >= p.t && min < p.end) : null, ppEl = $('#lvPP');
        if (ppEl) { ppEl.textContent = pen ? (pen.s === 'b' ? 'POWER PLAY ' : 'PENALTY KILL ') + G.LIVE.mmss(pen.end - min) : ''; ppEl.className = 'lv-pp' + (pen ? (pen.s === 'b' ? ' pp' : ' pk') : ''); }
        const an = G.LIVE.draw(cv, { anim: now, min, tl, final: fin, inter, pen, c1: st.team.c1, c2: st.team.c2, oppAbbr: pre.oppAbbr });
        // pop-ups: your goals (how it went in), big hits, big saves
        let hl = null;
        if (!fin && !inter) {
          const g = tl.ev.find(e => e.s === 'a' && !e.so && e.scId && min >= e.t && min - e.t < 3);
          hl = g ? { k: 'goal', t: g.t, id: g.scId, word: g.kind, tag: g.tag } : (tl.hl || []).find(x => min >= x.t && min - x.t < 3) || null;
        }
        const pk = hl ? hl.k + hl.t : '';
        if (pk !== popKey) {
          popKey = pk; const el = $('#lvPop');
          if (el) { el.innerHTML = hl ? popHTML(hl) : ''; if (hl && an) placePop(el, an, hl.k === 'goal' ? an.net : hl.k === 'save' ? an.g : an.hit || an.pk); }
        }
      } else G.LIVE.draw(cv, { anim: now, min: 0, final: false, inter: 1, c1: st.team.c1, c2: st.team.c2 });
      liveRaf = requestAnimationFrame(frame);
    };
    liveRaf = requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------ OFFICE
  function renderOffice() {
    const st = ST.get(), bench = ST.bench();
    let h = '<div class="note top">The front office: build up the club, and turn spare players and gear into something useful.</div>';
    const fmax = ST.facMax();
    h += sh(ic('office', 18) + ' Facilities', '<span class="sec-note">Max level ' + fmax + ' in Division ' + st.div + '</span>');
    h += '<section class="panel flush facs">' + D.FACILITIES.map(f => {
      const lv = ST.facLvl(f.k), cost = ST.facCost(f.k), top = lv >= fmax;
      return '<div class="fac"><span class="fac-ic">' + ic(f.ic, 20) + '</span><span class="fac-t"><b>' + f.n + ' <em>Lv ' + lv + '</em></b>' +
        '<i>' + f.d.replace('{v}', ST.facVal(f.k)) + (top ? '' : ' · next ' + (f.k === 'scout' ? '+' + f.per * (lv + 1) : f.per * (lv + 1) + '%')) + '</i>' +
        '<span class="fac-bar">' + Array.from({ length: fmax }, (_, i) => '<i class="' + (i < lv ? 'on' : '') + '"></i>').join('') + '</span></span>' +
        '<button class="buy" data-fac="' + f.k + '"' + (top || st.pucks < cost ? ' disabled' : '') + '>' + (top ? 'Max' : fmt(cost)) + '</button></div>';
    }).join('') + '</section><div class="note">Each promotion raises the facility cap by 2. Costs climb steeply, so pick what matters to you.</div>';
    h += sh(ic('swap', 18) + ' Trade desk', '<span class="sec-note">Bench players for draft picks</span>');
    h += '<section class="panel flush trades">' + ST.TRADES.map((t, i) => {
      const all = bench.filter(p => p.rarity === t.r), have = all.filter(ST.tradeable).length, rc = A.rarityColor(t.r);
      const lockN = all.length - have;
      return '<div class="tr"><span class="tr-in">' + Array.from({ length: t.n }, () => '<i style="background:' + rc + '"></i>').join('') + '</span>' +
        '<span class="tr-t"><b>' + t.n + ' ' + D.RARITY[D.RIDX[t.r]].n.toLowerCase() + ' player' + (t.n > 1 ? 's' : '') + '</b><i>' + have + ' tradeable on the bench' + (lockN ? ' · ' + lockN + ' locked' : '') + '</i></span>' +
        ic('chev', 14, 'dimc') + '<span class="tr-out"' + (t.legend ? ' style="color:' + rc + '"' : '') + '>' + (t.legend ? '1 Legend' : ST.ord(t.round)) + '</span>' +
        '<span class="tr-b"><button class="buy" data-trade="' + i + '"' + (have >= t.n ? '' : ' disabled') + '>Trade</button>' + (!t.legend && have >= t.n * 2 ? '<button class="buy" data-batch="' + i + '">All ×' + Math.floor(have / t.n) + '</button>' : '') + '</span></div>';
    }).join('') + '</section><div class="note">Fair rates: 1 uncommon = a 6th, 1 rare = a 4th, 1 epic = a 2nd, and two picks of a round combine into one a round higher. Three Legendaries buy one Legendary of the country and position you pick. Only bench players can be traded; lock a player on his card to keep him off the desk. Gear and traits go back to your locker.</div>';

    h += sh(A.gearIcon('stick', 'currentColor', 18) + ' Spare gear: salvage and fuse', '<span class="sec-note">' + st.gear.length + ' spare pieces</span>');
    const as = st.autoScrap == null ? -1 : st.autoScrap;
    h += '<section class="panel autoscrap"><div class="as-h"><b>Auto-scrap new drops</b><i>' + (st.scrapped ? st.scrapped + ' scrapped so far' : 'Turned into tape the moment they drop') + '</i></div>' +
      '<div class="chips">' + [[-1, 'Off'], [0, 'Common'], [1, 'Uncommon & below'], [2, 'Rare & below']].map(([v, n]) =>
        '<button class="chip' + (as === v ? ' on' : '') + '" data-ascrap="' + v + '">' + n + '</button>').join('') + '</div>' +
      '<label class="chk"><input type="checkbox" id="autoUp"' + (st.autoUp ? ' checked' : '') + '><span>' + ic('check', 12) + '</span>Auto-fuse: every 5 spares of a rarity fuse into 1 of the next</label></section>';
    h += '<section class="panel flush bulk">' + D.RARITY.map((r, i) => {
      const list = st.gear.filter(g => g.rarity === r.k);
      if (!list.length) return '';
      const tape = list.reduce((s, g) => s + (i + 1) * 5 + (g.level || 0) * 3, 0);
      return '<div class="bk-row"><span class="dot" style="background:' + r.color + '"></span><span class="bk-t"><b>' + list.length + ' ' + r.n.toLowerCase() + '</b><i>' + tape + ' tape if salvaged</i></span>' +
        '<button class="buy" data-salvall="' + r.k + '">Salvage all</button>' +
        (i < 4 ? '<button class="buy" data-tradeup="' + r.k + '"' + (list.length >= 5 ? '' : ' disabled') + '>5 → 1 ' + D.RARITY[i + 1].n.toLowerCase() + '</button>' : '') + '</div>';
    }).join('') + (st.gear.length ? '' : '<div class="empty">' + ic('gear', 22) + '<span>No spare gear in the locker.</span></div>') + '</section>' +
      '<div class="note">Salvage turns spares into tape. <b>Fuse 5</b> is free: your five weakest spares of a rarity, any slots, become one piece of the next rarity in the slot your team needs most. <b>Matched fusing</b> below costs tape but keeps the slot you choose.</div>';

    const fg = ST.fuseGroups();
    h += sh(ic('fuse', 18) + ' Matched fusing', '<span class="sec-note">' + ic('tape', 12) + ' ' + fmt(st.tape) + ' tape</span>');
    h += '<section class="panel">' + (fg.length ? fg.map(f => {
      const r = D.RARITY[D.RIDX[f.rarity]], nx = D.RARITY[D.RIDX[f.rarity] + 1], slot = D.GEAR_SLOTS[f.kind].find(s => s.k === f.slot);
      return '<div class="fuse-row"><span class="fuse-in">' + [0, 1, 2].map(() => A.gearIcon(f.slot, r.color, 22)).join('') + '</span>' + ic('chev', 16, 'dimc') +
        '<span class="fuse-out" style="--rc:' + nx.color + '">' + A.gearIcon(f.slot, nx.color, 30) + '</span>' +
        '<span class="fuse-t"><b>' + nx.n + ' ' + slot.n + '</b><i>same slot, fresh roll · you hold ' + f.count + '</i></span>' +
        '<button class="buy" data-fuse="' + f.key + '"' + (st.tape < f.cost ? ' disabled' : '') + '>' + f.cost + ' tape</button></div>';
    }).join('') : '<div class="empty">' + ic('fuse', 26) + '<span>Nothing to match yet. Three spare pieces of the same rarity and slot fuse into one of the next rarity in that same slot, for tape. (Fuse 5 above works on any mix of slots.) To turn bench players into something, use the Trade desk above.</span></div>') + '</section>';

    h += sh(ic('shard', 18) + ' Shard exchange', '<span class="sec-note">40 tape → 5 shards</span>');
    h += '<div class="xgrid">' + ['F', 'D', 'G'].map(k => '<button class="xtile" data-tape="' + k + '"' + (st.tape < 40 ? ' disabled' : '') + ' style="--pc:' + POOLC[k] + '">' + ic('shard', 26) + '<b>+5 ' + POOLN[k] + '</b><i>40 tape</i></button>').join('') + '</div>';
    h += '<div class="xgrid">' + ['F', 'D', 'G'].map(k => { const c = ST.shardPrice(); return '<button class="xtile" data-buyshard="' + k + '"' + (st.pucks < c ? ' disabled' : '') + ' style="--pc:' + POOLC[k] + '">' + ic('puck', 22) + '<b>+5 ' + POOLN[k] + '</b><i>' + fmt(c) + ' pucks</i></button>'; }).join('') + '</div>' +
      '<div class="note">Buying shards with pucks gets 10% pricier with each purchase and resets every season.</div>';
    return h;
  }

  // ------------------------------------------------------------ STORE
  function renderStore() {
    const st = ST.get();
    refreshShop();
    ST.refreshAgents();
    const left = Math.max(0, 4 * 3600e3 - (Date.now() - st.shopAt));
    const restock = '<span class="sec-note">Restocks in ' + Math.floor(left / 3600e3) + 'h ' + Math.floor(left % 3600e3 / 60e3) + 'm</span>';
    let h = sh(ic('team', 18) + ' Free agents', restock);
    h += '<div class="fa">' + st.fa.map((a, i) => {
      const p = a.p, rc = A.rarityColor(p.rarity), nat = natOf(p);
      return '<div class="fa-card"><span class="pt-face">' + A.portrait(p, { c1: '#3c4a5e', c2: '#d6dde6', c3: '#111' }, 48, rc) + ovr(p) + '</span>' +
        '<div class="fa-t"><span class="rpill" style="--rc:' + rc + '">' + D.RARITY[D.RIDX[p.rarity]].n + '</span><b>' + esc(p.name) + '</b>' +
        '<i>' + p.pos + ' · ' + esc(M.typeOf(p).n) + ' · ' + flag(p.nat, 14) + ' ' + nat.n + '</i></div>' +
        (a.sold ? '<span class="gc-sold">Signed</span>' : '<button class="buy" data-fa="' + i + '"' + (st.pucks < a.cost ? ' disabled' : '') + '>' + ic('puck', 12) + fmt(a.cost) + '</button>') + '</div>';
    }).join('') + '</div>';

    const cap = ST.maxRarity();
    h += sh(ic('token', 18) + ' Draft picks', ST.pickCount() > 1 ? '<button class="btn sm primary" data-act="draftall">' + ic('token', 14) + ' Draft all ' + ST.pickCount() + '</button>' : '<span class="sec-note">1st-round Legendary chance: ' + ST.pickOdds(1)[4] + '%</span>');
    h += '<section class="panel flush draft">' + [1, 2, 3, 4, 5, 6, 7].map(r => {
      const n = (st.picks && st.picks[r]) || 0, odds = ST.pickOdds(r);
      return '<div class="dp' + (n ? '' : ' none') + '"><span class="dp-r"><b>' + r + '</b><i>' + ST.ord(r).replace(/\d+/, '') + '</i></span>' +
        '<span class="dp-m"><span class="odds">' + odds.map((o, i) => o ? '<i style="width:' + o + '%;background:' + D.RARITY[i].color + '"></i>' : '').join('') + '</span>' +
        '<span class="odds-l">' + odds.map((o, i) => o ? '<em style="color:' + D.RARITY[i].color + '">' + D.RARITY[i].n + ' ' + o + '%</em>' : '').join('') + '</span></span>' +
        '<span class="dp-a"><span class="dp-n">×' + n + '</span><button class="buy' + (n ? ' primary' : '') + '" data-draft="' + r + '"' + (n ? '' : ' disabled') + '>Draft</button>' +
        (r > 1 && n >= 2 ? '<button class="buy" data-combine="' + r + '">2 → ' + ST.ord(r - 1) + '</button>' : '') + '</span></div>';
    }).join('') + '</section><div class="note">Prospects are rated against your team: a 1st-rounder is about 4 to 8 better than your average, a 7th-rounder about 4 to 8 worse, and nobody arrives far above your division’s top. Scouts lean toward your weakest starter’s position. Rarity odds improve each division you climb; a 1st-round pick always has a Legendary chance (1% in Division 8, up to 20% in Division 1).</div>';

    h += sh(ic('bolt', 18) + ' Boosts', '<span class="sec-note">Earned from rewards or bought here</span>');
    h += '<section class="panel flush boosts">' + D.BOOSTS.map(b => {
      const own = st.boosts[b.k] || 0, act = ST.activeBoosts().find(x => x.k === b.k);
      return '<div class="bo"><span class="bo-ic">' + ic(b.income ? 'puck' : 'bolt', 20) + '</span><span class="bo-t"><b>' + b.n + '</b><i>' + b.d + ' · ' + b.mins + ' min</i>' +
        (act ? '<i class="on">Active · ' + Math.ceil((act.until - Date.now()) / 60e3) + ' min left</i>' : '') + '</span>' +
        '<button class="buy" data-buyboost="' + b.k + '"' + (st.pucks < ST.boostCost(b.k) ? ' disabled' : '') + '>' + ic('puck', 12) + fmt(ST.boostCost(b.k)) + '</button>' +
        '<button class="buy primary" data-boost="' + b.k + '"' + (own ? '' : ' disabled') + '>Use (' + own + ')</button></div>';
    }).join('') + '</section>';

    h += sh(ic('store', 18) + ' Gear market', restock);
    h += '<section class="panel flush gm">' + st.shop.map((it, i) => {
      const g = it.g, r = D.RARITY[D.RIDX[g.rarity]], slot = D.GEAR_SLOTS[g.kind].find(s => s.k === g.slot);
      return '<div class="gm-row"><span class="gm-ic" style="--rc:' + r.color + '">' + A.gearIcon(g.slot, r.color, 24) + '</span>' +
        '<span class="gm-t"><b>' + r.n + ' ' + slot.n + (g.kind === 'goalie' ? ' (G)' : '') + '</b><i>+' + g.p + ' ' + D.ATTR_LABEL[slot.p] + (g.s ? ' · +' + g.s + ' ' + D.ATTR_LABEL[slot.s] : '') + '</i></span>' +
        (it.sold ? '<span class="muted">Sold</span>' : '<button class="buy" data-shop="' + i + '"' + (st.pucks < it.cost ? ' disabled' : '') + '>' + ic('puck', 12) + fmt(it.cost) + '</button>') + '</div>';
    }).join('') + '</section>';

    if (st.dev) h += sh(ic('wrench', 18) + ' Developer') + '<section class="panel dev"><p>Testing tools. Not part of the real game.</p>' +
      '<button class="btn" data-act="devgrant">' + ic('plus', 15) + ' Add currencies</button></section>';
    h += sh(ic('heart', 18) + ' Support the game') + '<section class="panel support"><p>Nothing here changes a result. The clock is not for sale.</p>' +
      '<button class="btn" data-act="iap"' + (st.doubler ? ' disabled' : '') + '>' + (st.doubler ? ic('check', 16) + ' Puck doubler owned' : 'Puck doubler · permanent 2× income') + '</button></section>';
    return h;
  }
  function refreshShop() {
    const st = ST.get(), now = Date.now();
    if (!st.shop || st.shop.length !== 3 || now - st.shopAt > 4 * 3600 * 1000) {
      const i = D.DIVISIONS.findIndex(x => x.d === st.div);
      ST.refreshAgents(true);
      st.shop = [];
      for (let n = 0; n < 3; n++) {
        const w = [[60, 40, 0, 0, 0], [40, 46, 14, 0, 0], [24, 44, 28, 4, 0], [12, 38, 40, 10, 0], [6, 28, 44, 20, 2], [3, 18, 42, 32, 5], [1, 10, 34, 44, 11], [1, 5, 24, 48, 22]][i];
        const rk = D.RARITY[M.weightedIndex(w)].k;
        const g = M.makeGear(rk, M.rand() < 0.1 ? 'goalie' : 'skater');
        st.shop.push({ g, cost: Math.round((180 + g.p * 55) * Math.pow(1.5, D.RIDX[rk]) * ST.payout()), sold: false });
      }
      st.shopAt = now;
    }
  }

  // ------------------------------------------------------------ TROPHIES
  function renderTrophies() {
    const st = ST.get();
    let h = '';
    const dd = ST.dailyState();
    h += '<button class="dailyrow' + (dd.ready ? ' ready' : '') + '" data-act="daily">' + ic('season', 22) + '<span><b>Daily rewards</b><i>' +
      (dd.ready ? 'Day ' + dd.day + ' is ready to claim' : 'Day ' + dd.claimed + ' of 7 claimed · next one tomorrow') + '</i></span>' + ic('chev', 16, 'dimc') + '</button>';
    h += sh(ic('trophy', 18) + ' Franchise achievements', '<span class="sec-note">Never reset · pick Hall of Fame gear or a trait</span>');
    h += '<section class="panel flush fach">' + ST.FACH.map(a => {
      const got = (st.fach && st.fach[a.k]) || 0, need = ST.fachNeed(a, got), v = ST.fachValue(a.k), done = need == null, can = !done && v >= need;
      return '<div class="fa-r"><span class="fa-ic">' + ic('trophy', 20) + '</span><span class="fa-t"><b>' + a.n + ' <em>' + (a.repeat ? '×' + got : got + '/' + a.tiers.length) + '</em></b><i>' + a.d + ' · ' + fmt(v) + (done ? '' : ' / ' + fmt(need)) + '</i>' +
        '<span class="cg-bar"><i style="width:' + (done ? 100 : Math.min(100, 100 * v / need)) + '%"></i></span></span>' +
        (done ? '<span class="fa-done">' + ic('check', 16) + '</span>' : '<button class="buy' + (can ? ' primary' : '') + '" data-fach="' + a.k + '"' + (can ? '' : ' disabled') + '>Claim</button>') + '</div>';
    }).join('') + '</section>';
    const ready = st.achClaim || [];
    h += sh(ic('medal', 18) + ' Ready to claim', '<span class="sec-note">' + ready.length + ' waiting</span>');
    h += ready.length ? '<section class="panel flush claims">' + ready.map((c, i) => {
      const a = D.ACHIEVEMENTS.find(x => x.k === c.k);
      return '<div class="cl"><span class="cl-ic">' + ic('medal', 22) + '</span><span class="cl-t"><b>' + a.n + '</b><i>Reached ' + c.t + '</i></span><button class="buy primary" data-claim="' + i + '">Claim</button></div>';
    }).join('') + '</section>' : '<div class="empty">' + ic('medal', 24) + '<span>Nothing to claim. Reached achievements show up here and pay a reward pick when you claim them.</span></div>';

    h += sh(ic('star', 18) + ' Achievements') + '<div class="achs">';
    D.ACHIEVEMENTS.forEach(a => {
      const lv = st.ach[a.k] || 0, done = lv >= a.tiers.length;
      h += '<div class="ach' + (lv ? ' got' : '') + '"><span class="ach-ic">' + ic(done ? 'trophy' : 'star', 18) + '</span><b>' + a.n + '</b>' +
        '<i>' + (done ? 'Complete' : 'Next: ' + a.tiers[lv]) + '</i><span class="ach-pips">' + a.tiers.map((t, i) => '<em class="' + (i < lv ? 'on' : '') + '"></em>').join('') + '</span></div>';
    });
    h += '</div>';

    const won = [];
    st.history.forEach(s => (s.awards || []).forEach(a => { if (a.winner.mine) won.push({ a, s }); }));
    h += sh(ic('trophy', 18) + ' Trophy case', '<span class="sec-note">' + won.length + ' won</span>');
    h += won.length ? '<div class="awards">' + won.map(({ a, s }) => {
      const p = st.team.roster.find(x => x.id === a.winner.pid);
      return '<div class="aw mine"><span class="aw-ic">' + ic(a.icon, 20) + '</span><span class="aw-t"><b>' + a.n + '</b><i>' + esc(a.winner.name) + ' · ' + esc(a.winner.stat || '') + ' · F' + (s.fr || 1) + ' S' + s.season + ' ' + esc(s.divName) + '</i></span>' +
        (p ? A.portrait(p, st.team, 34, rcol(p)) : '') + '</div>';
    }).join('') + '</div>' : '<div class="empty">' + ic('trophy', 24) + '<span>Season awards are handed out after every season. Winners also earn a permanent stat bonus.</span></div>';
    const cups = st.history.filter(s => s.result === 'Champion');
    if (cups.length) h += sh('Banners') + '<div class="wall">' + cups.map(s => '<div class="banner"><span>' + ic('trophy', 22) + '</span><b>' + esc(s.divName) + '</b><i>Franchise ' + (s.fr || 1) + ' · Season ' + s.season + '</i></div>').join('') + '</div>';
    return h;
  }

  // ------------------------------------------------------------ modals
  let armedAt = 0;
  function openModal(html, lock) {
    $('#sheet').innerHTML = html; $('#sheet').dataset.pid = '';
    $('#modal').classList.remove('hidden');
    $('#modal').classList.toggle('locked', !!lock);
    $('#sheet').scrollTop = 0;
    // reward and results sheets ignore taps for a moment so a fast thumb cannot skip them
    armedAt = lock ? Date.now() + 650 : 0;
    $('#sheet').classList.toggle('arming', !!lock);
    if (lock) setTimeout(() => $('#sheet').classList.remove('arming'), 650);
    placeSheetX();
  }
  // a close button that stays on screen while a long sheet is scrolled (the sheet's own X scrolls away)
  function placeSheetX() {
    const x = $('#sheetX'), sh = $('#sheet'); if (!x || !sh) return;
    if (!x.firstChild) x.innerHTML = ic('close', 16);
    const show = modalOpen() && !locked() && sh.scrollTop > 50;
    x.classList.toggle('hidden', !show);
    if (show) { const r = sh.getBoundingClientRect(); x.style.top = Math.max(8, r.top + 10) + 'px'; x.style.right = Math.max(8, window.innerWidth - r.right + 10) + 'px'; }
  }
  document.addEventListener('DOMContentLoaded', () => { const sh = $('#sheet'); if (sh) sh.addEventListener('scroll', placeSheetX, { passive: true }); window.addEventListener('resize', placeSheetX); });
  function closeModal() { $('#modal').classList.add('hidden'); $('#sheetX').classList.add('hidden'); $('#modal').classList.remove('locked'); setTimeout(maybeSheets, 200); }
  function modalOpen() { return !$('#modal').classList.contains('hidden'); }
  function locked() { return $('#modal').classList.contains('locked'); }
  function arming() { return Date.now() < armedAt; }
  function sheetHead(title, sub, close) {
    return '<div class="sheet-h"><div><h2 class="sheet-t">' + title + '</h2>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' +
      (close ? '<button class="xbtn" ' + close + ' aria-label="Close">' + ic('close', 16) + '</button>' : '') + '</div>';
  }

  function playerSheet(id) {
    const st = ST.get(), p = st.team.roster.find(x => x.id === id);
    if (!p) return;
    const isG = p.pos === 'G', keys = isG ? D.GOALIE_ATTRS : D.SKATER_ATTRS;
    const nat = natOf(p), ri = D.RIDX[p.rarity], next = D.RARITY[ri + 1], pool = poolOf(p), rc = rcol(p), ty = M.typeOf(p);
    let h = '<div class="phero" style="--rc:' + rc + '"><button class="xbtn phero-x" data-act="close" aria-label="Close">' + ic('close', 16) + '</button>' +
      '<div class="phero-face">' + A.portrait(p, st.team, 104, rc) + '</div>' +
      '<div class="phero-main"><span class="rpill" style="--rc:' + rc + '">' + rname(p) + '</span> <span class="tpill">' + esc(ty.n) + '</span> <button class="lockbtn' + (p.locked ? ' on' : '') + '" data-lock="' + p.id + '" aria-label="Trade lock">' + ic('lock', 12) + '<span>' + (p.locked ? 'Locked' : 'Lock') + '</span></button>' +
      '<div class="phero-first">' + esc(first(p)) + '</div><h2 class="phero-last">' + esc(last(p)) + '</h2>' +
      '<div class="phero-meta"><b>#' + p.num + '</b> · ' + p.pos + ' · ' + flag(p.nat, 16) + ' ' + nat.n + '</div><div class="phero-body">' + M.heightText(p.ht) + ' · ' + p.wt + ' lb</div></div>' +
      '<div class="phero-ovr">' + ovr(p, true) + '<i>overall</i></div></div>';
    h += '<div class="note how">' + ic('team', 14) + ' ' + esc(p.how || 'Founding roster, season 1') + '</div>';
    if (p.awards && p.awards.length) {
      // one chip per award, with how many times he won it
      const grp = {};
      p.awards.forEach(a => { (grp[a.k] = grp[a.k] || { n: a.n, k: a.k, list: [] }).list.push(a); });
      h += '<div class="ptro">' + Object.values(grp).sort((a, b) => b.list.length - a.list.length).map(g => {
        const def = ST.AWARDS.find(x => x.k === g.k) || { icon: 'trophy' }, lastA = g.list[g.list.length - 1];
        return '<span class="ptro-b">' + ic(def.icon, 14) + g.n + (g.list.length > 1 ? ' <b>×' + g.list.length + '</b>' : '') + '<i>' + (g.list.length > 1 ? 'last ' : '') + 'F' + (lastA.fr || 1) + ' S' + lastA.season + '</i></span>';
      }).join('') + '</div>';
    }
    h += '<div class="quad">' + (isG
      ? '<div><b>' + p.career.gp + '</b><i>games</i></div><div><b>' + p.career.w + '</b><i>wins</i></div><div><b>' + p.career.so + '</b><i>shutouts</i></div><div><b>' + (p.career.sa ? (1 - p.career.ga / p.career.sa).toFixed(3).slice(1) : '—') + '</b><i>SV%</i></div>'
      : '<div><b>' + p.career.gp + '</b><i>games</i></div><div><b>' + p.career.g + '</b><i>goals</i></div><div><b>' + p.career.a + '</b><i>assists</i></div><div><b>' + p.career.p + '</b><i>points</i></div>') + '</div>';

    h += '<div class="sec-h in"><h2>Attributes</h2><span class="sec-note">' + pucks(st.pucks) + '</span></div><div class="attrs">';
    keys.forEach(k => {
      const base = p.a[k], e = M.eff(p, k), cap = M.attrCap(p, k), tro = ((p.tb && p.tb[k]) || 0) + (p.legacyB || 0), bonus = e - base - tro;
      const cost = M.upgradeCost(base), maxed = base >= cap;
      const tag = ty.str.indexOf(k) >= 0 ? '<sup class="str">▲</sup>' : ty.weak.indexOf(k) >= 0 ? '<sup class="weak">▼</sup>' : '';
      h += '<div class="attr"><span class="attr-n">' + D.ATTR_LABEL[k] + tag + '</span>' +
        '<span class="attr-bar"><i style="width:' + Math.min(100, base) + '%"></i>' +
        (bonus > 0 ? '<u style="left:' + Math.min(100, base) + '%;width:' + Math.max(0, Math.min(100 - Math.min(100, base), bonus)) + '%"></u>' : '') +
        (tro ? '<u class="tro" style="left:' + Math.min(100, base + Math.max(0, bonus)) + '%;width:' + Math.max(0, Math.min(100 - Math.min(100, base + Math.max(0, bonus)), tro)) + '%"></u>' : '') +
        '<em style="left:' + cap + '%" title="cap ' + cap + '"></em></span>' +
        '<span class="attr-v">' + base + (bonus > 0 ? '<small>+' + bonus + '</small>' : '') + (tro ? '<small class="tro">+' + tro + '</small>' : '') + '</span>' +
        '<button class="buy" data-up="' + k + '" data-pid="' + p.id + '"' + (maxed || st.pucks < cost ? ' disabled' : '') + '>' + (maxed ? 'MAX ' + cap : ic('puck', 12) + fmt(cost)) + '</button></div>';
    });
    h += '</div>';
    const allCost = keys.reduce((s, k) => s + (p.a[k] < M.attrCap(p, k) ? M.upgradeCost(p.a[k]) : 0), 0);
    if (allCost) h += '<button class="btn primary" data-trainall="' + p.id + '"' + (st.pucks < allCost ? ' disabled' : '') + '>' + ic('dumbbell', 16) + ' Train every attribute +1 · ' + fmt(allCost) + '</button>';
    h += '<div class="legend"><span><i class="lg-t"></i>trained</span><span><i class="lg-g"></i>gear, boosts</span><span><i class="lg-tr"></i>trophies, legacy</span><span><i class="lg-c"></i>cap</span><span><sup class="str">▲</sup> strength</span><span><sup class="weak">▼</sup> weakness</span></div>';
    if (p.legacyB) h += '<div class="tbonus">' + ic('trophy', 16) + '<span><b>Legacy +' + p.legacyB + '</b> to every attribute, earned by carrying him into a new franchise. Legacy players come back Legendary, so they can grow all the way.</span></div>';
    const tb = Object.keys(p.tb || {}).filter(k => p.tb[k]);
    if (tb.length) h += '<div class="tbonus">' + ic('trophy', 16) + '<span><b>Trophy stats</b> (up to 5 wins per award count)<br>' + Object.keys(p.tbc || {}).filter(k => p.tbc[k]).map(k => { const aw = ST.AWARDS.find(x => x.k === k), b = D.TROPHY_BONUS[k] || {}; return esc(aw ? aw.n : k) + ' ×' + p.tbc[k] + ': ' + Object.keys(b).filter(a => p.a[a] != null).map(a => '+' + b[a] * p.tbc[k] + ' ' + D.ATTR_LABEL[a]).join(', '); }).join('<br>') + '</span></div>';

    h += '<div class="sec-h in"><h2>Rarity</h2><span class="sec-note">Promotion raises caps only</span></div><div class="ladder">' + D.RARITY.map((r, i) =>
      '<span class="lr' + (i < ri ? ' past' : i === ri ? ' cur' : '') + (i > ST.promoCap() ? ' locked' : '') + '" style="--rc:' + r.color + '"><i></i><b>' + r.n + '</b><em>' + (i === 4 && ri < 4 ? 'acquire' : r.cap) + '</em></span>').join('') + '</div>';
    if (next && ST.canPromote(p)) {
      const have = st.shards[pool], need = ST.promoCost(p), can = have >= need;
      h += '<div class="promo"><div class="promo-bar"><i style="width:' + Math.min(100, 100 * have / need) + '%;background:' + POOLC[pool] + '"></i></div>' +
        '<div class="promo-row"><span>' + shardIc(pool, 14) + ' ' + have + ' / ' + need + ' ' + POOLN[pool].toLowerCase() + ' shards</span>' +
        '<button class="btn sm' + (can ? ' primary' : '') + '" data-promote="' + p.id + '"' + (can ? '' : ' disabled') + '>Promote to ' + next.n + '</button></div>' +
        '<div class="note">Caps rise to ' + next.cap + ' for strengths. Stats stay where they are.' + (isG ? ' Goalies cost 1.5× shards.' : '') + '</div></div>';
    } else if (next && ri >= 3) {
      const b = (p.capB || 0) / 2, have = st.shards[pool];
      h += '<div class="promo brk"><div class="brk-h"><b>Breakthroughs ' + b + ' / ' + ST.BREAK_MAX + '</b><i>Each breakthrough raises every cap by about 2 (strengths up to 99, weaker skills less, by type)</i></div>' +
        '<div class="fac-bar">' + Array.from({ length: ST.BREAK_MAX }, (_, i) => '<i class="' + (i < b ? 'on' : '') + '"></i>').join('') + '</div>';
      if (ST.canBreak(p)) {
        const need = ST.breakCost(p), can = have >= need;
        h += '<div class="promo-row"><span>' + shardIc(pool, 14) + ' ' + have + ' / ' + need + ' ' + POOLN[pool].toLowerCase() + ' shards</span>' +
          '<button class="btn sm' + (can ? ' primary' : '') + '" data-break="' + p.id + '"' + (can ? '' : ' disabled') + '>Break through</button></div>';
      }
      h += '<div class="note">Epic is as far as promotion goes. Breakthroughs let a player you love keep climbing. <b style="color:' + D.RARITY[4].color + '">Legendary</b> players come from the draft, free agency, title packs and the three-for-one trade.</div>' +
        '<div class="legbuy"><div><b>Legend upgrade</b><i>Make ' + esc(last(p)) + ' Legendary right now: Legendary caps (strengths up to 99, weaker skills lower by type) and two trait slots.</i></div>' +
        '<button class="btn sm gold" data-legbuy="' + p.id + '">$0.99</button></div></div>';
    }
    else if (next) h += '<div class="note">Division ' + st.div + ' allows promotions up to ' + D.RARITY[ST.promoCap()].n + '. Move up a division to go further.</div>';
    else h += '<div class="note">Top tier. Train to 99 and gear past it to reach <b style="color:var(--gold)">HoF</b>.</div>';

    h += '<div class="sec-h in"><h2>Equipment</h2><span class="sec-note">Gear stacks on top of the cap</span></div><div class="slots">';
    D.GEAR_SLOTS[isG ? 'goalie' : 'skater'].forEach(s => {
      const g = p.gear[s.k], col = g ? A.gearColor(g) : 'var(--line2)';
      h += '<div class="slot' + (g ? '' : ' empty') + '" style="--rc:' + col + '"><button class="slot-main" data-gslot="' + s.k + '" data-pid="' + p.id + '">' + A.gearIcon(s.k, g ? col : 'var(--dim2)', 32) +
        '<b>' + s.n + '</b><i>' + (g ? '+' + M.gearBonus(g) + ' ' + D.ATTR_LABEL[s.p] + (g.s ? ' · +' + g.s + ' ' + D.ATTR_LABEL[s.s] : '') : 'Empty · tap to equip') + '</i></button></div>';
    });
    h += '</div>';
    const slots = M.xfSlots(p);
    h += '<div class="sec-h in"><h2>Traits</h2><span class="sec-note">' + (slots ? slots + ' slot' + (slots > 1 ? 's' : '') : 'Unlocks at Rare') + '</span></div>';
    if (!slots) h += '<div class="empty">' + ic('lock', 20) + '<span>Rare and Epic players get one trait slot. Legendary players get two.</span></div>';
    [1, 2].slice(0, slots).forEach(n => {
      const key = n === 2 ? p.xf2 : p.xf, xf = key && D.XFACTORS.find(x => x.k === key);
      h += '<button class="xfslot" data-xf="' + p.id + '" data-xslot="' + n + '" style="--rc:' + (xf ? A.rarityColor(xf.r) : 'var(--line2)') + '"><span class="xf-ic">' + ic('bolt', 22) + '</span>' +
        '<span><b>' + (xf ? xf.n : 'Empty slot') + '</b><i>' + (xf ? esc(xf.d) : 'Traits are Hall of Fame rewards from franchise achievements.') + '</i></span>' + ic('chev', 16, 'dimc') + '</button>';
    });
    if (p.history.length) {
      h += '<div class="sec-h in"><h2>Season by season</h2></div><div class="scroll-x"><table class="hist"><thead><tr><th>Sn</th><th>Div</th><th>OVR</th>' +
        (isG ? '<th>GP</th><th>W</th><th>SV%</th><th>SO</th>' : '<th>GP</th><th>G</th><th>A</th><th>P</th><th>PIM</th>') + '</tr></thead><tbody>' +
        p.history.slice().reverse().map(x => '<tr><td>' + ((x.fr || 1) > 1 ? 'F' + x.fr + ' ' : '') + x.season + '</td><td>' + x.div + '</td><td>' + (x.ovr0 != null ? x.ovr0 + '→' + x.ovr1 : '—') + '</td>' +
          (isG ? '<td>' + x.line.gp + '</td><td>' + x.line.w + '</td><td>' + (x.line.sa ? (1 - x.line.ga / x.line.sa).toFixed(3).slice(1) : '—') + '</td><td>' + x.line.so + '</td>'
            : '<td>' + x.line.gp + '</td><td>' + x.line.g + '</td><td>' + x.line.a + '</td><td><b>' + x.line.p + '</b></td><td>' + (x.line.pim || 0) + '</td>') + '</tr>').join('') + '</tbody></table></div>';
    }
    h += '<div class="grid2 foot"><button class="btn" data-rename="' + p.id + '">' + ic('edit', 16) + ' Name &amp; look</button>' +
      '<button class="btn" data-act="swapmode" data-pid="' + p.id + '">' + ic('swap', 16) + ' Move in lineup</button></div>';
    // re-rendering the same player (train, promote, equip) keeps your place on the card so you can tap repeatedly
    const sh = $("#sheet"), same = modalOpen() && sh.dataset.pid === id, top = sh.scrollTop;
    openModal(h); sh.dataset.pid = id;
    if (same) { sh.scrollTop = top; sh.style.animation = "none"; } else sh.style.animation = "";
  }

  let lookDraft = null, lookPid = null;
  function renameSheet(pid) {
    const p = ST.get().team.roster.find(x => x.id === pid); if (!p) return;
    lookPid = pid; lookDraft = Object.assign({}, A.lookOf(p));
    const isG = p.pos === 'G';
    const sw = (key, cols) => '<div class="lk-sw">' + cols.map((c, i) => '<button class="lk-c' + (lookDraft[key] === i ? ' on' : '') + '" data-look="' + key + '" data-val="' + i + '" style="background:' + c + '" aria-label="' + key + ' ' + (i + 1) + '"></button>').join('') + '</div>';
    const chips = (key, list, names) => '<div class="chips lk-ch">' + list.map(v => '<button class="chip' + (lookDraft[key] === v ? ' on' : '') + '" data-look="' + key + '" data-val="' + v + '">' + names[v] + '</button>').join('') + '</div>';
    let look = '<div class="sec-h in"><h2>Look</h2><span class="sec-note">' + (isG ? 'Goalies show off the mask' : 'Every skater wears the team helmet') + '</span></div>';
    if (isG) look += '<div class="fld"><span>Mask</span>' + chips('mask', A.MASKS, A.MASK_N) + '</div>';
    else {
      look += '<div class="fld"><span>Hair</span>' + chips('hair', A.HAIR_STYLES, A.HAIR_N) + '</div>' +
        '<div class="fld"><span>Hair colour</span>' + sw('hc', A.HAIR) + '</div>' +
        '<div class="fld"><span>Beard</span>' + chips('beard', A.BEARDS, A.BEARD_N) + '</div>';
    }
    look += '<div class="fld"><span>Skin</span>' + sw('skin', A.SKIN) + '</div>' +
      '<button class="btn ghost sm" data-act="lookreset">Back to his original look</button>';
    openModal(sheetHead('Name, number &amp; look', 'Free, any time. Records keep whatever you call them.', 'data-act="back" data-pid="' + pid + '"') +
      '<div class="rn-top"><div class="rename-jersey">' + jerseySVG(team(), 92, p.num) + '</div><div class="lk-prev" id="lkPrev">' + lookPreview() + '</div></div>' +
      '<label class="fld"><span>Name</span><input id="rnName" class="txt" maxlength="22" value="' + esc(p.name) + '"></label>' +
      '<label class="fld"><span>Jersey number (1–99)</span><input id="rnNum" class="txt" type="number" min="1" max="99" inputmode="numeric" value="' + p.num + '"></label>' +
      '<div class="note">Taking a number someone else wears swaps the two.</div>' + look +
      '<button class="btn primary" data-act="savename" data-pid="' + pid + '">Save</button>');
  }
  function lookPreview() {
    const p = ST.get().team.roster.find(x => x.id === lookPid); if (!p) return '';
    return A.portrait(Object.assign({}, p, { look: lookDraft }), team(), 112, rcol(p));
  }
  function setLook(key, val) {
    if (!lookDraft) return;
    lookDraft[key] = /^\d+$/.test(val) ? +val : val;
    document.querySelectorAll('[data-look="' + key + '"]').forEach(b => b.classList.toggle('on', b.dataset.val === String(val)));
    const pv = $('#lkPrev'); if (pv) pv.innerHTML = lookPreview();
  }
  function resetLook() {
    const p = ST.get().team.roster.find(x => x.id === lookPid); if (!p) return;
    lookDraft = Object.assign({}, A.lookOf(Object.assign({}, p, { look: null })));
    Object.keys(lookDraft).forEach(k => document.querySelectorAll('[data-look="' + k + '"]').forEach(b => b.classList.toggle('on', b.dataset.val === String(lookDraft[k]))));
    const pv = $('#lkPrev'); if (pv) pv.innerHTML = lookPreview();
  }
  function gearCard(g, foot) {
    const r0 = D.RARITY[D.RIDX[g.rarity]], r = g.hof ? { n: 'Hall of Fame', color: D.GOLD } : r0, slot = D.GEAR_SLOTS[g.kind].find(s => s.k === g.slot);
    return '<div class="gcard" style="--rc:' + r.color + '"><div class="gc-art">' + A.gearIcon(g.slot, r.color, 34) + '</div><div class="gc-r">' + r.n + '</div><b class="gc-n">' + slot.n + '</b>' +
      '<div class="gc-s">+' + M.gearBonus(g) + ' ' + D.ATTR_LABEL[slot.p] + (g.s ? '<br>+' + g.s + ' ' + D.ATTR_LABEL[slot.s] : '') + '</div>' + (foot || '') + '</div>';
  }
  function gearPicker(pid, slotKey) {
    const st = ST.get(), p = st.team.roster.find(x => x.id === pid);
    const kind = p.pos === 'G' ? 'goalie' : 'skater', slot = D.GEAR_SLOTS[kind].find(s => s.k === slotKey);
    const list = st.gear.filter(g => g.kind === kind && g.slot === slotKey).sort((a, b) => M.gearValue(b) - M.gearValue(a));
    let h = sheetHead(slot.n, 'for ' + esc(p.name), 'data-act="back" data-pid="' + pid + '"');
    if (p.gear[slotKey]) h += '<div class="cur-gear">' + gearCard(p.gear[slotKey], '<button class="buy wide" data-unequip="' + slotKey + '" data-pid="' + pid + '">Unequip</button>') + '<div class="cur-l">Equipped now</div></div>';
    if (!list.length) h += '<div class="empty">' + A.gearIcon(slotKey, 'var(--dim2)', 30) + '<span>No spare ' + slot.n.toLowerCase() + ' in the locker. Win games or check the Store.</span></div>';
    else h += '<div class="ggrid">' + list.map(g => gearCard(g, '<div class="gc-btns"><button class="buy" data-salv="' + g.id + '" data-pid="' + pid + '" data-slot="' + slotKey + '">Salvage</button><button class="buy primary" data-equip="' + g.id + '" data-pid="' + pid + '">Equip</button></div>')).join('') + '</div>';
    openModal(h);
  }
  function xfPicker(pid, slot) {
    const st = ST.get(), p = st.team.roster.find(x => x.id === pid);
    const kind = p.pos === 'G' ? 'goalie' : 'skater';
    const list = st.xfs.map(k => D.XFACTORS.find(x => x.k === k)).filter((x, i, arr) => x && x.pos === kind && x.k !== (slot === 2 ? p.xf : p.xf2) && arr.indexOf(x) === i);
    let h = sheetHead('Trait slot ' + slot, 'for ' + esc(p.name), 'data-act="back" data-pid="' + pid + '"');
    if (!list.length) h += '<div class="empty">' + ic('bolt', 26) + '<span>No traits in the locker for this position. Traits only come from franchise achievements on the Trophies tab, and they stay with you through every new franchise.</span></div>';
    h += list.map(x => '<button class="xfslot" data-setxf="' + x.k + '" data-pid="' + pid + '" data-xslot="' + slot + '" style="--rc:' + A.rarityColor(x.r) + '"><span class="xf-ic">' + ic('bolt', 22) + '</span><span><b>' + x.n + '</b><i>' + x.d + '</i></span></button>').join('');
    openModal(h);
  }

  function pendingSheet() {
    const st = ST.get(), pd = st.pending;
    if (!pd) return;
    if (pd.kind === 'champion') {
      const favN = st.fav && D.NATIONS.find(n => n.c === st.fav);
      const list = (favN ? [favN] : []).concat(D.NATIONS.filter(n => n !== favN).slice(0, 23));
      openModal('<div class="result"><div class="cup-art">' + ic('trophy', 56) + '</div><h2 class="big-title">' + pd.title + '</h2><p class="sub">' + esc(pd.sub) + '</p></div>' +
        '<div class="nations">' + list.map(n => '<button class="nat" data-nat="' + n.c + '">' + flag(n.c, 22) + n.n + '</button>').join('') + '</div>', true);
      return;
    }
    let h = '<div class="pick-h"><div class="eyebrow">Reward</div><h2 class="big-title">' + esc(pd.title) + '</h2><p class="sub">Pick one. The other two are gone.</p></div><div class="picks">';
    h += pd.options.map((o, i) => {
      let art = '', col = 'var(--ice)', kind = '', line = '';
      if (o.t === 'gear') { col = A.rarityColor(o.rarity); const slot = D.GEAR_SLOTS[o.g.kind].find(s => s.k === o.g.slot); art = A.gearIcon(o.g.slot, col, 44); kind = D.RARITY[D.RIDX[o.rarity]].n + (o.g.kind === 'goalie' ? ' · G' : ''); line = slot.n + '<small>+' + o.g.p + ' ' + D.ATTR_LABEL[slot.p] + '</small>'; }
      else if (o.t === 'shards') { col = POOLC[o.pos]; art = ic('shard', 44); kind = 'Shards'; line = o.n + ' ' + POOLN[o.pos].toLowerCase() + '<small>for promotions</small>'; }
      else if (o.t === 'xf') { col = A.rarityColor(o.rarity); art = ic('bolt', 44); kind = 'Trait'; const x = D.XFACTORS.find(y => y.k === o.xf); line = x.n + '<small>' + esc(x.d) + '</small>'; }
      else if (o.t === 'boost') { col = '#ffc54d'; art = ic('bolt', 44); kind = 'Boost'; const b = D.BOOSTS.find(y => y.k === o.k); line = b.n + (o.n > 1 ? ' ×' + o.n : '') + '<small>' + esc(b.d) + '</small>'; }
      else { col = '#d6dde6'; art = ic('puck', 44); kind = 'Pucks'; line = fmt(o.n) + '<small>straight into upgrades</small>'; }
      return '<button class="pick" data-take="' + i + '" style="--rc:' + col + '"><span class="pick-art">' + art + '</span><span class="pick-k">' + kind + '</span><b>' + line + '</b></button>';
    }).join('') + '</div>';
    h += pd.rerolled ? '<div class="muted-c">Reroll used. The first set is gone.</div>' : '<button class="btn ghost" data-act="reroll">▶ Watch an ad for a fresh set of three</button><div class="muted-c">Same odds. Another look, not a better one.</div>';
    openModal(h, true);
  }

  // franchise history: players who retired when you started a new franchise, best first, each one
  // can be brought back as a Legacy player
  function alumniHTML(st) {
    const al = (st.alumni || []).slice().sort((a, b) => (b.fr || 1) - (a.fr || 1) || (b.peak || 0) - (a.peak || 0));
    let h = '<div class="sec-h in" id="alumni"><h2>Franchise history</h2><span class="sec-note">' + al.length + ' retired</span></div>';
    if (!al.length) return h + '<div class="empty">' + ic('team', 24) + '<span>When you start a new franchise, everyone you do not carry over retires here. You can bring any of them back later as a Legacy player.</span></div>';
    let fr = 0;
    al.forEach(p => {
      if (p.fr !== fr) { fr = p.fr; h += '<div class="al-fr">Franchise ' + (fr || 1) + '</div>'; }
      const c = p.career || {}, line = p.pos === 'G' ? (c.gp || 0) + ' GP · ' + (c.w || 0) + ' W · ' + (c.so || 0) + ' SO' : (c.gp || 0) + ' GP · ' + (c.g || 0) + ' G · ' + (c.p || 0) + ' P';
      h += '<div class="rec al">' + A.portrait(p, st.team, 34, rcol(p)) + '<span class="rec-l">' + flag(p.nat, 13) + ' ' + esc(p.name) + '<i>' + p.pos + ' · ' + M.typeOf(p).ab + ' · peak ' + (p.peak || M.overall(p)) + ' ovr · ' + line + ((p.awards || []).length ? ' · ' + p.awards.length + ' award' + (p.awards.length > 1 ? 's' : '') : '') + '</i></span>' +
        '<button class="btn sm gold" data-bringback="' + p.id + '">Bring back $0.99</button></div>';
    });
    return h + '<div class="note">A player you bring back returns the same way as a carried-over Legacy player: Legendary, +2 to every attribute, starting about 5 Overall above your current lineup average. He joins your bench.</div>';
  }
  function historySheet() {
    const st = ST.get();
    let h = sheetHead('History &amp; records', 'Season ' + st.season + ' · ' + st.history.length + ' archived', 'data-act="close"');
    h += '<div class="sec-h in"><h2>Franchise records</h2></div><div class="recs">';
    const all = st.team.roster;
    [['Most goals, season', p => p.best.g || 0], ['Most points, season', p => p.best.p || 0], ['Career goals', p => p.career.g || 0], ['Career points', p => p.career.p || 0], ['Career PIM', p => p.career.pim || 0]].forEach(([label, f]) => {
      const p = all.filter(x => x.pos !== 'G').sort((a, b) => f(b) - f(a))[0];
      h += !p || !f(p) ? '<div class="rec"><span class="rec-l">' + label + '</span><span class="muted">—</span></div>'
        : '<div class="rec">' + A.portrait(p, st.team, 32, rcol(p)) + '<span class="rec-l">' + label + '<i>' + flag(p.nat, 14) + ' ' + esc(p.name) + '</i></span><b>' + f(p) + '</b></div>';
    });
    const g = all.filter(x => x.pos === 'G').sort((a, b) => (b.career.so || 0) - (a.career.so || 0))[0];
    if (g && g.career.so) h += '<div class="rec">' + A.portrait(g, st.team, 32, rcol(g)) + '<span class="rec-l">Career shutouts<i>' + flag(g.nat, 14) + ' ' + esc(g.name) + '</i></span><b>' + g.career.so + '</b></div>';
    h += '</div>' + alumniHTML(st);
    h += '<div class="sec-h in"><h2>Season archive</h2></div>';
    if (!st.history.length) h += '<div class="empty">' + ic('season', 26) + '<span>Nothing archived yet. Finish a season.</span></div>';
    st.history.forEach(s => {
      h += '<div class="arch"><div class="arch-h"><b>' + ((s.fr || 1) > 1 || (ST.get().prestige || 0) ? 'F' + (s.fr || 1) + ' · ' : '') + 'Season ' + s.season + '</b><span class="arch-d">' + esc(s.divName) + '</span><span class="pill ' + (s.result === 'Champion' ? 'gold' : '') + '">' + s.result + '</span></div>' +
        '<div class="arch-l">' + s.w + '-' + s.l + '-' + s.otl + ' · ' + s.gf + ' GF · ' + s.ga + ' GA</div>' +
        '<div class="arch-l">' + s.leaders.map(l => flag(l.nat, 13) + ' ' + esc(l.name) + ' <b>' + l.p + '</b>').join(' · ') + '</div></div>';
    });
    openModal(h);
  }

  function coachSheet() {
    const st = ST.get(), c = st.coach;
    const styles = [['bal', 'Balanced', 'No tilt'], ['off', 'Run and gun', 'Offense +4%, defense −3%'], ['def', 'Trap', 'Defense +4%, offense −3%']];
    let h = '<div class="coach-hero">' + A.coachPortrait(c, st.team, 84) + '<div><div class="eyebrow">Head coach</div><h2 class="sheet-t">' + esc(c.name) + '</h2>' +
      '<div class="sub">' + flag(c.nat, 16) + ' ' + M.nationOf({ nat: c.nat }).n + '</div></div><button class="xbtn" data-act="close" aria-label="Close">' + ic('close', 16) + '</button></div>';
    h += '<div class="sec-h in"><h2>System</h2><span class="sec-note">Applies to every game</span></div><div class="styles">' + styles.map(([k, n, d]) =>
      '<button class="style' + (c.style === k ? ' on' : '') + '" data-style="' + k + '"><b>' + n + '</b><i>' + d + '</i></button>').join('') + '</div>' +
      '<div class="note">An offense far ahead of its defense leaks goals, and the reverse cannot score. Trap helps a lopsided roster; Run and gun suits a defense that can cover.</div>';
    h += '<div class="sec-h in"><h2>Staff</h2><span class="sec-note">' + pucks(st.pucks) + '</span></div>';
    [['bench', 'Bench boss', 'season', 'Away allowance per day: ' + ST.offlineCap() + ' games, ' + ST.offlineHours().toFixed(1) + 'h of earnings'], ['skills', 'Skills coach', 'practice', 'All puck income +' + (c.skills * 2.5).toFixed(1) + '%'], ['video', 'Video coach', 'pass', 'Chemistry +' + (c.video * 3) + '% per game']].forEach(([k, n, icn, d]) => {
      const lv = c[k], cost = ST.coachCost(k);
      h += '<div class="coach"><span class="coach-ic">' + ic(icn, 24) + '</span><div class="coach-m"><div class="coach-t"><b>' + n + '</b><i>Level ' + lv + ' / 20</i></div>' +
        '<div class="seg20">' + Array.from({ length: 20 }, (_, i) => '<i class="' + (i < lv ? 'on' : '') + '"></i>').join('') + '</div><div class="note">' + d + '</div></div>' +
        '<button class="buy" data-coach="' + k + '"' + (lv >= 20 || st.pucks < cost ? ' disabled' : '') + '>' + (lv >= 20 ? 'MAX' : ic('puck', 12) + fmt(cost)) + '</button></div>';
    });
    openModal(h);
  }

  const TUNE_ROWS = [['gameIntervalSec', 'Game interval (s)', 5, 300, 5], ['comboDecayMs', 'Combo decay (ms)', 400, 3000, 50], ['comboMaxMult', 'Max multiplier', 2, 20, 1],
    ['starExp', 'Star-share exponent', 1, 3, 0.05], ['mismatchExp', 'Mismatch exponent', 0, 1.2, 0.05], ['gammaShape', 'Gamma shape (lower = wilder)', 1, 20, 1]];
  const TUNE0 = {}; TUNE_ROWS.forEach(([k]) => { TUNE0[k] = D.TUNING[k]; });
  function resetTuning() { Object.keys(TUNE0).forEach(k => { D.TUNING[k] = TUNE0[k]; }); }
  // three save files on this device: switch teams or start a new one
  function savesSheet() {
    const cur = ST.curSlot(), ago = t => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 2 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
    let h = sheetHead('Save files', 'Up to ' + ST.SLOTS + ' teams on this device. Switching saves your current team first.', 'data-act="close"');
    h += '<div class="svfs">';
    for (let i = 0; i < ST.SLOTS; i++) {
      const s = i === cur ? (() => { const st = ST.get(); return { team: st.team, city: st.team.city, name: st.team.name, div: st.div, divName: ST.div().n, fr: (st.prestige || 0) + 1, season: st.season, cups: st.totals.cups, last: Date.now() }; })() : ST.slotInfo(i);
      h += '<div class="svf' + (i === cur ? ' cur' : '') + (s ? '' : ' empty') + '"><span class="svf-n">' + (i + 1) + '</span>' +
        (s ? '<span class="svf-j">' + jerseySVG(s.team, 44) + '</span><span class="svf-t"><b>' + esc(s.city + ' ' + s.name) + '</b><i>Div ' + s.div + ' · ' + esc(s.divName) + ' · Franchise ' + s.fr + ' · Season ' + s.season + (s.cups ? ' · ' + s.cups + ' title' + (s.cups > 1 ? 's' : '') : '') + '</i>' + (i === cur ? '<em>Playing now</em>' : '<em>Last played ' + ago(s.last) + '</em>') + '</span>'
          : '<span class="svf-t"><b>Empty slot</b><i>Start a brand new team here.</i></span>') +
        '<span class="svf-b">' + (i === cur ? '' : '<button class="btn sm' + (s ? ' primary' : '') + '" data-slot="' + i + '">' + (s ? 'Play' : 'New team') + '</button>') +
        (s ? '<button class="btn sm danger-ghost" data-slotdel="' + i + '">Delete</button>' : '') + '</span></div>';
    }
    h += '</div><div class="note">Saves live in this browser on this device. Deleting a slot can’t be undone.</div>';
    openModal(h);
  }
  function tuneSheet() {
    const T = D.TUNING, st = ST.get();
    let h = sheetHead('Settings', st.dev ? 'Developer mode is on. These tools are for testing only.' : 'Your save lives on this device.', 'data-act="close"');
    h += '<button class="btn wide" data-act="saves" style="margin-bottom:12px">' + ic('team', 15) + ' Save files (' + ST.SLOTS + ' slots)</button>';
    h += '<button class="toggle wide' + (st.dev ? ' on' : '') + '" data-act="devmode"><span class="tg-dot"></span>Developer mode ' + (st.dev ? 'on' : 'off') + '</button>' +
      '<div class="note">Developer mode shows the tuning sliders, the demo clock, Skip game and Add currencies. Turning it off puts every number back to normal.</div>';
    if (st.dev) {
      TUNE_ROWS.forEach(([k, label, lo, hi, step]) => {
        h += '<div class="tune"><div class="tune-h"><span>' + label + '</span><b class="num" id="tv_' + k + '">' + T[k] + '</b></div><input type="range" id="tune_' + k + '" min="' + lo + '" max="' + hi + '" step="' + step + '" value="' + T[k] + '" data-tune="' + k + '"></div>';
      });
      h += '<button class="btn" data-act="devgrant" style="margin-top:12px">' + ic('wrench', 15) + ' Add currencies (dev)</button>';
    }
    h += '<button class="btn danger-ghost" data-act="wipe">Delete save and start over</button>';
    openModal(h);
  }

  // ------------------------------------------------------------ draft, trades, awards
  // batch draft: every pick at once, best first, with the same Overall-based luck for each
  function draftAllSheet(list) {
    const st = ST.get();
    list.sort((a, b) => M.overall(b.p) - M.overall(a.p));
    let h = sheetHead('Draft class', list.length + ' pick' + (list.length > 1 ? 's' : '') + ' made. Everyone joins your bench.', 'data-act="close"');
    h += '<div class="dclass">' + list.map(r => {
      const p = r.p, rc = rcol(p), hot = r.topPct <= 20;
      return '<button class="dc-r" data-p="' + p.id + '" style="--rc:' + rc + '">' + A.portrait(p, st.team, 44, rc) +
        '<span class="dc-t"><b>' + esc(p.name) + '</b><i>' + ST.ord(r.round) + ' round · ' + p.pos + ' · ' + M.typeOf(p).ab + ' · ' + flag(p.nat, 12) + '</i>' +
        '<em class="' + (hot ? 'hot' : '') + '">' + (r.topPct >= 50 ? 'Bottom ' + Math.max(1, Math.round(100 - r.topPct)) + '%' : 'Top ' + r.topPct + '%') + ' for the round</em></span>' +
        '<span class="dc-o"><span class="rpill" style="--rc:' + rc + '">' + rname(p) + '</span>' + ovr(p) + '</span></button>';
    }).join('') + '</div>';
    h += '<div class="note">Batch picks skip the rescout. Draft one at a time if you want the ad rescout.</div>' +
      '<button class="btn primary" data-act="tobench">See the bench</button>';
    openModal(h);
  }
  function draftReveal(res) {
    const st = ST.get(), p = res.p, rc = rcol(p), nat = natOf(p);
    const luck = res.topPct >= 50 ? 'Below-average Overall for a ' + ST.ord(res.round) + '-rounder (bottom ' + Math.max(1, Math.round(100 - res.topPct)) + '%)' : 'Top ' + res.topPct + '% Overall for a ' + ST.ord(res.round) + '-rounder';
    openModal('<div class="result mcard" style="--rc:' + rc + '"><div class="eyebrow">' + ST.ord(res.round) + '-round pick</div>' +
      '<div class="mc-face">' + A.portrait(p, st.team, 120, rc) + '<span class="mc-num">#' + p.num + '</span></div>' +
      '<span class="rpill" style="--rc:' + rc + '">' + rname(p) + '</span> <span class="tpill">' + esc(M.typeOf(p).n) + '</span>' +
      '<h2 class="big-title">' + esc(p.name) + '</h2><div class="mc-n">' + p.pos + ' · ' + flag(p.nat, 16) + ' ' + nat.n + ' · ' + M.overall(p) + ' overall</div>' +
      '<div class="luck' + (res.topPct <= 20 ? ' hot' : '') + '">' + ic(res.topPct <= 20 ? 'flame' : 'star', 18) + '<span>' + luck + '</span></div>' +
      '<div class="odds big">' + res.odds.map((o, i) => o ? '<i class="' + (i === res.ri ? 'hit' : '') + '" style="width:' + o + '%;background:' + D.RARITY[i].color + '"></i>' : '').join('') + '</div>' +
      '<div class="odds-l c">' + res.odds.map((o, i) => o ? '<em style="color:' + D.RARITY[i].color + '">' + (i === res.ri ? '▲ ' : '') + D.RARITY[i].n + ' ' + o + '%</em>' : '').join('') + '</div>' +
      (res.rescouted ? '<div class="muted-c">Rescouted. This is your pick.</div>'
        : '<button class="btn ghost wide" data-act="rescout" data-pid="' + p.id + '" data-round="' + res.round + '">▶ Watch an ad to rescout</button>' +
          '<div class="muted-c">Once per pick. He goes back to the pool and you draft again at the same odds.</div>') +
      '<div class="note">He joins your bench. Use Edit lines on the Team tab to play him.</div>' +
      '<div class="grid2"><button class="btn" data-act="close">Keep drafting</button><button class="btn primary" data-act="tobench">See the bench</button></div></div>', true);
  }
  // stand-in for a rewarded video ad: a short locked countdown, then the reward
  function adBreak(sec, done) {
    openModal('<div class="result adbreak"><div class="eyebrow">Ad break</div><div class="ad-box">' + ic('puck', 48) + '<span>Your ad would play here</span></div>' +
      '<div class="ad-t">Reward in <b id="adT">' + sec + '</b>s</div><div class="ad-bar"><i id="adBar"></i></div></div>', true);
    const t0 = Date.now();
    const tick = setInterval(() => {
      const left = sec - (Date.now() - t0) / 1000, el = $('#adT'), bar = $('#adBar');
      if (el) el.textContent = Math.max(0, Math.ceil(left));
      if (bar) bar.style.width = Math.min(100, 100 * (1 - left / sec)) + '%';
      if (left <= 0) { clearInterval(tick); done(); }
    }, 100);
  }
  let tradeSel = [], tradeOpt = { nat: null, pos: 'C' };
  function tradeSheet(ti, keep) {
    if (!keep) { tradeSel = []; tradeOpt = { nat: ST.get().fav || 'CA', pos: 'C' }; }
    const t = ST.TRADES[ti], st = ST.get();
    const list = ST.bench().filter(p => p.rarity === t.r).sort((a, b) => M.overall(a) - M.overall(b));
    const title = t.legend ? 'Three Legendaries for one' : 'Trade for a ' + ST.ord(t.round) + '-rounder';
    const sub = 'Pick ' + t.n + ' ' + D.RARITY[D.RIDX[t.r]].n.toLowerCase() + ' bench player' + (t.n > 1 ? 's' : '') + ' to send away.';
    let h = sheetHead(title, sub, 'data-act="close"');
    h += '<div class="tauto"><button class="btn sm" data-tauto="' + ti + '">' + ic('bolt', 14) + ' Auto-select the ' + (t.n > 1 ? t.n + ' weakest' : 'weakest') + '</button>' +
      (tradeSel.length ? '<button class="btn sm ghost" data-tclear="' + ti + '">Clear</button>' : '') + '</div>';
    h += '<div class="tsel">' + list.map(p => {
      const on = tradeSel.indexOf(p.id) >= 0, ok = ST.tradeable(p);
      return '<button class="tsel-r' + (on ? ' on' : '') + (ok ? '' : ' locked') + '" data-tsel="' + p.id + '" data-ti="' + ti + '"' + (ok ? '' : ' disabled') + '>' + A.portrait(p, st.team, 40, rcol(p)) +
        '<span class="tsel-t"><b>' + esc(p.name) + '</b><i>' + (ok ? p.pos + ' · ' + M.typeOf(p).ab + ' · ' + M.overall(p) + ' ovr · ' + (p.pos === 'G' ? (p.career.w || 0) + ' career wins' : (p.career.p || 0) + ' career pts') : 'Locked · unlock him on his card to trade') + '</i></span><span class="tsel-c">' + (on ? ic('check', 16) : '') + '</span></button>';
    }).join('') + '</div>';
    if (t.legend) {
      h += '<div class="fld"><span>Country</span><div class="favrow"><span>' + flag(tradeOpt.nat, 24) + '</span><select id="tNat" class="txt">' +
        D.NATIONS.map(n => '<option value="' + n.c + '"' + (n.c === tradeOpt.nat ? ' selected' : '') + '>' + n.n + '</option>').join('') + '</select></div></div>' +
        '<div class="fld"><span>Position</span><div class="chips">' + ['LW', 'C', 'RW', 'D', 'G'].map(ps => '<button class="chip' + (tradeOpt.pos === ps ? ' on' : '') + '" data-tpos="' + ps + '" data-ti="' + ti + '">' + ps + '</button>').join('') + '</div></div>';
    }
    h += '<button class="btn primary" data-dotrade="' + ti + '"' + (tradeSel.length === t.n ? '' : ' disabled') + '>Trade ' + tradeSel.length + ' / ' + t.n + (t.legend ? ' for a Legendary' : ' for a ' + ST.ord(t.round) + '-round pick') + '</button>';
    openModal(h);
    const ns = $('#tNat'); if (ns) ns.addEventListener('change', () => { tradeOpt.nat = ns.value; tradeSheet(ti, true); });
  }
  function toggleTrade(ti, id) { const t = ST.TRADES[ti], i = tradeSel.indexOf(id); if (i >= 0) tradeSel.splice(i, 1); else if (tradeSel.length < t.n) tradeSel.push(id); tradeSheet(ti, true); }
  function autoTrade(ti) {
    const t = ST.TRADES[ti];
    tradeSel = ST.bench().filter(p => p.rarity === t.r && ST.tradeable(p)).sort((a, b) => M.overall(a) - M.overall(b)).slice(0, t.n).map(p => p.id);
    tradeSheet(ti, true);
  }
  function clearTrade(ti) { tradeSel = []; tradeSheet(ti, true); }
  function setTradePos(ti, pos) { tradeOpt.pos = pos; tradeSheet(ti, true); }
  function doTrade(ti) {
    const r = ST.tradePlayers(ti, tradeSel, tradeOpt);
    if (!r) return;
    tradeSel = []; closeModal(); render();
    if (r !== true) setTimeout(() => playerSheet(r.id), 250);
  }

  // welcome-back summary after time away
  function awaySheet(r) {
    const st = ST.get(), d = ST.dailyState();
    const hrs = r.awaySec >= 3600 ? Math.floor(r.awaySec / 3600) + 'h ' + Math.round((r.awaySec % 3600) / 60) + 'm' : Math.max(1, Math.round(r.awaySec / 60)) + ' min';
    let h = '<div class="pick-h"><div class="eyebrow">Welcome back</div><h2 class="big-title">While you were away</h2><p class="sub">Gone ' + hrs + '.</p></div><div class="awl">';
    const row = (icn, b, i) => '<div class="aw-r">' + ic(icn, 20) + '<span><b>' + b + '</b>' + (i ? '<i>' + i + '</i>' : '') + '</span></div>';
    if (r.pucks) h += row('puck', fmt(r.pucks) + ' pucks', 'Away earnings: half your passive income, up to ' + ST.offlineHours().toFixed(1) + 'h a day');
    if (r.games) {
      const rc = r.rec || { w: 0, l: 0, otl: 0, gf: 0, ga: 0 };
      h += row('season', r.games + ' game' + (r.games > 1 ? 's' : '') + ' played · ' + rc.w + '-' + rc.l + '-' + rc.otl, 'Goals ' + rc.gf + '–' + rc.ga + (r.gamePucks ? ' · +' + fmt(r.gamePucks) + ' pucks from wins' : ''));
      if (r.rank0 && r.rank1) h += row('trophy', 'Standings: ' + ST.ord(r.rank0) + ' → ' + ST.ord(r.rank1), r.rank1 < r.rank0 ? 'Climbing' : r.rank1 > r.rank0 ? 'Slipping' : 'Holding steady');
      if (r.top) h += row('star', esc(r.top.name) + ' +' + r.top.d + ' pts', 'Your hottest player while you were gone');
      if (r.gear) h += row('gear', r.gear + ' piece' + (r.gear > 1 ? 's' : '') + ' of gear dropped', 'Auto-equip on the Team tab puts it on');
      if (r.playoffs) h += row('trophy', 'The playoffs are here', 'Drop the puck on the Season tab when you are ready');
      if (r.missed) h += row('season', 'The season is over', 'You missed the playoffs. A new season is ready.');
    }
    (r.cards || []).forEach(c => { h += row('medal', esc(c.title) + ' · ' + esc(c.name), esc(c.sub)); });
    if (r.ach) h += row('medal', r.ach + ' achievement' + (r.ach > 1 ? 's' : '') + ' to claim', 'On the Trophies tab');
    if (!r.games && !r.pucks) h += row('season', 'Nothing new yet', 'Games keep playing while you are away, up to ' + ST.offlineCap() + ' a day.');
    h += '</div>' + (d.ready ? '<button class="btn primary" data-act="daily">Claim day ' + d.day + ' daily reward</button>' : '<button class="btn primary" data-act="close">Let’s go</button>');
    openModal('<div class="result">' + h + '</div>');
  }
  // prestige: pick Legacy players (one more slot each franchise) to carry into the reset
  let prestSel = [];
  function prestigeSheet(keep) {
    if (!keep) prestSel = [];
    const st = ST.get(), list = st.team.roster.slice().sort((a, b) => M.overall(b) - M.overall(a));
    let h = sheetHead('Franchise ' + ((st.prestige || 0) + 2), 'Pick up to ' + ST.keepLimit() + ' Legacy players. Everyone else retires.', 'data-act="close"');
    h += '<div class="prest-list">' + list.map(p => {
      const on = prestSel.indexOf(p.id) >= 0;
      return '<button class="tsel-r' + (on ? ' on' : '') + '" data-psel="' + p.id + '">' + A.portrait(p, st.team, 40, rcol(p)) +
        '<span class="tsel-t"><b>' + esc(p.name) + (p.legacyB ? ' <em class="leg">Legacy +' + p.legacyB + '</em>' : '') + '</b><i>' + p.pos + ' · ' + M.typeOf(p).ab + ' · ' + M.overall(p) + ' ovr · ' + (p.awards || []).length + ' awards</i></span><span class="tsel-c">' + (on ? ic('check', 16) : '') + '</span></button>';
    }).join('') + '</div>';
    h += '<div class="note">What resets: division, season count, pucks, shards, tape, regular gear, picks, facilities, coach skills, achievements and daily rewards. What stays: Legacy players (as Legendary, starting about 5 Overall above the new roster, with their trophies and +2 every attribute), Hall of Fame gear, traits (off the players, back in the locker), chemistry, your coach, history, trophy case, franchise achievements, jersey and logo. You can carry one more Legacy player with every new franchise, with no limit.</div>';
    h += '<button class="btn gold big" data-act="doprestige">' + ic('trophy', 16) + ' Start Franchise ' + ((st.prestige || 0) + 2) + ' with ' + prestSel.length + ' Legacy player' + (prestSel.length === 1 ? '' : 's') + '</button>';
    openModal(h);
  }
  function togglePrest(id) { const i = prestSel.indexOf(id); if (i >= 0) prestSel.splice(i, 1); else if (prestSel.length < ST.keepLimit()) prestSel.push(id); const sc = $('#sheet').scrollTop; prestigeSheet(true); $('#sheet').scrollTop = sc; }
  // franchise achievement reward: pick the Hall of Fame gear or the trait
  function fachSheet() {
    const st = ST.get(), o = st.fachOffer; if (!o) return;
    const a = ST.FACH.find(x => x.k === o.k), x = D.XFACTORS.find(y => y.k === o.x), slot = D.GEAR_SLOTS[o.g.kind].find(s => s.k === o.g.slot);
    let h = '<div class="pick-h"><div class="eyebrow">' + esc(a.n) + ' · tier ' + o.tier + '</div><h2 class="big-title">Pick your reward</h2><p class="sub">One or the other. Hall of Fame gear and traits both survive every new franchise.</p></div><div class="picks two">';
    h += '<button class="pick" data-fachpick="gear" style="--rc:' + D.GOLD + '"><span class="pick-art">' + A.gearIcon(o.g.slot, D.GOLD, 44) + '</span><span class="pick-k">Hall of Fame gear</span><b>' + slot.n + (o.g.kind === 'goalie' ? ' (G)' : '') + '</b><i>+' + o.g.p + ' ' + D.ATTR_LABEL[slot.p] + (o.g.s ? ', +' + o.g.s + ' ' + D.ATTR_LABEL[slot.s] : '') + '</i></button>';
    h += '<button class="pick" data-fachpick="trait" style="--rc:' + A.rarityColor(x.r) + '"><span class="pick-art">' + ic('bolt', 44) + '</span><span class="pick-k">Trait</span><b>' + esc(x.n) + '</b><i>' + esc(x.d) + '</i></button></div>';
    openModal('<div class="result">' + h + '</div>', true);
  }
  // weekly daily-reward calendar
  function dailySheet() {
    const d = ST.dailyState(), ready = d.ready;
    let h = '<div class="pick-h"><div class="eyebrow">Daily rewards</div><h2 class="big-title">' + (ready ? 'Day ' + d.day + ' is ready' : 'Come back tomorrow') + '</h2>' +
      '<p class="sub">Claim once a day. Miss a day and the week starts over. Day 7 is the jackpot.</p></div><div class="dgrid">';
    ST.DAILY.forEach((r, i) => {
      const day = i + 1, today = ready ? day === d.day : false;
      const done = ready ? day < d.day : day <= d.claimed;
      h += '<div class="dcell' + (today ? ' today' : '') + (done ? ' done' : '') + (day === 7 ? ' big' : '') + '"><em>Day ' + day + '</em>' +
        '<span class="dic">' + ic(done ? 'check' : day === 7 ? 'trophy' : ['puck', 'shard', 'bolt', 'gear', 'tape', 'token'][i], day === 7 ? 26 : 20) + '</span>' +
        '<b>' + r.n + '</b><i>' + r.d + '</i></div>';
    });
    h += '</div>' + (ready ? '<button class="btn primary big" data-act="claimdaily">Claim day ' + d.day + '</button>' : '<button class="btn" data-act="close">Close</button>');
    openModal('<div class="result">' + h + '</div>', ready);
  }
  function awardsSheet(c) {
    const st = ST.get(), mine = c.list.filter(a => a.winner.mine).length;
    let h = '<div class="pick-h"><div class="eyebrow">Season ' + c.season + ' · ' + esc(c.divName) + '</div><h2 class="big-title">' + esc(c.result || 'Season over') + '</h2>' +
      '<p class="sub">' + (mine ? 'Your players took ' + mine + ' of ' + c.list.length + ' awards.' : 'No awards for your team this year.') + '</p>' +
      (c.shards ? '<div class="shardrow">' + ['F', 'D', 'G'].map(k => '<span>' + shardIc(k, 14) + '+' + c.shards[k] + ' ' + k + '</span>').join('') + '<span>' + ic('token', 14) + ' +picks</span></div>' : '') + '</div><div class="awards">';
    c.list.forEach(a => {
      const w = a.winner, p = w.mine ? st.team.roster.find(x => x.id === w.pid) : null;
      h += '<div class="aw' + (w.mine ? ' mine' : '') + '"><span class="aw-ic">' + ic(a.icon, 20) + '</span><span class="aw-t"><b>' + a.n + (a.voted ? '<em>voted</em>' : '') + '</b>' +
        '<i>' + (w.nat ? flag(w.nat, 13) + ' ' : '') + esc(w.name) + (w.mine ? '' : ' · ' + esc(w.team)) + (w.stat ? ' · ' + esc(w.stat) : '') + '</i>' +
        (a.bonus ? '<i class="fin">Bonus: ' + esc(a.bonus) + '</i>' : '') +
        (a.finalist ? '<i class="fin">Finalist: ' + esc(a.finalist.name) + ' · ' + esc(a.finalist.stat) + '</i>' : '') + '</span>' +
        (p ? A.portrait(p, st.team, 38, rcol(p)) : A.teamBadge(w.team, 30)) + '</div>';
    });
    h += '</div><button class="btn primary" data-act="close">Continue</button>';
    openModal(h, true);
  }

  let cards = [];
  function queueCard(c) {
    if (c.kind === 'awards') cards.unshift(c); else cards.push(c);
    if (cards.length > 4) cards = cards.slice(0, 4);
    maybeSheets();
  }
  function maybeSheets() {
    const st = ST.get();
    if (!st || P.running || modalOpen()) return;
    if (cards.length && cards[0].kind === 'awards') { awardsSheet(cards.shift()); return; }
    if (st.fachOffer) { fachSheet(); return; }
    if (st.pending) { pendingSheet(); return; }
    if (cards.length) showCard(cards.shift());
  }
  function showCard(c) {
    const st = ST.get();
    if (c.kind === 'awards') { awardsSheet(c); return; }
    if (c.kind === 'diag') {
      openModal('<div class="result"><div class="eyebrow bad">First loss</div><h2 class="big-title">' + esc(c.title) + '</h2><p class="sub">' + esc(c.sub) + '</p>' +
        '<div class="grid2"><button class="btn" data-act="close">Later</button><button class="btn primary" data-act="topractice">' + ic('practice', 16) + ' Go to Train</button></div></div>', true);
      return;
    }
    const p = st.team.roster.find(x => x.id === c.pid);
    if (!p) return maybeSheets();
    openModal('<div class="result mcard' + (M.isGold(p) ? ' gold' : '') + '" style="--rc:' + rcol(p) + '"><div class="eyebrow">Milestone</div>' +
      '<div class="mc-face">' + A.portrait(p, st.team, 120, rcol(p)) + '<span class="mc-num">#' + p.num + '</span></div>' +
      '<h2 class="big-title">' + esc(c.title) + '</h2><div class="mc-n">' + flag(p.nat, 16) + ' ' + esc(p.name) + ' · ' + p.pos + '</div>' +
      '<p class="sub">' + esc(c.sub) + (c.rank ? ' ' + ST.ord(c.rank) + ' in career points on this roster.' : '') + '</p>' +
      '<button class="btn primary" data-act="close">Keep going</button></div>', true);
  }

  // ------------------------------------------------------------ kit
  let kitDraft = null;
  const KIT_PRESETS = [['#c8102e', '#ffffff', '#101820'], ['#0b2a5c', '#ffffff', '#c8102e'], ['#0a5c36', '#f2c230', '#0b1a12'], ['#111111', '#f2b400', '#ffffff'],
    ['#f26b1d', '#ffffff', '#0b2a5c'], ['#007b7f', '#111111', '#ffffff'], ['#4b2582', '#f2c230', '#ffffff'], ['#7a1630', '#f1e6d0', '#1a1a1a'], ['#1f6feb', '#ffffff', '#f2b400'], ['#5b6770', '#c8102e', '#ffffff']];
  function awayKit(k) { return Object.assign({}, k, { c1: k.c2, c2: k.c1 }); }
  function kitStage(k) {
    return '<div class="ks-j"><div>' + jerseySVG(k, 104) + '</div><em>Home</em></div>' +
      '<div class="ks-j"><div>' + jerseySVG(awayKit(k), 104) + '</div><em>Away</em></div>' +
      '<div class="ks-j ks-l"><div>' + A.logoSVG(k, 96) + '</div><em>Logo</em></div>';
  }
  function kitPats(k) { return D.PATTERNS.map(p => '<button type="button" class="ktile' + (p === k.pattern ? ' on' : '') + '" data-kpat="' + p + '">' + jerseySVG(Object.assign({}, k, { pattern: p }), 46) + '<em>' + p[0].toUpperCase() + p.slice(1) + '</em></button>').join(''); }
  function kitCrests(k) { return D.CRESTS.map(c => '<button type="button" class="ktile lg' + (c === k.crest ? ' on' : '') + '" data-kcrest="' + c + '" aria-label="' + c + '">' + A.logoSVG(Object.assign({}, k, { crest: c, abbr: '' }), 44) + '</button>').join(''); }
  function kitSheet() {
    const t = ST.get().team;
    if (!kitDraft) kitDraft = { c1: t.c1, c2: t.c2, c3: t.c3, pattern: t.pattern, crest: t.crest, city: t.city, name: t.name, abbr: t.abbr, lstyle: t.lstyle || 'roundel' };
    const k = kitDraft;
    openModal(sheetHead('Jersey + Logo', 'Free, any time. Every change shows up across the game.', 'data-act="kitclose"') +
      '<div class="kit-stage3" id="kitPrev">' + kitStage(k) + '</div>' +
      '<div class="sec-h in"><h2>Club name</h2></div>' +
      '<div class="krow3"><input id="kCity" class="txt" maxlength="14" value="' + esc(k.city) + '" aria-label="City" placeholder="City">' +
      '<input id="kName" class="txt" maxlength="14" value="' + esc(k.name) + '" aria-label="Nickname" placeholder="Nickname">' +
      '<input id="kAbbr" class="txt" maxlength="3" value="' + esc(k.abbr || '') + '" aria-label="Abbreviation" placeholder="ABC"></div>' +
      '<div class="sec-h in"><h2>Colours</h2><button class="btn sm ghost" data-act="kswap">' + ic('swap', 14) + ' Swap primary &amp; secondary</button></div>' +
      '<div class="kpal">' + KIT_PRESETS.map((c, i) => '<button type="button" class="kp" data-kpal="' + i + '" aria-label="Colour set ' + (i + 1) + '">' + c.map(x => '<i style="background:' + x + '"></i>').join('') + '</button>').join('') + '</div>' +
      '<div class="swatches">' + ['c1', 'c2', 'c3'].map((c, i) => '<label class="sw"><input type="color" id="kc_' + c + '" data-kc="' + c + '" value="' + k[c] + '"><em>' + ['Primary', 'Secondary', 'Trim'][i] + '</em></label>').join('') + '</div>' +
      '<div class="sec-h in"><h2>Jersey pattern</h2></div><div class="kgrid" id="kitPats">' + kitPats(k) + '</div>' +
      '<div class="sec-h in"><h2>Logo</h2></div>' +
      '<div class="chips">' + [['roundel', 'Round badge'], ['shield', 'Shield'], ['crest', 'Emblem only']].map(([v, n]) => '<button type="button" class="chip' + (k.lstyle === v ? ' on' : '') + '" data-klogo="' + v + '">' + n + '</button>').join('') + '</div>' +
      '<div class="kgrid lg" id="kitCrests">' + kitCrests(k) + '</div>' +
      '<button class="btn primary" data-act="savekit">Save jersey + logo</button>');
  }
  function kitPreview() {
    if (!kitDraft) return;
    const n = $('#kitPrev'); if (n) n.innerHTML = kitStage(kitDraft);
    const p = $('#kitPats'); if (p) p.innerHTML = kitPats(kitDraft);
    const c = $('#kitCrests'); if (c) c.innerHTML = kitCrests(kitDraft);
  }

  // ------------------------------------------------------------ chrome
  const NAV_IC = { team: 'team', train: 'practice', season: 'season', office: 'office', store: 'store', trophies: 'medal' };
  function chrome() {
    document.querySelectorAll('#nav button').forEach(b => { const i = b.querySelector('i'); if (i && !i.dataset.done) { i.innerHTML = A.icon(NAV_IC[b.dataset.tab], 21); i.dataset.done = '1'; } });
    const t = $('#btnTune'); if (t && !t.dataset.done) { t.innerHTML = ic('gear', 18); t.dataset.done = '1'; }
    if (!$('#artDefs')) { const d = document.createElement('div'); d.id = 'artDefs'; d.innerHTML = A.defs(); document.body.appendChild(d); }
  }
  function header() {
    const st = ST.get(); if (!st) return;
    chrome();
    $('#curPucks').innerHTML = ic('puck', 15) + fmt(st.pucks);
    $('#curRate').textContent = '+' + fmt(ST.passiveRate()) + '/s';
    $('#hdrTeam').textContent = st.team.city + ' ' + st.team.name;
    $('#hdrDiv').textContent = (st.prestige ? 'F' + (st.prestige + 1) + ' · ' : '') + 'Div ' + st.div + ' · ' + ST.div().n + ' · S' + st.season;
    $('#hdrCrest').innerHTML = A.logoSVG(st.team, 36);
    document.documentElement.style.setProperty('--tc', st.team.c1);
    const act = ST.activeBoosts();
    $('#boosts').innerHTML = act.map(b => { const d = D.BOOSTS.find(x => x.k === b.k); const s = Math.max(0, Math.ceil((b.until - Date.now()) / 1000)); return '<span class="bchip">' + ic('bolt', 12) + d.n + ' <b>' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + '</b></span>'; }).join('');
    $('#boosts').classList.toggle('hidden', !act.length);
    // red dots: something to do on that tab (gear to fit, a promotion, picks to draft, a game to play, rewards)
    const al = ST.alerts();
    ['store', 'season', 'trophies'].forEach(k => {
      const b = document.querySelector('#nav [data-tab=' + k + ']'); if (!b) return;
      b.dataset.badge = al[k] ? (k === 'season' ? '!' : al[k]) : '';
    });
    // playoff banner on every other tab while a game is waiting to be played
    let pb = document.getElementById('poBanner');
    if (!pb) { pb = document.createElement('button'); pb.id = 'poBanner'; pb.className = 'pobanner hidden'; pb.dataset.gotab = 'season'; $('#boosts').after(pb); }
    const lv = G.CLOCK && G.CLOCK.current(), waiting = st.phase === 'playoffs' && st.playoff && !(lv && lv.pre.kind === 'playoff') && tab !== 'season';
    pb.classList.toggle('hidden', !waiting);
    if (waiting) pb.innerHTML = ic('trophy', 16) + '<span>Playoffs · Game ' + (st.playoff.log.length + 1) + ' vs ' + esc(st.playoff.opp ? st.playoff.opp.abbr : '') + ' is waiting. Series ' + st.playoff.w + '–' + st.playoff.l + '</span><b>Play</b>';
  }
  function render() {
    const v = $('#view');
    if (tab === 'train' && P.running) { header(); return; }
    if (tab !== 'train') { stopPractice(); drillMode = false; }
    const keep = v.scrollTop;
    v.innerHTML = tab === 'team' ? renderTeam() : tab === 'train' ? renderTrain() : tab === 'season' ? renderSeason()
      : tab === 'office' ? renderOffice() : tab === 'store' ? renderStore() : renderTrophies();
    v.dataset.tab = tab;
    v.scrollTop = keep;
    if (tab === 'season') liveLoop(); else cancelAnimationFrame(liveRaf);
    if (tab === 'train' && !drillMode) clickLoop();
    const aa = $('#autoAll'); if (aa) aa.addEventListener('change', () => { autoAll = aa.checked; });
    const au = $('#autoUp'); if (au) au.addEventListener('change', () => { ST.setAutoUp(au.checked); });
    header();
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    maybeSheets();
  }
  function setTab(t) { if (t !== tab) { selSwap = null; editMode = false; } tab = t; render(); const v = $('#view'); if (v) v.scrollTop = 0; }
  function toast(msg, kind) {
    const n = document.createElement('div');
    n.className = 'toast ' + (kind || ''); n.textContent = msg;
    $('#toasts').appendChild(n);
    setTimeout(() => { n.style.opacity = '0'; n.style.transition = '.3s'; setTimeout(() => n.remove(), 320); }, 2600);
    const kids = $('#toasts').children; while (kids.length > 3) kids[0].remove();
  }
  function pushFeed(f) { feed.unshift(f); if (feed.length > 60) feed.pop(); }

  G.UI = {
    render, setTab, header, toast, openModal, closeModal, playerSheet, gearPicker, xfPicker, pendingSheet, historySheet, coachSheet, tuneSheet, savesSheet, popHTML, placePop,
    jerseySVG, crestSVG, KIT_PRESETS, setLook, resetLook, get lookDraft() { return lookDraft; }, pushFeed, stopPractice, startRound, refreshShop, queueCard, maybeSheets, kitSheet, kitPreview, renameSheet,
    tradeSheet, fachSheet, resetTuning, draftReveal, draftAllSheet, awaySheet, prestigeSheet, togglePrest, get prestSel() { return prestSel; }, dailySheet, adBreak, toggleTrade, autoTrade, clearTrade, setTradePos, doTrade, clickTap, locked, arming, modalOpen,
    get kitDraft() { return kitDraft; }, set kitDraft(v) { kitDraft = v; },
    get tab() { return tab; },
    get selSwap() { return selSwap; }, set selSwap(v) { selSwap = v; },
    get editMode() { return editMode; }, set editMode(v) { editMode = v; if (!v) selSwap = null; },
    get drillMode() { return drillMode; }, set drillMode(v) { drillMode = v; },
    get autoAll() { return autoAll; },
    clearFeed() { feed = []; }
  };
})(window.BK = window.BK || {});
