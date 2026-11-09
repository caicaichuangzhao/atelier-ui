/* Pointer ribbon: a trail that follows the pointer on its own canvas and fades within `life` seconds.
   It thins as the pointer speeds up, like a brush that lifts. Needs core.js.
   Modes: 'brush' (tapered ink), 'glow' (additive light), 'beads' (round beads cycling through `colors`).
   const r = Atelier.ribbon(canvas, { color: '#c43', colors: [...], mode: 'brush', width: 14, life: 0.5, target, onStats });
   r.setStyle({ color, colors, mode }); r.destroy();
   Keep it inside one bounded region. A page-wide cursor trail over reading content is noise. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  A.ribbon = function (canvas, opts) {
    const o = Object.assign({ color: '#333333', colors: null, mode: 'brush', width: 14, life: 0.5 }, opts);
    const ctx = canvas.getContext('2d'), target = o.target || canvas;
    if (!canvas.style.touchAction) canvas.style.touchAction = 'pan-y';
    let W = 0, H = 0, dpr = 1, pts = [], speed = 0, w = o.width, now = 0, statT = 0, lastMove = 0;
    function resize() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(2, root.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas); resize();

    function onMove(e) {
      if (A.reduce.matches || (e.pointerType !== 'mouse' && !e.pressure)) return;
      const r = canvas.getBoundingClientRect(), list = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
      (list.length ? list : [e]).forEach(ev => {
        const x = ev.clientX - r.left, y = ev.clientY - r.top, t = performance.now() / 1000, p = pts[pts.length - 1];
        if (p) {
          const d = Math.hypot(x - p.x, y - p.y);
          if (d < 1.5) return;
          speed += (d / Math.max(0.004, t - p.t) - speed) * 0.25;
        }
        w += (o.width * A.clamp(1.15 - speed / 1600, 0.28, 1.15) - w) * 0.35; // fast stroke, thin line
        pts.push({ x, y, t, w });
      });
      lastMove = performance.now();
      loop.wake();
    }
    function frame(dt) {
      now = performance.now() / 1000;
      while (pts.length && now - pts[0].t > o.life) pts.shift();
      if (performance.now() - lastMove > 60) speed *= Math.pow(0.9, dt * 60);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (pts.length > 1) (o.mode === 'beads' ? beads : brush)();
      statT += dt;
      const gone = !pts.length; // the last point just faded: one final report so listeners see the stroke end
      if (o.onStats && (statT > 0.12 || gone)) { statT = 0; o.onStats({ speed: gone ? 0 : Math.round(speed), width: +(gone ? 0 : pts[pts.length - 1].w).toFixed(1), points: pts.length, mode: o.mode }); }
      return !gone;
    }
    function edge(i, n) { // half width at point i: fades with age and tapers toward the tail
      const p = pts[i], age = (now - p.t) / o.life;
      return (p.w * Math.max(0, 1 - age) * (0.12 + 0.88 * Math.sin((i / (n - 1)) * Math.PI / 2))) / 2;
    }
    function brush() {
      const n = pts.length, L = [], R = [];
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], p = pts[i], hw = edge(i, n);
        let tx = b.x - a.x, ty = b.y - a.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        L.push([p.x - ty * hw, p.y + tx * hw]); R.push([p.x + ty * hw, p.y - tx * hw]);
      }
      ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
      for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(L[i][0], L[i][1], (L[i][0] + L[i + 1][0]) / 2, (L[i][1] + L[i + 1][1]) / 2);
      ctx.lineTo(L[n - 1][0], L[n - 1][1]); ctx.lineTo(R[n - 1][0], R[n - 1][1]);
      for (let i = n - 2; i > 0; i--) ctx.quadraticCurveTo(R[i][0], R[i][1], (R[i][0] + R[i - 1][0]) / 2, (R[i][1] + R[i - 1][1]) / 2);
      ctx.lineTo(R[0][0], R[0][1]); ctx.closePath();
      const head = pts[n - 1];
      ctx.moveTo(head.x + edge(n - 1, n), head.y); ctx.arc(head.x, head.y, edge(n - 1, n), 0, Math.PI * 2);
      const glow = o.mode === 'glow';
      ctx.globalCompositeOperation = glow ? 'lighter' : 'source-over';
      ctx.shadowColor = o.color; ctx.shadowBlur = glow ? 16 : 0;
      ctx.fillStyle = o.color; ctx.fill();
      ctx.shadowBlur = 0;
    }
    function beads() { // one bead every ~1.1 widths along the path
      const n = pts.length, cs = o.colors || [o.color];
      let acc = 0, k = 0;
      ctx.globalCompositeOperation = 'source-over';
      for (let i = n - 1; i > 0; i--) {
        acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        if (acc < o.width * 1.1 && i !== n - 1) continue;
        acc = 0;
        const r = edge(i, n) * 1.1;
        if (r < 0.6) continue;
        ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
        ctx.fillStyle = cs[k++ % cs.length]; ctx.fill();
      }
    }
    target.addEventListener('pointermove', onMove);
    const loop = A.loop(canvas, frame);
    return {
      setStyle(s) { Object.assign(o, s); loop.wake(); },
      destroy() { loop.stop(); ro.disconnect(); target.removeEventListener('pointermove', onMove); }
    };
  };
})(typeof self !== 'undefined' ? self : this);
