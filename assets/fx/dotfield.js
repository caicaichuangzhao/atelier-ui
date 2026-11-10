/* Dot field: a grid of dots that swells under the pointer like a lens and ripples out from every tap.
   Needs core.js. Decorative: the canvas is aria-hidden and the frame loop sleeps once nothing moves.
   const d = Atelier.dotfield(canvas, { gap: 18, size: 1.6, color: '#8a8f98', hot: '#426bce', lens: 96,
     shape: 'round' | 'square', target: hostEl, onStats(s) {} });
   d.ripple(x, y)   x, y in canvas pixels; also fired by pointerdown inside target
   d.setStyle({ color, hot, shape });  d.destroy();
   Touch: no lens (there is no hover), taps still ripple. Reduced motion: drawn once, still. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  const rgbOf = h => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

  A.dotfield = function (canvas, opts) {
    if (canvas._atDots) return canvas._atDots;
    const o = Object.assign({ gap: 18, size: 1.6, color: '#8a8f98', hot: '#426bce', lens: 96, shape: 'round' }, opts);
    const ctx = canvas.getContext('2d'), target = o.target || canvas;
    if (!canvas.style.touchAction) canvas.style.touchAction = 'pan-y';
    const BUCKETS = 6, SPEED = 560, BAND = 46, LIFE = 1.5;
    let W = 0, H = 0, dpr = 1, bx = new Float32Array(0), by = bx, n = 0, ramp = [], fps = 60, statT = 0;
    const ptr = { x: -1e4, y: -1e4, k: 0, on: false }, ripples = [];

    function paint() {
      const a = rgbOf(o.color), b = rgbOf(o.hot);
      ramp = Array.from({ length: BUCKETS }, (_, i) => { const t = i / (BUCKETS - 1); return 'rgb(' + a.map((v, j) => Math.round(v + (b[j] - v) * t)).join(',') + ')'; });
    }
    function resize() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(2, root.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
      const cols = Math.max(1, Math.floor(W / o.gap)), rows = Math.max(1, Math.floor(H / o.gap));
      const ox = (W - (cols - 1) * o.gap) / 2, oy = (H - (rows - 1) * o.gap) / 2;
      n = cols * rows; bx = new Float32Array(n); by = new Float32Array(n);
      for (let i = 0; i < n; i++) { bx[i] = ox + (i % cols) * o.gap; by[i] = oy + Math.floor(i / cols) * o.gap; }
      draw(0);
      loop.wake();
    }
    /* one path per color bucket keeps fillStyle switches to six per frame */
    function draw(dt) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const paths = ramp.map(() => new Path2D()), now = performance.now() / 1000, still = A.reduce.matches;
      ptr.k += ((ptr.on ? 1 : 0) - ptr.k) * Math.min(1, dt * 9); // the lens eases in and out instead of popping
      for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t > LIFE) ripples.splice(i, 1);
      const L = o.lens;
      for (let i = 0; i < n; i++) {
        let x = bx[i], y = by[i], heat = 0, grow = 0;
        if (!still) {
          const dx = x - ptr.x, dy = y - ptr.y, d = Math.hypot(dx, dy);
          if (ptr.k > 0.01 && d < L) {
            const f = (1 - d / L) * (1 - d / L) * ptr.k;
            x += (dx / (d || 1)) * f * 7; y += (dy / (d || 1)) * f * 7;
            heat = f; grow = f * 1.6;
          }
          for (let k = 0; k < ripples.length; k++) {
            const rp = ripples[k], age = now - rp.t, rx = bx[i] - rp.x, ry = by[i] - rp.y, rd = Math.hypot(rx, ry), off = rd - age * SPEED;
            if (off > -BAND && off < BAND) {
              const f = Math.cos((off / BAND) * Math.PI / 2) * (1 - age / LIFE);
              x += (rx / (rd || 1)) * f * 6; y += (ry / (rd || 1)) * f * 6;
              heat = Math.max(heat, f); grow = Math.max(grow, f * 1.3);
            }
          }
        }
        const s = o.size * (1 + grow), bucket = Math.min(BUCKETS - 1, Math.round(heat * (BUCKETS - 1)));
        if (o.shape === 'square') paths[bucket].rect(x - s, y - s, s * 2, s * 2);
        else { paths[bucket].moveTo(x + s, y); paths[bucket].arc(x, y, s, 0, Math.PI * 2); }
      }
      paths.forEach((p, i) => { ctx.fillStyle = ramp[i]; ctx.fill(p); });
      return ptr.k > 0.01 || ptr.on || ripples.length > 0;
    }
    const loop = A.loop(canvas, (dt) => {
      fps += (1 / Math.max(dt, 0.001) - fps) * 0.1;
      const busy = draw(dt);
      statT += dt;
      if (o.onStats && (statT > 0.2 || !busy)) { statT = 0; o.onStats({ dots: n, ripples: ripples.length, fps: busy ? Math.round(fps) : 0, lens: Math.round(ptr.k * 100) }); }
      return busy;
    });

    const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    function ripple(x, y) {
      if (A.reduce.matches) return;
      ripples.push({ x, y, t: performance.now() / 1000 });
      if (ripples.length > 4) ripples.shift();
      loop.wake();
    }
    const on = {
      pointermove(e) { if (e.pointerType !== 'mouse' || A.reduce.matches) return; [ptr.x, ptr.y] = local(e); ptr.on = true; loop.wake(); },
      pointerleave() { ptr.on = false; loop.wake(); },
      pointerdown(e) { const p = local(e); ripple(p[0], p[1]); }
    };
    for (const k in on) target.addEventListener(k, on[k]);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    paint(); resize();

    return (canvas._atDots = {
      ripple,
      setStyle(s) { Object.assign(o, s); paint(); draw(0); loop.wake(); },
      destroy() { loop.stop(); ro.disconnect(); for (const k in on) target.removeEventListener(k, on[k]); canvas._atDots = null; }
    });
  };
})(typeof self !== 'undefined' ? self : this);
