/* Breakaway — generated art: icons, player portraits, gear, team badges, crests, jerseys */
(function (G) {
  'use strict';
  const D = G.DATA;

  function hash(s) { let x = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function rng(seed) {
    let a = seed || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const pickR = (r, a) => a[Math.floor(r() * a.length)];

  // ---------------------------------------------------------------- icons (24px grid, currentColor)
  const I = {
    puck: '<ellipse cx="12" cy="10" rx="9" ry="4" fill="currentColor"/><path d="M3 10v4c0 2.2 4 4 9 4s9-1.8 9-4v-4c0 2.2-4 4-9 4s-9-1.8-9-4z" fill="currentColor" opacity=".7"/>',
    shard: '<path d="M12 2 20 9 12 22 4 9z" fill="currentColor"/><path d="M4 9h16M12 2 9 9l3 13 3-13z" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1"/>',
    tape: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="4.5"/><circle cx="12" cy="12" r="2.5" fill="currentColor" opacity=".5"/>',
    token: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z" fill="currentColor"/><path d="M9 7v10" stroke="rgba(0,0,0,.3)" stroke-dasharray="2 2"/>',
    team: '<path d="M8 3h8l2 2 4 2-2 5-2-1v10H6V11l-2 1-2-5 4-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    practice: '<path d="M15 2 9 17c-.4 1-1.3 1.6-2.4 1.6H3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><ellipse cx="17" cy="19" rx="4" ry="1.8" fill="currentColor"/>',
    season: '<rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="15.5" r="2" fill="currentColor"/>',
    store: '<path d="M5 8h14l-1 12H6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    trophy: '<path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 13h4l1 5H9z M7 19h10v2H7z" fill="currentColor"/>',
    whistle: '<circle cx="9" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M13 9h8v4h-5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="9" cy="14" r="1.8" fill="currentColor"/>',
    jersey: '<path d="M8 3h8l2 2 4 2-2 5-2-1v10H6V11l-2 1-2-5 4-2z" fill="currentColor"/>',
    gear: '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    star: '<path d="M12 2.5 14.8 9h6.7l-5.4 4.1 2 6.9L12 16l-6.1 4 2-6.9L2.5 9h6.7z" fill="currentColor"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/>',
    swap: '<path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
    pack: '<rect x="6" y="3" width="13" height="17" rx="2" fill="currentColor" opacity=".45" transform="rotate(8 12 12)"/><rect x="5" y="4" width="13" height="17" rx="2" fill="currentColor"/><path d="M11.5 9l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z" fill="rgba(0,0,0,.35)"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor"/>',
    fuse: '<path d="M4 6h5v5H4zM15 6h5v5h-5zM9.5 15h5v5h-5z" fill="currentColor"/><path d="M6.5 11v2.5H12V15M17.5 11v2.5H12" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    office: '<rect x="3" y="7" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12.5h18" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    medal: '<path d="M7 2h4l2 6H9zM13 2h4l-2 6h-4z" fill="currentColor" opacity=".6"/><circle cx="12" cy="15" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 12l1 2h2l-1.6 1.3.6 2.2L12 16.3l-2 1.2.6-2.2L9 14h2z" fill="currentColor"/>',
    wrench: '<path d="M14.5 3.5a5 5 0 0 0-5.4 6.6L3 16.2V21h4.8l6.1-6.1a5 5 0 0 0 6.6-5.4l-3 3-3-.6-.6-3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    skip: '<path d="M5 5l9 7-9 7zM16 5h3v14h-3z" fill="currentColor"/>',
    shield: '<path d="M12 2 20 5v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" fill="currentColor"/>',
    edit2: '<path d="M4 7h10M4 12h16M4 17h7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="18" cy="7" r="2.4" fill="currentColor"/><circle cx="15" cy="17" r="2.4" fill="currentColor"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    check: '<path d="M5 12.5 10 17 19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    close: '<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    chev: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    cone: '<path d="M12 3 18 19H6z" fill="currentColor"/><path d="M5 19h14v2H5z" fill="currentColor" opacity=".6"/><path d="M8.6 12h6.8" stroke="#fff" stroke-width="2"/>',
    net: '<path d="M3 20V6h18v14" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3 10h18M3 14h18M8 6v14M12 6v14M16 6v14" stroke="currentColor" stroke-width=".9" opacity=".55"/>',
    pass: '<circle cx="5" cy="17" r="2.6" fill="currentColor"/><circle cx="19" cy="15" r="2.6" fill="currentColor"/><circle cx="12" cy="5" r="2.6" fill="currentColor"/><path d="M6.5 15 11 7M13.5 7l4 6" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 2"/>',
    mask: '<path d="M5 10a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0z" fill="currentColor"/><path d="M8 11h8M8 14h8M10 9.5v7M14 9.5v7" stroke="rgba(0,0,0,.45)" stroke-width="1.2"/>',
    mix: '<path d="M4 7h4l8 10h4M4 17h4l2-2.5M14 9.5 16 7h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    flame: '<path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5.5.3 1.5 1.2 2.3 2 1.5C12.8 7.6 12 5 12 2z" fill="currentColor"/>',
    dumbbell: '<path d="M2 10v4M5 7v10M19 7v10M22 10v4M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'
  };
  function icon(name, size, cls) {
    const s = size || 18;
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true">' + (I[name] || '') + '</svg>';
  }

  // ---------------------------------------------------------------- gear (32px grid)
  const GEAR = {
    stick: '<path d="M22 3 12.5 23.5c-.6 1.3-1.9 2.1-3.3 2.1H4.5a1.6 1.6 0 0 0 0 3.2h5.4c2.6 0 5-1.5 6.1-3.9L25.5 4.6z" fill="currentColor"/><path d="M20.2 7.2l3 1.4M18.6 10.6l3 1.4" stroke="rgba(0,0,0,.35)" stroke-width="1.6"/>',
    skates: '<path d="M7 4h7l1 9 8 3c2 .8 3 2.2 3 4v2H6z" fill="currentColor"/><path d="M4 26h23" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M9 25v-3M22 25v-3" stroke="currentColor" stroke-width="2"/><path d="M8.5 8h5M8.5 11h5" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>',
    gloves: '<path d="M8 28V15l-2-7a2 2 0 0 1 3.8-1.2L11 11V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v12c0 3-1 5-3 6v4z" fill="currentColor"/><path d="M8 22h12" stroke="rgba(0,0,0,.35)" stroke-width="2"/>',
    helmet: '<path d="M5 19C5 10 10 5 17 5s11 5 11 13v3h-6l-2-4h-8v6H8z" fill="currentColor"/><path d="M12 9c3-1.6 8-1.4 11 1" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1.6"/><path d="M20 21h9" stroke="currentColor" stroke-width="2"/>',
    pads: '<rect x="5" y="4" width="9" height="24" rx="3" fill="currentColor"/><rect x="18" y="4" width="9" height="24" rx="3" fill="currentColor"/><path d="M5 11h9M5 17h9M18 11h9M18 17h9" stroke="rgba(0,0,0,.3)" stroke-width="1.6"/>',
    glove: '<path d="M6 13a10 10 0 0 1 20 0v6c0 5-4 9-9 9h-2c-5 0-9-4-9-9z" fill="currentColor"/><path d="M11 9c2 4 2 8 0 12M16 7v14M21 9c-2 4-2 8 0 12" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>',
    blocker: '<rect x="6" y="4" width="20" height="17" rx="3" fill="currentColor"/><path d="M12 21h8v7h-8z" fill="currentColor" opacity=".75"/><path d="M10 9h12M10 14h12" stroke="rgba(0,0,0,.3)" stroke-width="1.6"/>'
  };
  function gearIcon(slot, color, size) {
    const s = size || 28;
    return '<svg class="gi" viewBox="0 0 32 32" width="' + s + '" height="' + s + '" style="color:' + (color || 'currentColor') + '" aria-hidden="true">' + (GEAR[slot] || GEAR.stick) + '</svg>';
  }

  // ---------------------------------------------------------------- crests & jerseys
  const CREST = {
    shield: '<path d="M50 6 88 20v34c0 24-19 36-38 44C31 90 12 78 12 54V20z"/>',
    circle: '<circle cx="50" cy="50" r="42"/>',
    diamond: '<path d="M50 6 94 50 50 94 6 50z"/>',
    star: '<path d="M50 5 62 38h35L69 59l11 34-30-21-30 21 11-34L4 38h35z"/>',
    wing: '<path d="M8 40c26-16 58-16 84 0-14 4-24 10-30 18 14 2 24 7 30 14-30 10-60 6-84-10z"/>',
    anchor: '<path d="M44 14h12v20h16v12H56v40c14-2 24-11 27-24l11 4c-6 22-22 34-44 34S12 88 6 66l11-4c3 13 13 22 27 24V46H28V34h16z"/>',
    bolt: '<path d="M58 4 22 56h22l-6 40 38-56H54z"/>',
    leaf: '<path d="M50 6c16 20 34 26 34 46S68 92 50 94C32 92 16 72 16 52S34 26 50 6z"/>',
    bear: '<circle cx="28" cy="24" r="12"/><circle cx="72" cy="24" r="12"/><path d="M50 22c22 0 34 16 34 36S70 92 50 92 16 78 16 58s12-36 34-36z"/>',
    wolf: '<path d="M14 18 34 34h32l20-16-4 34c0 22-16 38-36 38S10 74 10 52z"/>',
    hawk: '<path d="M50 8c20 0 34 14 34 32 0 22-18 36-34 52C34 76 16 62 16 40 16 22 30 8 50 8z"/>',
    flame: '<path d="M50 4c6 20 26 26 26 48 0 22-12 42-26 42S24 74 24 52c0-14 10-20 14-30 4 10 10 12 12 4 2-8 0-14 0-22z"/>'
  };
  function crestSVG(kind, c, size) {
    const s = size || 30;
    return '<svg viewBox="0 0 100 100" width="' + s + '" height="' + s + '" fill="' + c + '" aria-hidden="true">' + (CREST[kind] || CREST.shield) + '</svg>';
  }
  let jseq = 0;
  // team logo: the crest set in a roundel, a shield, or on its own, with the club abbreviation
  function logoSVG(k, size) {
    const s = size || 60, st = k.lstyle || 'roundel', ab = (k.abbr || '').slice(0, 3).toUpperCase();
    const crest = (col, sc, tx, ty) => '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')" fill="' + col + '">' + (CREST[k.crest] || CREST.shield) + '</g>';
    let h = '<svg viewBox="0 0 100 100" width="' + s + '" height="' + s + '" aria-hidden="true">';
    if (st === 'shield') {
      h += '<path d="M50 3 93 17v35c0 27-21 40-43 46C28 92 7 79 7 52V17z" fill="' + k.c3 + '"/>' +
        '<path d="M50 9 87 21v31c0 23-18 34-37 40C31 86 13 75 13 52V21z" fill="' + k.c1 + '"/>' +
        '<path d="M50 14 82 24v28c0 20-15 30-32 35C33 82 18 72 18 52V24z" fill="none" stroke="' + k.c2 + '" stroke-width="1.6" opacity=".55"/>' +
        crest(k.c2, 0.42, 29, 18) +
        (ab ? '<text x="50" y="78" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="15" letter-spacing="1.5" fill="' + k.c2 + '">' + ab + '</text>' : '');
    } else if (st === 'crest') {
      h += crest(k.c3, 0.96, 2, 2) + crest(k.c1, 0.84, 8, 8) + crest(k.c2, 0.4, 30, 30);
    } else {
      h += '<circle cx="50" cy="50" r="47" fill="' + k.c3 + '"/><circle cx="50" cy="50" r="42" fill="' + k.c1 + '"/>' +
        '<circle cx="50" cy="50" r="36" fill="none" stroke="' + k.c2 + '" stroke-width="1.8"/>' +
        crest(k.c2, 0.44, 28, 17) +
        (ab ? '<text x="50" y="80" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="14" letter-spacing="2" fill="' + k.c2 + '">' + ab + '</text>' : '');
    }
    return h + '</svg>';
  }
  function jerseySVG(k, w, num) {
    const W = w || 150, H = Math.round(W * 1.12), id = 'jc' + (++jseq);
    const p = k.pattern;
    let marks = '';
    if (p === 'yoke') marks = '<path d="M38 24h74c8 8 12 18 13 28H25c1-10 5-20 13-28z" fill="' + k.c2 + '"/>';
    if (p === 'double') marks = '<rect x="18" y="104" width="114" height="9" fill="' + k.c2 + '"/><rect x="18" y="119" width="114" height="9" fill="' + k.c3 + '"/>';
    if (p === 'shoulder') marks = '<path d="M24 28c8-6 18-9 26-10v26H21z" fill="' + k.c2 + '"/><path d="M126 28c-8-6-18-9-26-10v26h29z" fill="' + k.c2 + '"/>';
    if (p === 'barber') { for (let i = 0; i < 7; i++) marks += '<rect x="' + (18 + i * 17) + '" y="18" width="8" height="132" fill="' + (i % 2 ? k.c2 : k.c3) + '" opacity=".85"/>'; }
    if (p === 'sash') marks = '<path d="M28 22 128 132l-16 12L14 36z" fill="' + k.c2 + '" opacity=".92"/>';
    const body = 'M55 12h40c3 9 10 14 20 14l26 12c5 2 7 7 5 12l-10 26c-1 5-6 7-11 5l-8-3v68c0 5-4 8-9 8H42c-5 0-9-3-9-8V78l-8 3c-5 2-10 0-11-5L4 50c-2-5 0-10 5-12l26-12c10 0 17-5 20-14z';
    return '<svg viewBox="0 0 150 168" width="' + W + '" height="' + H + '" aria-hidden="true">' +
      '<defs><clipPath id="' + id + '"><path d="' + body + '"/></clipPath></defs>' +
      '<path d="' + body + '" fill="' + k.c1 + '"/>' +
      '<g clip-path="url(#' + id + ')">' + marks +
      '<path d="M4 50 14 76 25 72 33 78" fill="none" stroke="' + k.c3 + '" stroke-width="5" opacity=".5"/>' +
      '<path d="M146 50 136 76 125 72 117 78" fill="none" stroke="' + k.c3 + '" stroke-width="5" opacity=".5"/></g>' +
      '<path d="M55 12c3 9 10 14 20 14s17-5 20-14" fill="none" stroke="' + k.c3 + '" stroke-width="5"/>' +
      '<path d="' + body + '" fill="none" stroke="' + k.c3 + '" stroke-width="3"/>' +
      (num != null
        ? '<text x="75" y="118" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="52" fill="' + k.c2 + '" stroke="' + k.c3 + '" stroke-width="2.5" paint-order="stroke">' + num + '</text>'
        : '<g transform="translate(53 56) scale(.44)">' + crestSVG(k.crest, k.c2, 100) + '</g>') +
      '</svg>';
  }

  // ---------------------------------------------------------------- portraits
  const SKIN = ['#f5d2b6', '#ecbb94', '#d9a073', '#bb7f52', '#8f5c38', '#5f3b23'];
  const HAIR = ['#1b1410', '#3a2516', '#5e3a1e', '#8c5a26', '#c99b52', '#d9c08a', '#7d7d7d', '#a3401f'];
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  // ---------------------------------------------------------------- portraits
  // Every skater wears the same team helmet and visor; hair, hair colour, beard and skin are the player's own look.
  // Goalies wear a painted mask with a cat-eye cage; the mask style is their look.
  const HAIR_STYLES = ['short', 'buzz', 'flow', 'mullet', 'curly', 'long'];
  const HAIR_N = { short: 'Short', buzz: 'Buzz', flow: 'Flow', mullet: 'Mullet', curly: 'Curly', long: 'Long' };
  const BEARDS = ['none', 'stubble', 'goatee', 'mustache', 'full', 'playoff'];
  const BEARD_N = { none: 'None', stubble: 'Stubble', goatee: 'Goatee', mustache: 'Mustache', full: 'Full', playoff: 'Playoff' };
  const MASKS = ['team', 'white', 'black', 'chrome', 'gold'];
  const MASK_N = { team: 'Team', white: 'White', black: 'Black', chrome: 'Chrome', gold: 'Gold' };
  // the look a player is born with: seeded from id and nation, so it never changes unless edited
  function defaultLook(p) {
    const r = rng(hash(p.id + '|' + p.nat));
    const nordic = ['SE', 'FI', 'NO', 'DK', 'IS', 'LV', 'EE', 'RU', 'DE', 'CZ', 'SK', 'CH', 'AT'].indexOf(p.nat) >= 0;
    const asian = ['JP', 'KR', 'CN', 'KZ'].indexOf(p.nat) >= 0;
    const skin = nordic ? Math.floor(r() * 3) : asian ? 1 + Math.floor(r() * 2) : Math.floor(r() * 9) % SKIN.length;
    const hc = nordic && r() < 0.5 ? 3 + Math.floor(r() * 3) : asian ? Math.floor(r() * 2) : Math.floor(r() * HAIR.length);
    const hair = pickR(r, ['short', 'short', 'flow', 'flow', 'buzz', 'mullet', 'curly', 'long']);
    const beard = pickR(r, ['none', 'none', 'none', 'stubble', 'stubble', 'goatee', 'mustache', 'full']);
    return { skin, hc, hair, beard, mask: 'team' };
  }
  function lookOf(p) { return Object.assign(defaultLook(p), p.look || {}); }

  function portrait(p, team, size, ring) {
    const s = size || 56, lk = lookOf(p);
    const skin = SKIN[lk.skin] || SKIN[1], hair = HAIR[lk.hc] || HAIR[1];
    const sk2 = shade(skin, 0.84), hairD = shade(hair, 0.75);
    const c1 = team.c1, c2 = team.c2, c3 = team.c3 || '#111';
    const bg = ring || '#3a4a60';
    let h = '<svg class="pt" viewBox="0 0 64 64" width="' + s + '" height="' + s + '" aria-hidden="true">' +
      '<circle cx="32" cy="32" r="31" fill="' + bg + '" opacity=".22"/>' +
      '<circle cx="32" cy="32" r="31" fill="url(#ptg)"/>' +
      '<g clip-path="url(#ptc)">';
    // hair that shows behind the head (drawn first)
    if (p.pos !== 'G') {
      if (lk.hair === 'flow') h += '<path d="M17 30c-2 6-1 11 3 14 2-3 3-6 3-9zM47 30c2 6 1 11-3 14-2-3-3-6-3-9z" fill="' + hair + '"/>';
      if (lk.hair === 'mullet') h += '<path d="M17.4 29c-1.4 7-.6 13 2.6 18.5l4.6-1.5c-1.6-4.6-2-9.8-1.6-15zM46.6 29c1.4 7 .6 13-2.6 18.5l-4.6-1.5c1.6-4.6 2-9.8 1.6-15z" fill="' + hair + '"/>';
      if (lk.hair === 'long') h += '<path d="M17 28c-3 9-2 17 4 21h22c6-4 7-12 4-21z" fill="' + hair + '"/>';
      if (lk.hair === 'curly') h += '<g fill="' + hair + '"><circle cx="18.5" cy="34" r="3"/><circle cx="20" cy="39" r="3"/><circle cx="45.5" cy="34" r="3"/><circle cx="44" cy="39" r="3"/></g>';
    }
    // shoulders, collar, neck
    h += '<path d="M5 66C7 51 18 45.5 32 45.5S57 51 59 66z" fill="' + c1 + '"/>' +
      '<path d="M5 66C7 51 18 45.5 32 45.5S57 51 59 66" fill="none" stroke="' + c3 + '" stroke-width="1.2" opacity=".5"/>' +
      '<path d="M22.5 47 32 55l9.5-8" fill="none" stroke="' + c2 + '" stroke-width="3.2" stroke-linejoin="round"/>' +
      '<path d="M26.5 38h11v10.5c-1.6 1.6-3.4 2.4-5.5 2.4s-3.9-.8-5.5-2.4z" fill="' + sk2 + '"/>';

    if (p.pos === 'G') {
      const M = { team: [c1, c2, '#0d1218'], white: ['#f2f5f8', c1, '#0d1218'], black: ['#161b22', c1, '#0d1218'], chrome: ['#c8d1db', c1, '#0d1218'], gold: ['#d9ae3f', c3, '#0d1218'] }[lk.mask] || [c1, c2, '#0d1218'];
      const base = M[0], paint = M[1];
      // backplate strap, then the shell
      h += '<path d="M17.5 33c-1-4 .5-8 2.5-9.5M46.5 33c1-4-.5-8-2.5-9.5" stroke="#1d242d" stroke-width="2.4" fill="none"/>' +
        '<path d="M32 7.5c-8.6 0-14 6.4-14 17.5 0 8.6 2.2 15.6 6.4 20.2 2.2 2.4 4.9 3.7 7.6 3.7s5.4-1.3 7.6-3.7c4.2-4.6 6.4-11.6 6.4-20.2 0-11.1-5.4-17.5-14-17.5z" fill="' + base + '"/>' +
        // paint: a stripe over the crown and flares down each cheek
        '<path d="M29 7.8h6l-.6 13h-4.8z" fill="' + paint + '"/>' +
        '<path d="M18.6 21c2.4-3.2 5-4.6 8-5.2-2.6 2.6-4 6-4.4 10.4-1.6.8-2.8 2-3.6 3.6zM45.4 21c-2.4-3.2-5-4.6-8-5.2 2.6 2.6 4 6 4.4 10.4 1.6.8 2.8 2 3.6 3.6z" fill="' + paint + '" opacity=".9"/>' +
        // face opening with the player's eyes behind it
        '<path d="M22.5 25.5c3-2.6 6.2-3.6 9.5-3.6s6.5 1 9.5 3.6l-.8 12.5c-2.4 3.6-5.4 5.4-8.7 5.4s-6.3-1.8-8.7-5.4z" fill="' + shade(skin, 0.72) + '"/>' +
        '<path d="M24.6 27.4l4-.6M39.4 27.4l-4-.6" stroke="' + shade(hair, 0.6) + '" stroke-width="1.3" stroke-linecap="round"/>' +
        '<ellipse cx="27.6" cy="30" rx="1.9" ry="1.2" fill="#eef2f6"/><ellipse cx="36.4" cy="30" rx="1.9" ry="1.2" fill="#eef2f6"/><circle cx="27.8" cy="30" r=".9" fill="#14181d"/><circle cx="36.2" cy="30" r=".9" fill="#14181d"/>' +
        // cat-eye cage: centre bar, eye rings, crossbars
        '<g fill="none" stroke="rgba(214,222,231,.9)" stroke-width=".8" stroke-linecap="round">' +
        '<path d="M32 22v21.3M23.6 27.6c2.6-.9 5.4-1.3 8.4-1.3s5.8.4 8.4 1.3"/>' +
        '<path d="M23.4 33.6h17.2M24.8 38h14.4"/><path d="M27 32.4v9M37 32.4v9"/></g>' +
        // chin and rim
        '<path d="M25.6 44.6c1.8 1.6 4 2.6 6.4 2.6s4.6-1 6.4-2.6" fill="none" stroke="' + paint + '" stroke-width="2"/>' +
        '<path d="M32 7.5c-8.6 0-14 6.4-14 17.5 0 8.6 2.2 15.6 6.4 20.2 2.2 2.4 4.9 3.7 7.6 3.7s5.4-1.3 7.6-3.7c4.2-4.6 6.4-11.6 6.4-20.2 0-11.1-5.4-17.5-14-17.5z" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/>' +
        '<path d="M24 12.5c2-2 4.6-3 7-3.3" stroke="rgba(255,255,255,.45)" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
    } else {
      const rx = 12.6, ry = 14.6;
      // ears, face
      h += '<ellipse cx="' + (32 - rx) + '" cy="32.5" rx="2.4" ry="3.6" fill="' + sk2 + '"/>' +
        '<ellipse cx="' + (32 + rx) + '" cy="32.5" rx="2.4" ry="3.6" fill="' + sk2 + '"/>' +
        '<ellipse cx="32" cy="31.5" rx="' + rx + '" ry="' + ry + '" fill="' + skin + '"/>';
      // beard under the features
      const jaw = 'M' + (32 - rx + 0.8) + ' 31.5c0 9 5 14.4 11.2 14.4S' + (32 + rx - 0.8) + ' 40.5 ' + (32 + rx - 0.8) + ' 31.5';
      if (lk.beard === 'stubble') h += '<path d="' + jaw + 'c-1.6 4.6-5.6 7.4-11.2 7.4s-9.6-2.8-11.2-7.4z" fill="' + hair + '" opacity=".28"/>';
      if (lk.beard === 'full') h += '<path d="' + jaw + 'c-1.8 4-5.4 6.2-11.2 6.2s-9.4-2.2-11.2-6.2z" fill="' + hair + '"/>';
      if (lk.beard === 'playoff') h += '<path d="M' + (32 - rx) + ' 30c-1 11 4 19 12 19s13-8 12-19c-2 5-6 7.6-12 7.6S' + (32 - rx + 2) + ' 35 ' + (32 - rx) + ' 30z" fill="' + hair + '"/>';
      if (lk.beard === 'goatee') h += '<path d="M29.2 43.2c.6 2.4 1.5 3.6 2.8 3.6s2.2-1.2 2.8-3.6c-.9.5-1.8.7-2.8.7s-1.9-.2-2.8-.7z" fill="' + hair + '"/>';
      // features
      h += '<path d="M24.6 27.6l4.6-.9M39.4 27.6l-4.6-.9" stroke="' + hairD + '" stroke-width="1.8" stroke-linecap="round"/>' +
        '<circle cx="27.2" cy="31.2" r="1.5" fill="#1b1b1b"/><circle cx="36.8" cy="31.2" r="1.5" fill="#1b1b1b"/>' +
        '<circle cx="27.7" cy="30.7" r=".45" fill="#fff" opacity=".8"/><circle cx="37.3" cy="30.7" r=".45" fill="#fff" opacity=".8"/>' +
        '<path d="M32 32.2l-1.5 5h2.8" fill="none" stroke="' + sk2 + '" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>';
      if (lk.beard === 'mustache' || lk.beard === 'full' || lk.beard === 'playoff' || lk.beard === 'goatee') h += '<path d="M27.6 39.6c1.6-1.4 3-1.6 4.4-.8 1.4-.8 2.8-.6 4.4.8-1.6.4-3 .3-4.4-.3-1.4.6-2.8.7-4.4.3z" fill="' + hairD + '"/>';
      h += '<path d="M29 41.4q3 1.8 6 0" fill="none" stroke="#6d3b30" stroke-width="1.3" stroke-linecap="round"/>';
      // sideburns and hair poking out under the helmet
      const sb = lk.hair === 'buzz' ? 1.2 : 2.2;
      h += '<path d="M' + (32 - rx + 0.2) + ' 26.5v' + (lk.hair === 'buzz' ? 4 : 6.5) + 'M' + (32 + rx - 0.2) + ' 26.5v' + (lk.hair === 'buzz' ? 4 : 6.5) + '" stroke="' + hair + '" stroke-width="' + sb + '"/>';
      if (lk.hair === 'curly') h += '<g fill="' + hair + '"><circle cx="21" cy="25.6" r="2.2"/><circle cx="43" cy="25.6" r="2.2"/></g>';
      if (lk.hair === 'flow' || lk.hair === 'long') h += '<path d="M19.4 25.4c-1 2-1.2 4-.6 6.2M44.6 25.4c1 2 1.2 4 .6 6.2" stroke="' + hair + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
      // one helmet for every skater: team shell, ear guards, centre ridge, clear visor
      h += '<path d="M16.6 29.5C16 14.5 22.5 9 32 9s16 5.5 15.4 20.5l-2.9 1-1.2-5.6C38.8 21.4 25.2 21.4 20.7 24.9l-1.2 5.6z" fill="' + c1 + '"/>' +
        '<path d="M16.8 27.5l-.4 6.8c0 1.4 1 2.4 2.4 2.4h1.6l.4-7.6zM47.2 27.5l.4 6.8c0 1.4-1 2.4-2.4 2.4h-1.6l-.4-7.6z" fill="' + c1 + '"/>' +
        '<path d="M30.3 9.2h3.4v11.6h-3.4z" fill="' + c2 + '" opacity=".9"/>' +
        '<path d="M16.6 29.5C16 14.5 22.5 9 32 9s16 5.5 15.4 20.5" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/>' +
        '<path d="M21.5 13.6c2.4-2 5.2-3 8-3.2" stroke="rgba(255,255,255,.4)" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
        '<path d="M19.6 25.6c4-2.2 8.2-3 12.4-3s8.4.8 12.4 3l-.3 5.6c-3.8 1.6-7.8 2.2-12.1 2.2s-8.3-.6-12.1-2.2z" fill="rgba(170,215,255,.28)" stroke="rgba(255,255,255,.55)" stroke-width=".8"/>' +
        '<path d="M22 26.4c3-1.2 6-1.8 9-1.9" stroke="rgba(255,255,255,.6)" stroke-width=".9" fill="none" stroke-linecap="round"/>';
    }
    h += '</g><circle cx="32" cy="32" r="30.6" fill="none" stroke="' + (ring || 'rgba(255,255,255,.2)') + '" stroke-width="2.6"/></svg>';
    return h;
  }
  // shared defs for every portrait on the page
  function defs() {
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      '<clipPath id="ptc"><circle cx="32" cy="32" r="30"/></clipPath>' +
      '<radialGradient id="ptg" cx=".5" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient>' +
      '</defs></svg>';
  }

  // ---------------------------------------------------------------- AI team badges
  const BADGE = ['#c0392b', '#1f6feb', '#16a34a', '#7c3aed', '#ea580c', '#0e7490', '#b91c1c', '#ca8a04', '#be185d', '#334155', '#0f766e', '#4338ca'];
  function teamColor(name) { return BADGE[hash(name) % BADGE.length]; }
  function teamBadge(name, size) {
    const s = size || 22, hsh = hash(name);
    const crest = D.CRESTS[(hsh >> 4) % D.CRESTS.length];
    return '<span class="tb" style="width:' + s + 'px;height:' + s + 'px;background:' + teamColor(name) + '">' + crestSVG(crest, '#fff', Math.round(s * 0.62)) + '</span>';
  }

  function rarityColor(k) { return D.RARITY[D.RIDX[k]].color; }
  function gearColor(g) { return g.hof ? D.GOLD : rarityColor(g.rarity); }

  // ---------------------------------------------------------------- flags (30x20, simplified)
  const h3 = (a, b, c) => '<rect width="30" height="20" fill="' + a + '"/><rect y="6.67" width="30" height="6.67" fill="' + b + '"/><rect y="13.33" width="30" height="6.67" fill="' + c + '"/>';
  const v3 = (a, b, c) => '<rect width="30" height="20" fill="' + b + '"/><rect width="10" height="20" fill="' + a + '"/><rect x="20" width="10" height="20" fill="' + c + '"/>';
  const h2 = (a, b) => '<rect width="30" height="20" fill="' + a + '"/><rect y="10" width="30" height="10" fill="' + b + '"/>';
  const nordic = (bg, cr, inner) => '<rect width="30" height="20" fill="' + bg + '"/><rect x="8" width="6" height="20" fill="' + cr + '"/><rect y="7" width="30" height="6" fill="' + cr + '"/>' +
    (inner ? '<rect x="9.5" width="3" height="20" fill="' + inner + '"/><rect y="8.5" width="30" height="3" fill="' + inner + '"/>' : '');
  const star = (cx, cy, r, f) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(2) + ' ' + (cy + rr * Math.sin(a)).toFixed(2); } return '<path d="' + d + 'Z" fill="' + f + '"/>'; };
  const union = '<rect width="15" height="10" fill="#012169"/><path d="M0 0l15 10M15 0L0 10" stroke="#fff" stroke-width="2"/><path d="M0 0l15 10M15 0L0 10" stroke="#c8102e" stroke-width=".8"/><path d="M7.5 0v10M0 5h15" stroke="#fff" stroke-width="3"/><path d="M7.5 0v10M0 5h15" stroke="#c8102e" stroke-width="1.6"/>';
  const FLAGS = {
    CA: '<rect width="30" height="20" fill="#fff"/><rect width="7.5" height="20" fill="#d52b1e"/><rect x="22.5" width="7.5" height="20" fill="#d52b1e"/><path d="M15 4l1 2.2 1.6-.6-.5 3 1.9-1.6.3 1.3 1.8-.4-.6 1.9.9.5-3 2.3.4 1.3-2.6-.4.1 2.6h-.6l.1-2.6-2.6.4.4-1.3-3-2.3.9-.5-.6-1.9 1.8.4.3-1.3 1.9 1.6-.5-3 1.6.6z" fill="#d52b1e"/>',
    US: '<rect width="30" height="20" fill="#fff"/>' + [0, 2, 4, 6, 8, 10, 12].map(i => '<rect y="' + (i * 20 / 13) + '" width="30" height="' + (20 / 13) + '" fill="#b22234"/>').join('') + '<rect width="12" height="10.77" fill="#3c3b6e"/>' + [2, 5, 8].map(y => [2, 5, 8, 11 - 1].map(x => '<circle cx="' + x + '" cy="' + y + '" r=".6" fill="#fff"/>').join('')).join(''),
    SE: nordic('#006aa7', '#fecc00'), FI: nordic('#fff', '#003580'), DK: nordic('#c8102e', '#fff'), NO: nordic('#ba0c2f', '#fff', '#00205b'), IS: nordic('#02529c', '#fff', '#dc1e35'),
    RU: h3('#fff', '#0039a6', '#d52b1e'), SK: h3('#fff', '#0b4ea2', '#ee1c25'), SI: h3('#fff', '#005da4', '#ed1c24'), DE: h3('#000', '#dd0000', '#ffce00'),
    AT: h3('#ed2939', '#fff', '#ed2939'), LT: h3('#fdb913', '#006a44', '#c1272d'), NL: h3('#ae1c28', '#fff', '#21468b'), HR: h3('#ff0000', '#fff', '#171796'),
    EE: h3('#0072ce', '#000', '#fff'), HU: h3('#ce2939', '#fff', '#477050'), RS: h3('#c6363c', '#0c4076', '#fff'),
    FR: v3('#0055a4', '#fff', '#ef4135'), IT: v3('#009246', '#fff', '#ce2b37'), RO: v3('#002b7f', '#fcd116', '#ce1126'), BE: v3('#000', '#fdda24', '#ef3340'),
    IE: v3('#169b62', '#fff', '#ff883e'), MX: v3('#006847', '#fff', '#ce1126') + '<circle cx="15" cy="10" r="2" fill="#8c6a3f"/>',
    UA: h2('#0057b7', '#ffd700'), PL: h2('#fff', '#dc143c'),
    CZ: '<rect width="30" height="20" fill="#fff"/><rect y="10" width="30" height="10" fill="#d7141a"/><path d="M0 0l15 10L0 20z" fill="#11457e"/>',
    CH: '<rect width="30" height="20" fill="#d52b1e"/><rect x="13" y="4" width="4" height="12" fill="#fff"/><rect x="9" y="8" width="12" height="4" fill="#fff"/>',
    LV: '<rect width="30" height="20" fill="#9e3039"/><rect y="8" width="30" height="4" fill="#fff"/>',
    BY: '<rect width="30" height="20" fill="#cf101a"/><rect y="13.3" width="30" height="6.7" fill="#007d2c"/><rect width="3" height="20" fill="#fff"/>',
    KZ: '<rect width="30" height="20" fill="#00afca"/><circle cx="15" cy="9" r="3.4" fill="#fec50c"/><path d="M10 14q5 3 10 0" stroke="#fec50c" stroke-width="1" fill="none"/>',
    JP: '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5.6" fill="#bc002d"/>',
    KR: '<rect width="30" height="20" fill="#fff"/><path d="M11 10a4 4 0 0 1 8 0z" fill="#cd2e3a"/><path d="M11 10a4 4 0 0 0 8 0z" fill="#0047a0"/><path d="M5 5l3 2M22 13l3 2M22 7l3-2M5 15l3-2" stroke="#000" stroke-width="1"/>',
    CN: '<rect width="30" height="20" fill="#ee1c25"/>' + star(6, 6, 3.2, '#ffff00') + star(11, 2.5, 1, '#ffff00') + star(13, 5, 1, '#ffff00') + star(13, 8, 1, '#ffff00') + star(11, 10.5, 1, '#ffff00'),
    GB: '<rect width="30" height="20" fill="#012169"/><path d="M0 0l30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.4"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.4"/>',
    AU: '<rect width="30" height="20" fill="#012169"/>' + union + star(7.5, 15, 2.2, '#fff') + star(23, 5, 1.2, '#fff') + star(25, 10, 1.2, '#fff') + star(22, 15, 1.2, '#fff') + star(19, 9, 1, '#fff'),
    NZ: '<rect width="30" height="20" fill="#012169"/>' + union + star(23, 5, 1.3, '#cc142b') + star(25.5, 9, 1.3, '#cc142b') + star(21, 10, 1.1, '#cc142b') + star(23, 15, 1.4, '#cc142b'),
    ES: '<rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/>',
    BR: '<rect width="30" height="20" fill="#009c3b"/><path d="M15 2.5 27 10 15 17.5 3 10z" fill="#ffdf00"/><circle cx="15" cy="10" r="4" fill="#002776"/>',
    ZA: '<rect width="30" height="20" fill="#fff"/><rect width="30" height="10" fill="#e03c31"/><rect y="10" width="30" height="10" fill="#001489"/><path d="M0 0l12 10L0 20" fill="#007749" stroke="#fff" stroke-width="2"/><path d="M12 10h18" stroke="#fff" stroke-width="6"/><path d="M12 10h18" stroke="#007749" stroke-width="3.6"/><path d="M0 2.5 9 10 0 17.5z" fill="#000" stroke="#ffb81c" stroke-width="1"/>',
    IL: '<rect width="30" height="20" fill="#fff"/><rect y="2" width="30" height="2.5" fill="#0038b8"/><rect y="15.5" width="30" height="2.5" fill="#0038b8"/><path d="M15 6.5l3 5.2h-6zM15 13.5l-3-5.2h6z" fill="none" stroke="#0038b8" stroke-width=".9"/>'
  };
  function flag(code, w) {
    const s = w || 18;
    return '<svg class="flg" viewBox="0 0 30 20" width="' + s + '" height="' + Math.round(s * 2 / 3) + '" aria-label="' + code + '">' + (FLAGS[code] || '<rect width="30" height="20" fill="#7d8796"/>') + '</svg>';
  }

  // coach: suit and tie in team colours, bare head
  function coachPortrait(coach, team, size) {
    const s = size || 56;
    const r = rng(hash(coach.id || coach.name));
    const skin = SKIN[Math.floor(r() * 4)], hair = r() < 0.5 ? '#9a9a9a' : HAIR[Math.floor(r() * 4)];
    return '<svg class="pt" viewBox="0 0 64 64" width="' + s + '" height="' + s + '" aria-hidden="true">' +
      '<circle cx="32" cy="32" r="31" fill="#3a4a60" opacity=".35"/><g clip-path="url(#ptc)">' +
      '<path d="M6 66C8 51 19 46 32 46s24 5 26 20z" fill="#1d2633"/>' +
      '<path d="M26 46l6 9 6-9z" fill="#f2f4f7"/><path d="M30.5 48h3l-.6 12h-1.8z" fill="' + team.c1 + '"/>' +
      '<rect x="27" y="39" width="10" height="8" fill="' + shade(skin, 0.82) + '"/>' +
      '<ellipse cx="18.8" cy="32" rx="2.6" ry="3.8" fill="' + shade(skin, 0.82) + '"/><ellipse cx="45.2" cy="32" rx="2.6" ry="3.8" fill="' + shade(skin, 0.82) + '"/>' +
      '<ellipse cx="32" cy="30.5" rx="13.2" ry="15" fill="' + skin + '"/>' +
      '<path d="M18.8 27c0-10 6-13.5 13.2-13.5S45.2 17 45.2 27c-2-5-6-7.5-13.2-7.5S20.8 22 18.8 27z" fill="' + hair + '"/>' +
      '<path d="M24.5 27.5l5-1M39.5 27.5l-5-1" stroke="' + hair + '" stroke-width="1.9" stroke-linecap="round"/>' +
      '<circle cx="27" cy="31" r="1.5" fill="#1b1b1b"/><circle cx="37" cy="31" r="1.5" fill="#1b1b1b"/>' +
      '<path d="M32 32l-1.6 5h3" fill="none" stroke="' + shade(skin, 0.75) + '" stroke-width="1.3" stroke-linecap="round"/>' +
      '<path d="M28.3 40.5h7.4" stroke="#6d3b30" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M22 24.5c2-1.2 4-1.4 6-.8M42 24.5c-2-1.2-4-1.4-6-.8" stroke="rgba(0,0,0,.15)" stroke-width=".8" fill="none"/></g>' +
      '<circle cx="32" cy="32" r="30.6" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2.6"/></svg>';
  }

  G.ART = { hash, icon, gearIcon, gearColor, crestSVG, logoSVG, jerseySVG, portrait, lookOf, SKIN, HAIR, HAIR_STYLES, HAIR_N, BEARDS, BEARD_N, MASKS, MASK_N, coachPortrait, defs, teamBadge, teamColor, rarityColor, flag };
})(window.BK = window.BK || {});
