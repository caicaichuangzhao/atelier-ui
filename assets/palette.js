/* Atelier palette engine: derive a complete color token set from a few dials.
   Colors are designed in OKLCH, fitted into sRGB, and emitted as hex.
   Browser: window.AtelierPalette.apply(document.documentElement, {...})
   Node:    require('./palette.js').derive({...})                         */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AtelierPalette = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var RAD = Math.PI / 180;

  function toLinear(L, C, H) {
    var a = C * Math.cos(H * RAD), b = C * Math.sin(H * RAD);
    var l = L + 0.3963377774 * a + 0.2158037573 * b;
    var m = L - 0.1055613458 * a - 0.0638541728 * b;
    var s = L - 0.0894841775 * a - 1.2914855480 * b;
    l = l * l * l; m = m * m * m; s = s * s * s;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ];
  }
  function inGamut(rgb) {
    return rgb[0] >= -1e-4 && rgb[0] <= 1.0001 && rgb[1] >= -1e-4 && rgb[1] <= 1.0001 && rgb[2] >= -1e-4 && rgb[2] <= 1.0001;
  }
  // Largest chroma <= C that stays inside sRGB at this lightness and hue.
  function fitChroma(L, C, H) {
    if (inGamut(toLinear(L, C, H))) return C;
    var lo = 0, hi = C;
    for (var i = 0; i < 24; i++) {
      var mid = (lo + hi) / 2;
      if (inGamut(toLinear(L, mid, H))) lo = mid; else hi = mid;
    }
    return lo;
  }
  function encode(c) {
    c = Math.min(1, Math.max(0, c));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  }
  function hex(L, C, H) {
    L = Math.min(1, Math.max(0, L));
    var rgb = toLinear(L, fitChroma(L, C, H), H);
    return '#' + rgb.map(function (c) {
      var v = Math.round(encode(c) * 255);
      return (v < 16 ? '0' : '') + v.toString(16);
    }).join('');
  }
  function luminance(h) {
    var n = parseInt(h.slice(1), 16);
    var ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  function contrast(a, b) {
    var x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function norm(h) { return ((h % 360) + 360) % 360; }

  // Each hue looks most vivid at a different lightness: yellow needs light, blue needs dark.
  function accentL(h, dark) {
    var H = norm(h), L;
    if (H >= 75 && H < 135) L = 0.84;        // yellow, lime
    else if (H >= 55 && H < 75) L = 0.74;    // amber
    else if (H >= 135 && H < 175) L = 0.70;  // green
    else if (H >= 20 && H < 55) L = 0.63;    // orange, vermilion
    else if (H >= 175 && H < 235) L = 0.64;  // teal, cyan
    else if (H >= 235 && H < 305) L = 0.55;  // blue, indigo, violet
    else L = 0.60;                           // magenta, red
    return dark ? Math.min(0.9, L + 0.06) : L;
  }

  /* Options (all optional):
     mode        'light' | 'dark'
     hue         shortcut for both neutralHue and accentHue
     neutralHue  hue that tints every neutral (warm paper ~70, cool graphite ~255)
     tint        neutral chroma: 0 pure gray, 0.006 barely tinted, 0.02 clearly tinted
     accentHue   brand accent hue; chroma: accent chroma (0.08 muted to 0.22 loud)
     accentL     override accent lightness; bgL: override background lightness
     spiceHue    optional second accent used sparingly; spiceChroma (default 0.12) */
  function derive(o) {
    o = o || {};
    var dark = o.mode === 'dark';
    var nh = norm(o.neutralHue != null ? o.neutralHue : (o.hue || 0));
    var ah = norm(o.accentHue != null ? o.accentHue : (o.hue || 0));
    var tint = o.tint != null ? o.tint : 0.008;
    var ac = o.chroma != null ? o.chroma : 0.15;
    var bgL = o.bgL != null ? o.bgL : (dark ? 0.17 : 0.975);
    var t = {};
    if (!dark) {
      t.bg = hex(bgL, tint, nh);
      t.surface = hex(Math.min(0.995, bgL + 0.02), tint * 0.6, nh);
      t.sunken = hex(bgL - 0.03, tint * 1.2, nh);
      t.line = hex(bgL - 0.085, tint * 1.4, nh);
      t['line-strong'] = hex(bgL - 0.17, tint * 1.5, nh);
      t.text = hex(0.21, tint * 1.6, nh);
      t['text-2'] = hex(0.43, tint * 1.6, nh);
      t['text-3'] = hex(0.53, tint * 1.4, nh);
    } else {
      t.bg = hex(bgL, tint, nh);
      t.surface = hex(bgL + 0.045, tint, nh);
      t.sunken = hex(bgL - 0.035, tint, nh);
      t.line = hex(bgL + 0.115, tint * 1.1, nh);
      t['line-strong'] = hex(bgL + 0.22, tint * 1.1, nh);
      t.text = hex(0.95, tint * 0.8, nh);
      t['text-2'] = hex(0.79, tint, nh);
      t['text-3'] = hex(0.67, tint, nh);
    }
    var aL = o.accentL != null ? o.accentL : accentL(ah, dark), notes = [];
    var inkDark = hex(0.2, Math.min(ac, 0.05), ah);
    var acc = hex(aL, ac, ah);
    var white = contrast('#ffffff', acc) >= contrast(inkDark, acc);
    var ink = white ? '#ffffff' : inkDark, startL = aL;
    // Keep button labels readable: move the accent away from its ink until 4.5:1.
    for (var k = 0; k < 20 && contrast(ink, acc) < 4.5; k++) {
      aL += white ? -0.01 : 0.01;
      acc = hex(aL, ac, ah);
    }
    if (aL !== startL) notes.push('accent lightness moved ' + startL.toFixed(2) + ' -> ' + aL.toFixed(2) + ' so --c-accent-ink stays readable');
    t.accent = acc;
    t['accent-hover'] = hex(aL + (dark ? 0.04 : -0.05), ac, ah);
    t['accent-strong'] = hex(dark ? 0.84 : 0.43, Math.min(ac, 0.14), ah);
    t['accent-ink'] = ink;
    if (o.spiceHue != null) {
      var sh = norm(o.spiceHue);
      t.spice = hex(accentL(sh, dark), o.spiceChroma != null ? o.spiceChroma : 0.12, sh);
    } else t.spice = t.accent;
    t.ok = hex(dark ? 0.74 : 0.6, 0.14, 150);
    t.warn = hex(dark ? 0.82 : 0.74, 0.15, 75);
    t.bad = hex(dark ? 0.68 : 0.58, 0.19, 27);
    t.info = hex(dark ? 0.72 : 0.58, 0.12, 245);
    for (var i = 0; i < 6; i++) t['data-' + (i + 1)] = hex(dark ? 0.74 : 0.66, 0.13, norm(ah + i * 137.5));
    t['shadow-c'] = hex(dark ? 0.06 : 0.28, dark ? 0.01 : 0.03, nh);

    var checks = [
      ['text / bg', 'text', 'bg', 7, 'must'],
      ['text-2 / bg', 'text-2', 'bg', 4.5, 'must'],
      ['text-3 / surface', 'text-3', 'surface', 4.5, 'must'],
      ['accent-ink / accent', 'accent-ink', 'accent', 4.5, 'must'],
      ['accent-strong / bg', 'accent-strong', 'bg', 4.5, 'must'],
      ['accent / bg (icons, borders)', 'accent', 'bg', 3, 'advice']
    ];
    var report = checks.map(function (c) {
      var r = contrast(t[c[1]], t[c[2]]);
      return { pair: c[0], ratio: Math.round(r * 100) / 100, min: c[3], level: c[4], pass: r >= c[3] };
    });
    var warnings = notes.concat(report.filter(function (r) { return !r.pass; }).map(function (r) {
      return r.level === 'must'
        ? r.pair + ' is ' + r.ratio + ':1, below ' + r.min + ':1. Adjust lightness.'
        : r.pair + ' is ' + r.ratio + ':1. Use --c-accent-strong for icons and borders on --c-bg; keep --c-accent for fills.';
    }));
    return { tokens: t, report: report, warnings: warnings };
  }

  function apply(el, o) {
    var r = derive(o);
    for (var k in r.tokens) el.style.setProperty('--c-' + k, r.tokens[k]);
    return r;
  }
  // sRGB hex -> [L, C, H] in OKLCH, to start a palette from an existing brand color.
  function oklch(hexStr) {
    var s = String(hexStr).trim().replace(/^#/, '');
    if (s.length === 3) s = s.replace(/./g, '$&$&');
    if (!/^[0-9a-f]{6}$/i.test(s)) throw new Error('not a hex color: ' + hexStr);
    var n = parseInt(s, 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    var l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]);
    var m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]);
    var q = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
    var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * q;
    var a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * q;
    var b = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * q;
    return [L, Math.sqrt(a * a + b * b), norm(Math.atan2(b, a) / RAD)];
  }
  function toCSS(o, selector) {
    var r = derive(o), lines = [];
    for (var k in r.tokens) lines.push('  --c-' + k + ': ' + r.tokens[k] + ';');
    return (selector || ':root') + ' {\n' + lines.join('\n') + '\n}';
  }
  return { derive: derive, apply: apply, toCSS: toCSS, hex: hex, contrast: contrast, fitChroma: fitChroma, oklch: oklch };
});
