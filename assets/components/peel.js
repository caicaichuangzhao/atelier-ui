/* Corner peel: drag the corner to lift the sticker and uncover what is under it. Once the tip has travelled 45% of
   the diagonal the card marks itself armed, and letting go peels it off; earlier it settles back flat.
   Enter or Space on the grip peels it. Needs core.js; styles in peel.css.
   Markup: <div class="at-peel"><div class="at-peel__under">…</div><div class="at-peel__face">…</div>
     <div class="at-peel__flapwrap"><div class="at-peel__flap"></div></div><button class="at-peel__grip" type="button" aria-label="揭开贴纸"></button></div>
   Atelier.peel(el, { onState({ reveal, distance, phase }), onDone() }) → { reset() } */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  const OV = 1.1; // the flap element overhangs the card by 110% on each side (inset: -110% in CSS)
  function clip(P, nx, ny, k) { // keep the part of polygon P where n·X < k
    const out = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], da = nx * a[0] + ny * a[1] - k, db = nx * b[0] + ny * b[1] - k;
      if (da < 0) out.push(a);
      if ((da < 0) !== (db < 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  const area = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
  const poly = (pts, ox, oy) => pts.length > 2 ? 'polygon(' + pts.map(p => (p[0] + ox).toFixed(1) + 'px ' + (p[1] + oy).toFixed(1) + 'px').join(',') + ')' : 'polygon(0 0, 0 0, 0 0)';

  A.peel = function (el, o) {
    if (el._atPeel) return el._atPeel; // already set up (hot reload, React StrictMode): reuse it instead of binding twice
    o = o || {};
    const face = el.querySelector('.at-peel__face'), flap = el.querySelector('.at-peel__flap'), grip = el.querySelector('.at-peel__grip');
    const P = [0, 0];
    let drag = null, done = false, reveal = 0, phase = 'rest', raf = 0, armed = false;
    const lift = () => A.num(el, '--peel-lift', 14);
    const restAt = extra => [el.clientWidth - lift() - (extra || 0), el.clientHeight - lift() - (extra || 0)];
    const dist = () => Math.hypot(el.clientWidth - P[0], el.clientHeight - P[1]);
    const limit = () => 0.45 * Math.hypot(el.clientWidth, el.clientHeight); // drag the tip past 45% of the diagonal and it peels off
    const sx = A.spring({ el, precision: 0.05, onUpdate: v => { P[0] = v; schedule(); } });
    const sy = A.spring({ el, precision: 0.05, onUpdate: v => { P[1] = v; schedule(); }, onRest: () => { if (phase === 'settle') { phase = 'rest'; emit(); } } });
    const emit = () => { if (o.onState) o.onState({ reveal: Math.round(reveal * 100), distance: Math.round(dist()), threshold: Math.round(limit()), armed, phase }); };
    function schedule() { if (!raf) raf = requestAnimationFrame(render); }
    function render() {
      raf = 0;
      const w = el.clientWidth, h = el.clientHeight, nx = P[0] - w, ny = P[1] - h, nn = nx * nx + ny * ny;
      if (nn < 1) { face.style.clipPath = ''; flap.style.clipPath = poly([], 0, 0); reveal = 0; emit(); return; }
      // the fold line is the perpendicular bisector of the corner and the dragged tip
      const k = (P[0] * P[0] + P[1] * P[1] - w * w - h * h) / 2, rect = [[0, 0], [w, 0], [w, h], [0, h]];
      const flat = clip(rect, -nx, -ny, -k), folded = clip(rect, nx, ny, k);
      const back = folded.map(([x, y]) => { const d = (2 * (nx * x + ny * y - k)) / nn; return [x - d * nx, y - d * ny]; });
      face.style.clipPath = poly(flat, 0, 0);
      flap.style.clipPath = poly(back, w * OV, h * OV);
      // shade the back of the flap from the crease to the tip; px stops are measured along the CSS gradient line
      const len = Math.sqrt(nn), dx = nx / len, dy = ny / len, FW = w * (1 + 2 * OV), FH = h * (1 + 2 * OV);
      const L = Math.abs(FW * dx) + Math.abs(FH * dy), t = (x, y) => (x + w * OV - FW / 2) * dx + (y + h * OV - FH / 2) * dy + L / 2;
      const t0 = t((P[0] + w) / 2, (P[1] + h) / 2), t1 = t(P[0], P[1]);
      flap.style.background = 'linear-gradient(' + (Math.atan2(dx, -dy) * 180 / Math.PI).toFixed(1) + 'deg, var(--peel-crease) ' + t0.toFixed(1) + 'px, var(--peel-back) ' + (t0 + (t1 - t0) * 0.35).toFixed(1) + 'px, var(--peel-tip) ' + t1.toFixed(1) + 'px)';
      reveal = folded.length > 2 ? area(folded) / (w * h) : 0;
      emit();
    }
    function settle(extra) { phase = 'settle'; const r = restAt(extra); sx.to(r[0]); sy.to(r[1]); }
    function complete() {
      done = true; phase = 'peel';
      el.classList.add('is-peeling');
      sx.to(-el.clientWidth * 1.08); sy.to(-el.clientHeight * 1.08); // past the far corner: nothing is left flat
      A.haptic(12);
      setTimeout(() => { el.classList.add('is-gone'); phase = 'done'; emit(); if (o.onDone) o.onDone(); }, 560);
    }
    grip.addEventListener('pointerdown', e => {
      if (e.button || done) return;
      e.preventDefault(); grip.setPointerCapture(e.pointerId);
      sx.stop(); sy.stop();
      drag = { x: e.clientX, y: e.clientY, px: P[0], py: P[1], moved: false };
      el.classList.add('is-dragging'); phase = 'drag';
    });
    grip.addEventListener('pointermove', e => {
      if (!drag) return;
      const w = el.clientWidth, h = el.clientHeight;
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 3) drag.moved = true;
      sx.set(A.clamp(drag.px + e.clientX - drag.x, -w * 0.3, w - 2));
      sy.set(A.clamp(drag.py + e.clientY - drag.y, -h * 0.3, h - 2));
      const on = dist() >= limit();
      if (on !== armed) { armed = on; el.classList.toggle('is-armed', on); if (on) A.haptic(8); emit(); }
    });
    function end() {
      if (!drag) return;
      const d = drag; drag = null; el.classList.remove('is-dragging');
      if (!d.moved) { settle(Math.min(el.clientWidth, el.clientHeight) * 0.18); setTimeout(() => { if (!drag && !done) settle(); }, 260); return; } // a tap: lift a little to show it peels
      const fire = armed;
      armed = false; el.classList.remove('is-armed');
      if (fire) complete(); else settle();
    }
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
    grip.addEventListener('click', e => { if (e.detail === 0 && !done) complete(); });
    grip.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !drag && !done) settle(12); });
    grip.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !drag && !done) settle(); });
    new ResizeObserver(() => { if (drag) return; sx.stop(); sy.stop(); const r = done ? [-el.clientWidth * 1.08, -el.clientHeight * 1.08] : restAt(); P[0] = r[0]; P[1] = r[1]; schedule(); }).observe(el);
    return (el._atPeel = {
      reset() { done = false; el.classList.remove('is-peeling', 'is-gone'); const r = restAt(); sx.set(r[0]); sy.set(r[1]); phase = 'rest'; emit(); },
      peel() { if (!done) complete(); }
    });
  };
})(typeof self !== 'undefined' ? self : this);
