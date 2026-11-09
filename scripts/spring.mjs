#!/usr/bin/env node
// Turn spring physics into a CSS linear() easing plus a matching duration.
// Usage:
//   node spring.mjs --duration 0.35 --bounce 0.15 --name snappy   (Apple-style: perceptual duration + bounce)
//   node spring.mjs --stiffness 320 --damping 30 --mass 1          (raw physics)
//   node spring.mjs --presets                                       (print the default motion personalities)
// Output: CSS custom properties (--e-*, --d-*) and the physics values JS can reuse.

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));

const PRESETS = {
  press:  { duration: 0.18, bounce: 0,    use: 'button press and release, toggles' },
  calm:   { duration: 0.45, bounce: 0,    use: 'editorial, finance, luxury: no overshoot' },
  gentle: { duration: 0.5,  bounce: 0.1,  use: 'spatial, Apple-like: barely visible settle' },
  snappy: { duration: 0.32, bounce: 0.15, use: 'tools, dev platforms: quick with a small settle' },
  bouncy: { duration: 0.5,  bounce: 0.38, use: 'playful, kids, habit apps: visible bounce' }
};

// WWDC23 "Animate with springs": duration/bounce -> stiffness/damping (mass 1).
function fromApple(duration, bounce) {
  const stiffness = Math.pow((2 * Math.PI) / duration, 2);
  const damping = bounce >= 0 ? (4 * Math.PI * (1 - bounce)) / duration : (4 * Math.PI) / (duration * (1 + bounce));
  return { stiffness, damping, mass: 1 };
}

function simulate({ stiffness, damping, mass }) {
  const dt = 1 / 2000, pts = [];
  let x = 0, v = 0, t = 0, still = 0, peak = 0;
  while (t < 4) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt; x += v * dt; t += dt;
    peak = Math.max(peak, x);
    pts.push([t, x]);
    if (Math.abs(x - 1) < 0.002 && Math.abs(v) < 0.02) { if (++still > 40) break; } else still = 0;
  }
  return { pts, settle: t, overshoot: Math.max(0, peak - 1) };
}

// Ramer-Douglas-Peucker: keep only the points needed to stay within tol of the curve.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [x1, y1] = pts[0], [x2, y2] = pts[pts.length - 1];
  let idx = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const yl = y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
    const d = Math.abs(y - yl);
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [pts[0], pts[pts.length - 1]];
  return simplify(pts.slice(0, idx + 1), tol).slice(0, -1).concat(simplify(pts.slice(idx), tol));
}

function easing(cfg, tol = 0.003) {
  const sim = simulate(cfg);
  const T = sim.settle;
  const norm = sim.pts.map(([t, x]) => [t / T, x]);
  norm.unshift([0, 0]);
  norm[norm.length - 1] = [1, 1];
  const kept = simplify(norm, tol);
  const body = kept.map(([p, x], i) => {
    const v = +x.toFixed(3);
    if (i === 0 || i === kept.length - 1) return String(v);
    return v + ' ' + +(p * 100).toFixed(1) + '%';
  }).join(', ');
  return { css: 'linear(' + body + ')', ms: Math.round(T * 1000), overshoot: sim.overshoot, points: kept.length };
}

function describe(name, cfg, use) {
  const e = easing(cfg);
  const zeta = cfg.damping / (2 * Math.sqrt(cfg.stiffness * cfg.mass));
  const lines = [
    `/* ${name}: ${use || 'custom'} | overshoot ${(e.overshoot * 100).toFixed(1)}% | damping ratio ${zeta.toFixed(2)} */`,
    `--e-${name}: ${e.css};`,
    `--d-${name}: ${e.ms}ms;`,
    `/* JS physics: { stiffness: ${cfg.stiffness.toFixed(1)}, damping: ${cfg.damping.toFixed(2)}, mass: ${cfg.mass} } */`
  ];
  return lines.join('\n');
}

if (args.presets) {
  for (const [name, p] of Object.entries(PRESETS)) console.log(describe(name, fromApple(p.duration, p.bounce), p.use) + '\n');
} else if (args.stiffness) {
  const cfg = { stiffness: +args.stiffness, damping: +(args.damping || 20), mass: +(args.mass || 1) };
  console.log(describe(args.name || 'spring', cfg));
} else {
  const cfg = fromApple(+(args.duration || 0.4), +(args.bounce || 0));
  console.log(describe(args.name || 'spring', cfg));
}
