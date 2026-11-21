/* Breakaway — boot, clock and events */
(function (G) {
  'use strict';
  const D = G.DATA, M = G.M, ST = G.ST, UI = G.UI, P = G.PRACTICE, A = G.ART;
  const $ = s => document.querySelector(s);

  // ---------------------------------------------------------- onboarding
  const kit = { c1: '#c8102e', c2: '#ffffff', c3: '#101820', pattern: 'yoke', crest: 'shield', fav: 'CA' };
  function obPreview() {
    kit.c1 = $('#c1').value; kit.c2 = $('#c2').value; kit.c3 = $('#c3').value;
    $('#jerseyPrev').innerHTML = UI.jerseySVG(kit, 168);
  }
  function obChips() {
    $('#obPatterns').innerHTML = D.PATTERNS.map(p => '<button type="button" class="chip' + (p === kit.pattern ? ' on' : '') + '" data-pat="' + p + '">' + p[0].toUpperCase() + p.slice(1) + '</button>').join('');
    $('#obCrests').innerHTML = D.CRESTS.map(c => '<button type="button" class="chip crest' + (c === kit.crest ? ' on' : '') + '" data-crest="' + c + '">' + UI.crestSVG(c, 'currentColor', 16) + '</button>').join('');
    $('#obFlag').innerHTML = A.flag(kit.fav, 26);
  }
  function shuffleName() {
    $('#obCity').value = M.pick(D.CITY_BY_NAT[kit.fav] || D.CITIES);
    $('#obName').value = M.pick(D.MASCOTS);
  }
  function initOnboard() {
    const sel = $('#obFav');
    sel.innerHTML = D.NATIONS.slice().sort((a, b) => a.n.localeCompare(b.n)).map(n => '<option value="' + n.c + '"' + (n.c === kit.fav ? ' selected' : '') + '>' + n.n + '</option>').join('');
    sel.addEventListener('change', () => { kit.fav = sel.value; obChips(); shuffleName(); });
    obChips(); shuffleName(); obPreview();
    // other save files: a way back to an existing team from the new-team screen
    const others = []; for (let i = 0; i < ST.SLOTS; i++) { const s = i !== ST.curSlot() && ST.slotInfo(i); if (s) others.push([i, s]); }
    const ob = $('#obSlots');
    if (ob && others.length) {
      ob.innerHTML = '<span>Or go back to a saved team</span>' + others.map(([i, s]) => '<button class="btn sm" data-obslot="' + i + '">' + s.city + ' ' + s.name + ' · Div ' + s.div + '</button>').join('');
      ob.addEventListener('click', e => { const b = e.target.closest('[data-obslot]'); if (b && ST.useSlot(+b.dataset.obslot)) location.reload(); });
    }
    ['c1', 'c2', 'c3'].forEach(id => $('#' + id).addEventListener('input', obPreview));
    $('#obShuffle').addEventListener('click', shuffleName);
    $('#obStart').addEventListener('click', () => {
      const city = ($('#obCity').value || 'Harbor').trim().slice(0, 14);
      const name = ($('#obName').value || 'Club').trim().slice(0, 14);
      ST.newGame({ city, name, abbr: (city.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'HAR').toUpperCase(), c1: kit.c1, c2: kit.c2, c3: kit.c3, pattern: kit.pattern, crest: kit.crest, fav: kit.fav });
      enterApp();
    });
    document.addEventListener('click', e => {
      if (!$('#app').classList.contains('hidden')) return;
      const pat = e.target.closest('[data-pat]'); if (pat) { kit.pattern = pat.dataset.pat; obChips(); obPreview(); }
      const cr = e.target.closest('[data-crest]'); if (cr) { kit.crest = cr.dataset.crest; obChips(); obPreview(); }
    });
  }
  function enterApp() {
    $('#onboard').classList.add('hidden');
    $('#app').classList.remove('hidden');
    const dailyReady = ST.checkDaily();
    UI.render();
    startClock();
    if (dailyReady) setTimeout(() => { if (!UI.modalOpen()) UI.dailySheet(); }, 1200);
  }

  // ---------------------------------------------------------- clock
  // each regular-season game is simulated when its window opens, played out on the
  // Season panel, and its result lands when the window closes
  let clock = 0, live = null, livePO = null, lastTick = 0, hdrAt = 0;
  G.CLOCK = { current: () => livePO || live };
  function startClock() { if (clock) clearInterval(clock); lastTick = Date.now(); clock = setInterval(step, 250); }
  function step() {
    const st = ST.get(); if (!st) return;
    const now = Date.now();
    ST.tickPassive(Math.min(5, (now - lastTick) / 1000));
    lastTick = now;
    if (now - hdrAt > 1000) { hdrAt = now; UI.header(); }
    if (livePO) { if (now - livePO.start >= livePO.dur + 1200) finishPlayoffGame(); return; }
    if (st.phase !== 'season') { live = null; paintTick(0, 0); return; }
    const iv = D.TUNING.gameIntervalSec * 1000;
    if (!live || live.pre.idx !== st.gameIndex || live.pre.season !== st.season) {
      const pre = ST.prepareGame();
      live = pre ? { pre, start: st.lastTick || now, dur: iv } : null;
      if (UI.tab === 'season') UI.render();
    }
    if (!live) { ST.playNextGame(); UI.render(); return; }
    live.dur = iv;
    const since = now - (st.lastTick || now);
    if (since >= iv) commitLive();
    else paintTick(since / iv, Math.ceil((iv - since) / 1000));
  }
  function commitLive() {
    const st = ST.get();
    const out = ST.commitGame(live && live.pre);
    st.lastTick = Date.now();
    live = null;
    if (out) UI.pushFeed(out);
    if (UI.tab === 'season' || UI.tab === 'team') UI.render();
    UI.header();
  }
  function paintTick(frac, secs) {
    const b = $('#tickBar'), t = $('#tickTxt');
    if (b) b.style.width = (frac * 100).toFixed(1) + '%';
    if (t) t.textContent = secs ? secs + 's' : '';
  }
  function startPlayoffGame() {
    if (livePO) return;
    const pre = ST.preparePlayoff();
    if (!pre) return;
    livePO = { pre, start: Date.now(), dur: D.TUNING.playoffGameSec * 1000 };
    UI.render();
  }
  function finishPlayoffGame() {
    const pre = livePO.pre;
    livePO = null;
    const out = ST.commitPlayoff(pre);
    if (out) {
      let msg = (out.win ? 'W ' : 'L ') + out.gf + '–' + out.ga + (out.ot ? ' OT' : '');
      if (out.champion) msg = '🏆 Champions! ' + msg; else if (out.eliminated) msg += ' — eliminated'; else if (out.seriesDone) msg += ' — series won';
      UI.toast(msg, out.win ? 'win' : 'loss');
    }
    UI.render();
  }

  // ---------------------------------------------------------- taps that must feel instant
  function onPointer(e) {
    const g = e.target.closest('.golden');
    if (g) { e.preventDefault(); UI.clickTap(e.clientX, e.clientY, true); return; }
    const pk = e.target.closest('#ckArena');
    if (pk) {
      e.preventDefault(); UI.clickTap(e.clientX, e.clientY, false);
      // hold-to-tap ($0.99 unlock): keep a finger down and it taps twice a second, multiplier capped at 2.5x
      const st = ST.get();
      if (st && st.holdTap) { stopHold(); hold = { x: e.clientX, y: e.clientY, t: setTimeout(() => { hold.i = setInterval(() => UI.clickTap(hold.x, hold.y, false, true), 500); UI.holdState(true); }, 450) }; }
    }
  }
  let hold = null;
  function stopHold() { if (hold) { clearTimeout(hold.t); clearInterval(hold.i); hold = null; UI.holdState(false); } }
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => document.addEventListener(t, stopHold));
  document.addEventListener('pointermove', e => { if (hold) { const ar = e.target.closest && e.target.closest('#ckArena'); if (ar) { hold.x = e.clientX; hold.y = e.clientY; } else stopHold(); } });
  document.addEventListener('visibilitychange', stopHold);

  // ---------------------------------------------------------- events
  function onClick(e) {
    const st = ST.get();
    const T = e.target;
    if (!st || T.closest('#ckArena') || T.closest('.golden')) return;
    // reward and results sheets cannot be tapped past, and ignore taps for a moment after opening
    if (T.closest('#sheet') && UI.arming()) return;
    if (T.id === 'modal') { if (!UI.locked()) UI.closeModal(); return; }

    const gt = T.closest('[data-gotab]'); if (gt) { UI.setTab(gt.dataset.gotab); return; }
    const tab = T.closest('#nav button');
    if (tab) { UI.setTab(tab.dataset.tab); return; }
    if (T.closest('#btnTune')) { UI.tuneSheet(); return; }
    const sl = T.closest('[data-slot]'); if (sl) { if (ST.useSlot(+sl.dataset.slot)) location.reload(); return; }
    const sd = T.closest('[data-slotdel]');
    if (sd) {
      const i = +sd.dataset.slotdel;
      if (!sd.dataset.sure) { sd.dataset.sure = '1'; sd.textContent = 'Tap again to delete'; sd.classList.add('danger'); return; }
      const cur = i === ST.curSlot(); ST.deleteSlot(i); if (cur) location.reload(); else UI.savesSheet(); return;
    }

    const kp = T.closest('[data-kpat]'), kc = T.closest('[data-kcrest]'), kpal = T.closest('[data-kpal]'), klg = T.closest('[data-klogo]'), ksw = T.closest('[data-act="kswap"]');
    if ((kp || kc || kpal || klg || ksw) && UI.kitDraft) {
      const k = UI.kitDraft;
      k.city = $('#kCity').value; k.name = $('#kName').value; k.abbr = $('#kAbbr').value;
      if (kp) k.pattern = kp.dataset.kpat;
      else if (kc) k.crest = kc.dataset.kcrest;
      else if (klg) k.lstyle = klg.dataset.klogo;
      else if (ksw) { const c = k.c1; k.c1 = k.c2; k.c2 = c; }
      else { const c = UI.KIT_PRESETS[+kpal.dataset.kpal]; k.c1 = c[0]; k.c2 = c[1]; k.c3 = c[2]; }
      const sc = document.querySelector('#sheet').scrollTop; UI.kitSheet(); document.querySelector('#sheet').scrollTop = sc; return;
    }

    const el = sel => T.closest(sel);
    let x;
    if ((x = el('[data-fuse]'))) { if (ST.fuse(x.dataset.fuse)) UI.render(); return; }
    if ((x = el('[data-trade]'))) { UI.tradeSheet(+x.dataset.trade); return; }
    if ((x = el('[data-farescout]'))) {
      if (x.dataset.farescout === 'token') { if (ST.faRescout('token')) UI.render(); }
      else UI.adBreak(3, () => { ST.faRescout('ad'); UI.closeModal(); UI.render(); });
      return;
    }
    if ((x = el('[data-cedit]'))) { UI.coachEdit(x.dataset.cedit, x.dataset.val); return; }
    if ((x = el('[data-tin]'))) { UI.tinToggle(x.dataset.tin); return; }
    if ((x = el('[data-tinall]'))) { UI.tinAll(x.dataset.tinall); return; }
    if ((x = el('[data-tinclear]'))) { UI.tinClear(); return; }
    if ((x = el('[data-tinkind]'))) { UI.tinKindSet(x.dataset.tinkind); return; }
    if ((x = el('[data-dotin]'))) { UI.tinDo(); UI.header(); return; }
    if ((x = el('[data-batch]'))) { ST.batchTrade(+x.dataset.batch); UI.render(); UI.header(); return; }
    if ((x = el('[data-lock]'))) { ST.toggleLock(x.dataset.lock); UI.playerSheet(x.dataset.lock); UI.render(); return; }
    if ((x = el('[data-fach]'))) { if (ST.offerFach(x.dataset.fach)) UI.fachSheet(); return; }
    if ((x = el('[data-fachpick]'))) { if (ST.takeFach(x.dataset.fachpick)) { UI.closeModal(); UI.render(); } return; }
    if ((x = el('[data-psel]'))) { UI.togglePrest(x.dataset.psel); return; }
    if ((x = el('[data-tauto]'))) { UI.autoTrade(+x.dataset.tauto); return; }
    if ((x = el('[data-tclear]'))) { UI.clearTrade(+x.dataset.tclear); return; }
    if ((x = el('[data-tpos]'))) { UI.setTradePos(+x.dataset.ti, x.dataset.tpos); return; }
    if ((x = el('[data-tsel]'))) { UI.toggleTrade(+x.dataset.ti, x.dataset.tsel); return; }
    if ((x = el('[data-dotrade]'))) { UI.doTrade(+x.dataset.dotrade); return; }
    if ((x = el('[data-draft]'))) { if (ST.openBoard(+x.dataset.draft)) { UI.render(); UI.boardSheet(); } return; }
    if ((x = el('[data-board]'))) { const r = ST.chooseBoard(+x.dataset.board); if (r) { UI.render(); UI.draftReveal(r); } return; }
    if ((x = el('[data-combine]'))) { if (ST.combinePicks(+x.dataset.combine)) UI.render(); return; }
    if ((x = el('[data-fa]'))) { if (ST.signAgent(+x.dataset.fa)) UI.render(); return; }
    if ((x = el('[data-salvall]'))) { ST.salvageAll(x.dataset.salvall); UI.render(); return; }
    if ((x = el('[data-tradeup]'))) { if (ST.tradeUpGear(x.dataset.tradeup)) UI.render(); return; }
    if ((x = el('[data-buyboost]'))) { if (ST.buyBoost(x.dataset.buyboost)) UI.render(); return; }
    if ((x = el('[data-boost]'))) { if (ST.activateBoost(x.dataset.boost)) UI.render(); return; }
    if ((x = el('[data-claim]'))) { ST.claimAch(+x.dataset.claim); UI.render(); return; }
    if ((x = el('[data-style]'))) { ST.setStyle(x.dataset.style); UI.coachSheet(); return; }

    // player tiles: open the card, or select and swap in Edit lines
    if ((x = el('[data-p]'))) {
      const id = x.dataset.p;
      if (UI.editMode && UI.tab === 'team') {
        if (!UI.selSwap) UI.selSwap = id;
        else if (UI.selSwap === id) UI.selSwap = null;
        else if (ST.canSwap(UI.selSwap, id)) { ST.lineupSwap(UI.selSwap, id); UI.selSwap = null; }
        else UI.selSwap = id;
        UI.render(); return;
      }
      UI.playerSheet(id); return;
    }

    if ((x = el('[data-act]'))) {
      const a = x.dataset.act;
      switch (a) {
        case 'close': UI.closeModal(); return;
        case 'back': UI.playerSheet(x.dataset.pid); return;
        case 'history': UI.historySheet(); return;
        case 'coach': UI.coachSheet(); return;
        case 'editlines': UI.editMode = !UI.editMode; UI.render(); return;
        case 'autoequip': { const n = ST.autoEquip(UI.autoAll); UI.toast(n ? 'Equipped ' + n + ' piece' + (n > 1 ? 's' : '') + ', best gear to best players' : 'Nothing to change: everyone already has their best available gear'); UI.render(); return; }
        case 'swapmode': UI.closeModal(); UI.setTab('team'); UI.editMode = true; UI.selSwap = x.dataset.pid; UI.render(); return;
        case 'nextseason': ST.beginNextSeason(); UI.clearFeed(); UI.render(); return;
        case 'playoffgame': startPlayoffGame(); return;
        case 'drill': UI.drillMode = true; UI.render(); return;
        case 'drillback': UI.drillMode = false; UI.render(); return;
        case 'startround': UI.startRound(); return;
        case 'again': UI.closeModal(); UI.render(); setTimeout(UI.startRound, 60); return;
        case 'spend': UI.closeModal(); UI.drillMode = false; UI.setTab('team'); return;
        case 'topractice': UI.closeModal(); UI.setTab('train'); return;
        case 'tobench': UI.closeModal(); UI.setTab('team'); setTimeout(() => { const b = document.querySelector('.bgrid'); if (b) b.scrollIntoView({ block: 'center' }); }, 50); return;
        case 'demo': if (!st.dev) return; ST.setDemo(!st.demo); st.lastTick = Date.now(); live = null; UI.render(); return;
        case 'rescout': { const pid = x.dataset.pid, rd = +x.dataset.round; UI.adBreak(3, () => { const r = ST.rescout(pid, rd); UI.render(); if (r) UI.draftReveal(r); else UI.closeModal(); }); return; }
        case 'devmode': st.dev = !st.dev; if (!st.dev) { UI.resetTuning(); if (st.demo) { ST.setDemo(false); st.lastTick = Date.now(); live = null; } } ST.save(); UI.tuneSheet(); UI.render(); return;
        case 'draftall': { const out = []; if (st.board) { const d0 = ST.chooseBoard(ST.scoutPick(st.board)); if (d0) out.push(d0); } for (let r = 1; r <= 7; r++) while (st.picks && st.picks[r] > 0) { const d = ST.autoDraft(r); if (!d) break; out.push(d); } UI.render(); if (out.length) UI.draftAllSheet(out); return; }
        case 'board': UI.boardSheet(); return;
        case 'boardrescout': UI.adBreak(3, () => { ST.rescoutBoard(); UI.boardSheet(); }); return;
        case 'prestige': UI.prestigeSheet(); return;
        case 'doprestige':
          if (x.dataset.sure) { if (ST.prestige(UI.prestSel)) { UI.closeModal(); const tb = document.querySelector('[data-tab=team]'); if (tb) tb.click(); else UI.render(); UI.header(); } }
          else { x.dataset.sure = '1'; x.textContent = 'Tap again to start the new franchise'; }
          return;
        case 'daily': UI.dailySheet(); return;
        case 'claimdaily': ST.claimDaily(); UI.closeModal(); UI.render(); UI.header(); setTimeout(() => UI.maybeSheets(), 300); return;
        case 'lookreset': UI.resetLook(); return;
        case 'poinstant': if (st.dev && !livePO && st.phase === 'playoffs') { startPlayoffGame(); if (livePO) finishPlayoffGame(); } return;
        case 'poskip': if (livePO) finishPlayoffGame(); return;
        case 'skip': if (st.dev && st.phase === 'season') { if (!live) step(); if (live) commitLive(); } return;
        case 'devgrant': if (!st.dev) return; ST.devGrant(); UI.closeModal(); UI.render(); return;
        case 'hint': st.hintClosed = true; ST.save(); UI.render(); return;
        case 'kit': UI.kitDraft = null; UI.kitSheet(); return;
        case 'saves': UI.savesSheet(); return;
        case 'tradein': UI.tradeInSheet(); return;
        case 'coachedit': UI.coachEditSheet(); return;
        case 'coachsave': UI.coachSave(); return;
        case 'chemnotes': st.showChem = !st.showChem; ST.save(); UI.render(); return;
        case 'kitclose': UI.kitDraft = null; UI.closeModal(); return;
        case 'savekit': {
          const k = UI.kitDraft, t = st.team;
          k.city = ($('#kCity').value || t.city).trim().slice(0, 14);
          k.name = ($('#kName').value || t.name).trim().slice(0, 14);
          k.abbr = (($('#kAbbr').value || t.abbr).replace(/[^A-Za-z0-9]/g, '').slice(0, 3) || t.abbr).toUpperCase();
          Object.assign(t, { c1: k.c1, c2: k.c2, c3: k.c3, pattern: k.pattern, crest: k.crest, city: k.city, name: k.name, abbr: k.abbr, lstyle: k.lstyle });
          const me = ST.teamById('me'); if (me) { me.name = k.city + ' ' + k.name; me.abbr = k.abbr; }
          UI.kitDraft = null; ST.save(); UI.closeModal(); UI.render(); return;
        }
        case 'reroll': ST.rerollPick(); UI.pendingSheet(); return;
        case 'iap': if (!st.doubler) { st.doubler = true; ST.toast('Puck doubler active — 2× income forever', 'promo'); ST.save(); UI.render(); } return;
        case 'wipe':
          if (x.dataset.sure) { ST.wipe(); location.reload(); }
          else { x.dataset.sure = '1'; x.textContent = 'Tap again to delete everything'; x.classList.add('danger'); }
          return;
        case 'savename': {
          const p = st.team.roster.find(q => q.id === x.dataset.pid);
          if (UI.lookDraft) p.look = Object.assign({}, UI.lookDraft);
          const v = ($('#rnName').value || '').trim(), n = parseInt($('#rnNum').value, 10);
          if (v) p.name = v.slice(0, 22);
          if (n >= 1 && n <= 99 && n !== p.num) { const clash = st.team.roster.find(q => q.num === n && q.id !== p.id); if (clash) clash.num = p.num; p.num = n; }
          ST.save(); UI.playerSheet(p.id); UI.render(); return;
        }
      }
    }

    if ((x = el('[data-trainall]'))) { const p = st.team.roster.find(q => q.id === x.dataset.trainall); Object.keys(p.a).forEach(k => ST.spendUpgrade(p.id, k)); UI.playerSheet(p.id); UI.render(); return; }
    if ((x = el('[data-up]'))) { if (ST.spendUpgrade(x.dataset.pid, x.dataset.up)) { UI.playerSheet(x.dataset.pid); UI.header(); } return; }
    if ((x = el('[data-look]'))) { UI.setLook(x.dataset.look, x.dataset.val); return; }
    if ((x = el('[data-buyshard]'))) { if (ST.buyShards(x.dataset.buyshard)) { UI.render(); UI.header(); } return; }
    if ((x = el('[data-bringback]'))) {
      if (x.dataset.sure) { const sc = $('#sheet').scrollTop; if (ST.bringBack(x.dataset.bringback)) { UI.historySheet(); $('#sheet').scrollTop = sc; UI.render(); } }
      else { x.dataset.sure = '1'; x.textContent = 'Tap to confirm $0.99 (demo)'; }
      return;
    }
    if ((x = el('[data-holdbuy]'))) {
      if (x.dataset.sure) { st.holdTap = true; ST.save(); ST.toast('Hold to tap unlocked. Keep a finger on the ice.', 'gold'); UI.render(); }
      else { x.dataset.sure = '1'; x.textContent = 'Confirm $0.99 (demo)'; }
      return;
    }
    if ((x = el('[data-legbuy]'))) {
      if (x.dataset.sure) { if (ST.buyLegend(x.dataset.legbuy)) { UI.playerSheet(x.dataset.legbuy); UI.render(); } }
      else { x.dataset.sure = '1'; x.textContent = 'Tap to confirm $0.99 (demo)'; }
      return;
    }
    if ((x = el('[data-break]'))) { if (ST.breakthrough(x.dataset.break)) UI.playerSheet(x.dataset.break); return; }
    if ((x = el('[data-promote]'))) { if (ST.promote(x.dataset.promote)) UI.playerSheet(x.dataset.promote); return; }
    if ((x = el('[data-gslot]'))) { UI.gearPicker(x.dataset.pid, x.dataset.gslot); return; }
    if ((x = el('[data-equip]'))) { ST.equip(x.dataset.pid, x.dataset.equip); UI.playerSheet(x.dataset.pid); UI.render(); return; }
    if ((x = el('[data-unequip]'))) { ST.unequip(x.dataset.pid, x.dataset.unequip); UI.playerSheet(x.dataset.pid); UI.render(); return; }
    if ((x = el('[data-salv]'))) { ST.salvage(x.dataset.salv); UI.gearPicker(x.dataset.pid, x.dataset.slot); return; }
    if ((x = el('[data-glevel]'))) {
      const g = ST.findGear(x.dataset.glevel);
      const owner = g && st.team.roster.find(p => Object.keys(p.gear).some(k => p.gear[k] && p.gear[k].id === g.id));
      if (ST.levelGear(x.dataset.glevel) && owner) UI.playerSheet(owner.id);
      return;
    }
    if ((x = el('[data-setxf]'))) { ST.setXF(x.dataset.pid, x.dataset.setxf, +x.dataset.xslot || 1); UI.playerSheet(x.dataset.pid); return; }
    if ((x = el('[data-xf]'))) { UI.xfPicker(x.dataset.xf, +x.dataset.xslot || 1); return; }
    if ((x = el('[data-rename]'))) { UI.renameSheet(x.dataset.rename); return; }
    if ((x = el('[data-take]'))) { ST.takePick(+x.dataset.take); UI.closeModal(); UI.render(); return; }
    if ((x = el('[data-nat]'))) { ST.takeChampionPack(x.dataset.nat); UI.closeModal(); UI.render(); return; }
    if ((x = el('[data-shop]'))) {
      const it = st.shop[+x.dataset.shop];
      if (!it || it.sold || st.pucks < it.cost) return;
      st.pucks -= it.cost; it.sold = true; st.gear.push(it.g);
      ST.toast('Bought ' + M.gearName(it.g) + '. It is in your locker; Auto-equip on the Team tab will fit it.', 'win'); ST.save(); UI.render();
      return;
    }
    if ((x = el('[data-tape]'))) { if (st.tape < 40) return; st.tape -= 40; st.shards[x.dataset.tape] += 5; ST.save(); UI.render(); return; }
    if ((x = el('[data-ascrap]'))) { ST.setAutoScrap(+x.dataset.ascrap); UI.render(); return; }
    if ((x = el('[data-fac]'))) { if (ST.buildFac(x.dataset.fac)) { UI.render(); UI.header(); } return; }
    if ((x = el('[data-coach]'))) { if (ST.upgradeCoach(x.dataset.coach)) UI.coachSheet(); return; }
  }

  function onInput(e) {
    const kc = e.target.closest('[data-kc]');
    if (kc && UI.kitDraft) { UI.kitDraft[kc.dataset.kc] = kc.value; UI.kitPreview(); return; }
    if (e.target.id === 'kAbbr' && UI.kitDraft) { UI.kitDraft.abbr = e.target.value; const n = document.getElementById('kitPrev'); if (n) UI.kitPreview(); return; }
    if (e.target.id === 'rnNum') {
      const n = parseInt(e.target.value, 10), j = document.querySelector('.rename-jersey');
      if (j) j.innerHTML = UI.jerseySVG(ST.get().team, 92, n >= 1 && n <= 99 ? n : '');
      return;
    }
    const t = e.target.closest('[data-tune]');
    if (!t) return;
    D.TUNING[t.dataset.tune] = parseFloat(t.value);
    const o = document.getElementById('tv_' + t.dataset.tune); if (o) o.textContent = D.TUNING[t.dataset.tune];
  }

  // ---------------------------------------------------------- boot
  function boot() {
    document.addEventListener('click', onClick);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('input', onInput);
    ST.on((ev, data) => {
      if (ev === 'toast') UI.toast(data.msg, data.kind);
      if (ev === 'pending') UI.maybeSheets();
      if (ev === 'card') UI.queueCard(data);
      if (ev === 'seasonEnd' || ev === 'playoffs' || ev === 'missed') { live = null; if (UI.tab === 'season') UI.render(); }
    });
    // welcome-back summary after 5+ minutes away (or any games played); it shows before the daily calendar
    let awayShown = false;
    function away(r) {
      awayShown = !!(r && (r.games || r.awaySec >= 300));
      if (awayShown) setTimeout(() => { if (!UI.modalOpen()) UI.awaySheet(r); }, 500);
    }
    document.addEventListener('visibilitychange', () => {
      if (!ST.get()) return;
      if (document.hidden) { UI.stopPractice(); ST.save(); }
      else { live = null; lastTick = Date.now(); away(ST.catchUp()); const dr = ST.checkDaily(); UI.render(); if (dr && !awayShown) setTimeout(() => { if (!UI.modalOpen()) UI.dailySheet(); }, 1200); }
    });
    if (ST.load()) { const r = ST.catchUp(); enterApp(); away(r); }
    else initOnboard();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.BK = window.BK || {});
