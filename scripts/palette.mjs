#!/usr/bin/env node
/* Derive a complete color token set (--c-*) from a few dials and check its contrast. OKLCH in, sRGB hex out.

     node scripts/palette.mjs --accent 32 --neutral 70 --tint 0.014 --chroma 0.17 --spice 262
     node scripts/palette.mjs --hue 255 --accent 125 --chroma 0.19 --mode dark --json
     node scripts/palette.mjs --accent 355 --neutral 80 --tint 0.02 --dark-neutral 300   (a dial can differ per mode)
     node scripts/palette.mjs --accent 262 --neutral 250 --tint 0.006 --preview palette.html

   Dials  --accent      accent hue 0-360 (brand color)
          --brand "#4f46e5"   start from an existing brand color: its hue and chroma, and its exact lightness in light mode
          --neutral     hue that tints every neutral: warm paper ~70, cool graphite ~255; defaults to the accent hue
          --hue         sets accent and neutral hue together
          --tint        neutral chroma: 0 pure gray, 0.006 barely tinted, 0.02 clearly tinted (default 0.008)
          --chroma      accent chroma: 0.08 muted .. 0.22 loud (default 0.15)
          --accent-l, --bg-l   override accent or background lightness (0-1)
          --spice, --spice-chroma   optional second accent, used sparingly
          Prefix any dial with light- or dark- to set it for one mode only, e.g. --dark-tint 0.012.
   Output --mode light|dark|both (default both)   --selector ':root'   --dark-selector '[data-mode="dark"]' or media
          --json   tokens, contrast report and warnings
          --preview file.html   a swatch sheet with sample text, button and chart colors to open or screenshot
   Exit code 1 when a required contrast check fails: change the dial the warning names and run again. */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const P = createRequire(import.meta.url)('../assets/palette.js');
const DIALS = { hue: 'hue', accent: 'accentHue', neutral: 'neutralHue', tint: 'tint', chroma: 'chroma', 'accent-l': 'accentL', 'bg-l': 'bgL', spice: 'spiceHue', 'spice-chroma': 'spiceChroma' };
const OPTS = ['mode', 'selector', 'dark-selector', 'preview', 'brand'];
const STYLE = `body{margin:0;font:15px/1.6 system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));min-height:100vh}
section{display:grid;gap:20px;align-content:start;padding:32px;background:var(--c-bg);color:var(--c-text)}
h2{margin:0;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--c-text-3)}
.card{display:grid;gap:10px;padding:22px;border-radius:14px;background:var(--c-surface);box-shadow:0 0 0 1px var(--c-line),0 14px 30px -20px var(--c-shadow-c)}
h3{margin:0;font-size:22px}p{margin:0;color:var(--c-text-2)}small{color:var(--c-text-3)}a{color:var(--c-accent-strong)}
.row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:6px}
button{padding:10px 18px;border:0;border-radius:999px;font:inherit;font-weight:600;color:var(--c-accent-ink);background:var(--c-accent)}
.chip{padding:5px 12px;border-radius:999px;box-shadow:inset 0 0 0 1.5px var(--c-spice);font-size:13px}
.b{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--c-text-2)}.b i{width:9px;height:9px;border-radius:50%}
.bars{display:flex;align-items:flex-end;gap:6px;height:70px;padding-top:8px}.bars i{flex:1;border-radius:4px 4px 1px 1px}
.rep{display:grid;gap:4px;margin:0;padding:0;list-style:none;font:12px ui-monospace,Consolas,monospace;color:var(--c-text-2)}
.rep li{display:flex;justify-content:space-between;gap:12px}.rep li.no b{color:var(--c-bad)}
.sw{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin:0;padding:0;list-style:none}
.sw li{display:grid;grid-template-columns:30px 1fr;gap:0 10px;align-items:center;font-size:12px}
.sw i{grid-row:span 2;width:30px;height:30px;border-radius:8px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c-text) 14%,transparent)}
.sw code{font:11px ui-monospace,Consolas,monospace;color:var(--c-text-3)}`;
const fail = msg => { console.error('palette: ' + msg + '  (run with --help)'); process.exit(2); };

/* ---------- arguments ---------- */
const base = {}, per = { light: {}, dark: {} }, opt = { mode: 'both', selector: ':root', 'dark-selector': '[data-mode="dark"]' };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '-h' || a === '--help') { console.log(readFileSync(new URL(import.meta.url), 'utf8').match(/\/\*([\s\S]*?)\*\//)[1]); process.exit(0); }
  if (a === '--json') { opt.json = true; continue; }
  if (!a.startsWith('--')) fail('unexpected argument ' + a);
  let name = a.slice(2), v;
  const eq = name.indexOf('=');
  if (eq > 0) { v = name.slice(eq + 1); name = name.slice(0, eq); } else v = argv[++i];
  if (v === undefined) fail('--' + name + ' needs a value');
  if (OPTS.includes(name)) { opt[name] = v; continue; }
  const m = /^(?:(light|dark)-)?(.+)$/.exec(name), key = DIALS[m[2]], n = Number(v);
  if (!key) fail('unknown flag --' + name);
  if (!Number.isFinite(n)) fail('--' + name + ' must be a number, got ' + v);
  (m[1] ? per[m[1]] : base)[key] = n;
}
const modes = opt.mode === 'both' ? ['light', 'dark'] : [opt.mode];
if (!modes.every(m => m in per)) fail('--mode must be light, dark or both');
let brand = null;
if (opt.brand) { // explicit dials still win; dark mode picks its own lightness for the same hue
  try { brand = P.oklch(opt.brand); } catch (e) { fail('--brand must be a hex color like "#4f46e5"'); }
  base.accentHue ??= +brand[2].toFixed(3); base.chroma ??= +brand[1].toFixed(5);
  if (base.accentL == null) per.light.accentL ??= +brand[0].toFixed(5);
}
const grayBrand = brand && brand[1] < 0.03 && base.neutralHue == null && base.hue == null;

/* ---------- derive ---------- */
const res = {};
for (const m of modes) {
  const o = { ...base, ...per[m] };
  if (o.hue == null) { o.neutralHue ??= o.accentHue; o.accentHue ??= o.neutralHue; } // one hue given: neutrals lean toward it
  if (o.accentHue == null && o.hue == null) fail('give at least --accent (or --hue)');
  res[m] = { options: o, ...P.derive({ ...o, mode: m }) };
  if (grayBrand) res[m].warnings.push('brand ' + opt.brand + ' is nearly gray (chroma ' + brand[1].toFixed(3) + '), so its hue says nothing and the neutral tint leans an arbitrary way. Set --neutral (warm ~70, cool ~255) or --tint 0.');
}
const failed = modes.filter(m => res[m].report.some(c => c.level === 'must' && !c.pass));

/* ---------- output ---------- */
if (opt.json) console.log(JSON.stringify(res, null, 2));
else {
  const out = [];
  for (const m of modes) {
    const r = res[m], dials = Object.entries(r.options).map(([k, v]) => k + ' ' + v).join(' · ');
    const rep = r.report.map(c => '   ' + c.pair.padEnd(30) + (c.ratio.toFixed(2) + ':1').padStart(8) + '  ' + (c.pass ? 'ok' : c.level === 'must' ? 'FAIL' : 'low') + ' (min ' + c.min + ':1)');
    const warn = r.warnings.map(w => '   ! ' + w);
    out.push('/* ' + m + ' · ' + dials + '\n' + rep.concat(warn).join('\n') + ' */');
    const body = Object.entries(r.tokens).map(([k, v]) => '--c-' + k + ': ' + v + ';');
    const sel = modes.length === 1 || m === 'light' ? opt.selector : opt['dark-selector'];
    out.push(sel === 'media'
      ? '@media (prefers-color-scheme: dark) {\n  ' + opt.selector + ' {\n' + body.map(l => '    ' + l).join('\n') + '\n  }\n}'
      : sel + ' {\n' + body.map(l => '  ' + l).join('\n') + '\n}');
  }
  console.log(out.join('\n\n'));
}
if (opt.preview) { writeFileSync(opt.preview, sheet(res), 'utf8'); console.error('preview written: ' + opt.preview); }
if (failed.length) { console.error('palette: required contrast failed in ' + failed.join(' and ') + ' mode; see FAIL above'); process.exitCode = 1; }

function sheet(all) {
  const panels = Object.entries(all).map(([m, r]) => {
    const t = r.tokens, vars = Object.entries(t).map(([k, v]) => '--c-' + k + ':' + v).join(';');
    const sw = Object.entries(t).map(([k, v]) => `<li><i style="background:${v}"></i><b>${k}</b><code>${v}</code></li>`).join('');
    const rep = r.report.map(c => `<li class="${c.pass ? '' : 'no'}"><span>${c.pair}</span><b>${c.ratio.toFixed(2)}:1</b></li>`).join('');
    const bars = [1, 2, 3, 4, 5, 6].map(i => `<i style="background:var(--c-data-${i});height:${34 + i * 10}%"></i>`).join('');
    const badges = ['ok', 'warn', 'bad', 'info'].map(s => `<span class="b"><i style="background:var(--c-${s})"></i>${s}</span>`).join('');
    return `<section style="${vars}"><h2>${m}</h2><div class="card"><h3>页面标题 Heading</h3>
<p>正文写在 surface 上，次要说明更淡；<a href="#">强调链接</a>用 accent-strong。</p><small>text-3 · 时间、注释、占位</small>
<div class="row"><button type="button">主按钮</button><span class="chip">spice 点缀</span>${badges}</div><div class="bars">${bars}</div></div>
<ol class="rep">${rep}</ol><ul class="sw">${sw}</ul></section>`;
  }).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>palette preview</title><style>${STYLE}</style></head><body><main>${panels}</main></body></html>`;
}
