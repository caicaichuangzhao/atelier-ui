/* Text particles: a line of text becomes a few thousand points that spring home, swirl away from the pointer,
   scatter on tap and morph when the text changes. Needs core.js.
   const p = Atelier.particles(canvas, { text: '每一步，都有回应。', font: '900 {size}px "Noto Serif SC", serif',
     colors: ['#1f170d', '#dd5942'], hot: '#dd5942', paint: 'ink' | 'gradient' | 'confetti', shape: 'square' | 'round',
     blend: 'source-over' | 'lighter', twinkle: 0, align: 'center' | 'left', target: hostEl, onStats(s) {} });
   p.setText('新的一句'); p.setStyle({ colors, hot, font, paint }); p.scatter(); p.destroy();
   The canvas is decorative: keep the real text in the DOM (aria-hidden on the canvas). */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  const rgbOf = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';

  A.particles = function (canvas, opts) {
    const o = Object.assign({ text: 'Atelier', font: '800 {size}px system-ui, sans-serif', colors: ['#222222'], hot: null,
      paint: 'ink', shape: 'square', blend: 'source-over', twinkle: 0, density: 1, align: 'center' }, opts);
    const ctx = canvas.getContext('2d'), target = o.target || canvas;
    if (!canvas.style.touchAction) canvas.style.touchAction = 'pan-y';
    let W = 0, H = 0, dpr = 1, N = 0, gap = 4, size = 2, R = 90, age = 0, energy = 0, fps = 60, statT = 0, ready = false;
    let x, y, vx, vy, hx, hy, heat, col, delay, key = new Uint16Array(0), idx = new Uint32Array(0);
    let palette = [], hotRamp = [];
    const ptr = { x: -1e4, y: -1e4, in: false };

    function colors() {
      const base = o.colors.map(rgbOf), hot = rgbOf(o.hot || o.colors[o.colors.length - 1]);
      let rgb = base;
      if (o.paint === 'gradient' && base.length > 1) rgb = Array.from({ length: 8 }, (_, i) => {
        const t = (i / 7) * (base.length - 1), k = Math.min(base.length - 2, Math.floor(t));
        return base[k].map((v, j) => v + (base[k + 1][j] - v) * (t - k));
      });
      palette = rgb.map(c => mix(c, c, 0));
      hotRamp = rgb.map(c => [1, 2, 3, 4].map(s => mix(c, hot, s / 4))); // fast particles glow toward `hot`
      for (let i = 0; i < N; i++) col[i] = pick(hx[i]);
    }
    function pick(px) {
      const n = palette.length;
      if (o.paint === 'gradient') return Math.min(n - 1, Math.floor((px / W) * n));
      if (o.paint === 'confetti') return Math.floor(Math.random() * n);
      return n > 1 && Math.random() < 0.06 ? 1 + Math.floor(Math.random() * (n - 1)) : 0; // ink: a few flecks of the other colors
    }
    function sample() {
      const off = document.createElement('canvas'), c = off.getContext('2d', { willReadFrequently: true });
      off.width = W; off.height = H;
      const fontAt = s => o.font.replace('{size}', s.toFixed(1));
      const fit = arr => { c.font = fontAt(100); const w = Math.max(...arr.map(l => c.measureText(l).width)) / 100; return Math.min((W * 0.92) / w, (H * 0.84) / (arr.length * 1.12)); };
      let ls = String(o.text).split('\n'), fs = fit(ls);
      if (ls.length === 1 && ls[0].length > 3 && fs < H * 0.3) { // too small on one line: break at the punctuation nearest the middle
        const t = ls[0], mid = t.length / 2;
        let cut = Math.round(mid), best = 1e9;
        for (let i = 1; i < t.length - 1; i++) if ('，,。.、 ：:；;！!？?'.includes(t[i]) && Math.abs(i + 1 - mid) < best) { best = Math.abs(i + 1 - mid); cut = i + 1; }
        const two = [t.slice(0, cut).trim(), t.slice(cut).trim()], fs2 = fit(two);
        if (fs2 > fs * 1.25) { ls = two; fs = fs2; }
      }
      c.font = fontAt(fs); c.textAlign = o.align; c.textBaseline = 'middle'; c.fillStyle = '#000';
      const lh = fs * 1.12, top = H / 2 - ((ls.length - 1) * lh) / 2, lx = o.align === 'left' ? W * 0.04 : W / 2;
      ls.forEach((l, i) => c.fillText(l, lx, top + i * lh));
      const data = c.getImageData(0, 0, W, H).data;
      let ink = 0;
      for (let i = 3; i < data.length; i += 16) if (data[i] > 128) ink++;
      gap = Math.max(2, Math.sqrt((ink * 4) / ((W < 640 ? 1500 : 3200) * o.density))); // keep the count near the budget
      size = Math.max(1.2, gap * 0.62);
      const pts = [];
      for (let py = 0, row = 0; py < H; py += gap, row++)
        for (let px = (row % 2) * (gap / 2); px < W; px += gap) if (data[((py | 0) * W + (px | 0)) * 4 + 3] > 128) pts.push(px, py);
      return pts;
    }
    function build(morph) {
      if (!W || !H) return;
      const pts = sample(), n = pts.length / 2, F = () => new Float32Array(n);
      const nx = F(), ny = F(), nvx = F(), nvy = F(), nhx = F(), nhy = F(), nh = F(), nd = F(), nc = new Uint8Array(n);
      const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => pts[a * 2] - pts[b * 2]);
      const old = morph && N ? Array.from({ length: N }, (_, i) => i).sort((a, b) => x[a] - x[b]) : null;
      order.forEach((t, k) => { // pair old and new points left to right so each particle travels a short way
        nhx[t] = pts[t * 2]; nhy[t] = pts[t * 2 + 1];
        if (old) { const s = old[Math.floor((k / n) * old.length)]; nx[t] = x[s]; ny[t] = y[s]; nvx[t] = vx[s]; nvy[t] = vy[s]; nh[t] = 0.5; }
        else if (A.reduce.matches) { nx[t] = nhx[t]; ny[t] = nhy[t]; }
        else { nx[t] = nhx[t] + (Math.random() - 0.5) * W * 0.5; ny[t] = nhy[t] + (Math.random() - 0.5) * H * 1.2; nd[t] = (k / n) * 0.9 + Math.random() * 0.25; }
      });
      x = nx; y = ny; vx = nvx; vy = nvy; hx = nhx; hy = nhy; heat = nh; delay = nd; col = nc; N = n;
      for (let i = 0; i < N; i++) col[i] = pick(hx[i]);
      if (!old) age = 0;
      energy = 1; loop.wake();
    }
    function frame(dt) {
      age += dt;
      const f = dt * 60, k = 0.055 * f, damp = Math.pow(0.86, f);
      R = Math.max(70, Math.min(W, H) * 0.24);
      let e = 0, hmax = 0;
      for (let i = 0; i < N; i++) {
        if (delay[i] > age) continue;
        let ax = (hx[i] - x[i]) * k, ay = (hy[i] - y[i]) * k;
        if (ptr.in) {
          const dx = x[i] - ptr.x, dy = y[i] - ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < R * R) { // push away plus a little sideways swirl, stronger near the pointer
            const d = Math.sqrt(d2) + 0.01, fall = 1 - d / R, p = fall * fall * 6 * f;
            ax += (dx / d - (dy / d) * 0.35) * p; ay += (dy / d + (dx / d) * 0.35) * p;
            heat[i] = Math.min(1, heat[i] + fall * 0.25);
          }
        }
        vx[i] = (vx[i] + ax) * damp; vy[i] = (vy[i] + ay) * damp;
        x[i] += vx[i] * f; y[i] += vy[i] * f;
        heat[i] *= Math.pow(0.95, f);
        if (heat[i] > hmax) hmax = heat[i];
        e += Math.abs(vx[i]) + Math.abs(vy[i]);
      }
      energy = e / Math.max(1, N);
      if (o.twinkle > 0 && !A.reduce.matches && Math.random() < o.twinkle * dt) for (let j = 0; j < 3; j++) heat[(Math.random() * N) | 0] = 1;
      draw();
      fps += (1 / Math.max(dt, 0.001) - fps) * 0.1;
      statT += dt;
      if (o.onStats && statT > 0.25) { statT = 0; o.onStats({ count: N, fps: Math.round(fps), energy: energy, radius: Math.round(R), pointer: ptr.in ? [Math.round(ptr.x), Math.round(ptr.y)] : null }); }
      return ptr.in || energy > 0.02 || hmax > 0.05 || age < 2 || o.twinkle > 0;
    }
    function draw() { // bucket by color and heat so each fillStyle is set once per frame
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = o.blend;
      ctx.globalAlpha = A.reduce.matches ? 1 : Math.min(1, age / 0.5);
      const B = palette.length * 5, count = new Uint32Array(B + 1);
      if (key.length < N) { key = new Uint16Array(N); idx = new Uint32Array(N); }
      for (let i = 0; i < N; i++) { const h = heat[i]; key[i] = col[i] * 5 + (h > 0.75 ? 4 : h > 0.5 ? 3 : h > 0.3 ? 2 : h > 0.12 ? 1 : 0); count[key[i] + 1]++; }
      for (let b = 0; b < B; b++) count[b + 1] += count[b];
      const pos = count.slice(0, B);
      for (let i = 0; i < N; i++) idx[pos[key[i]]++] = i;
      for (let b = 0; b < B; b++) {
        const s = count[b], e = count[b + 1];
        if (s === e) continue;
        const c = (b / 5) | 0, lv = b % 5, sz = lv > 2 ? size * 1.35 : size, half = sz / 2;
        ctx.fillStyle = lv ? hotRamp[c][lv - 1] : palette[c];
        if (o.shape === 'round') { ctx.beginPath(); for (let j = s; j < e; j++) { const i = idx[j]; ctx.moveTo(x[i] + half, y[i]); ctx.arc(x[i], y[i], half, 0, 6.2832); } ctx.fill(); }
        else for (let j = s; j < e; j++) { const i = idx[j]; ctx.fillRect(x[i] - half, y[i] - half, sz, sz); }
      }
    }
    function resize() {
      const r = canvas.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
      if (!w || !h || (w === W && h === H)) return false;
      W = w; H = h; dpr = Math.min(2, root.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      return true;
    }
    function scatter(px, py, s) {
      if (A.reduce.matches) return;
      const reach = Math.max(W, H) * 0.6;
      for (let i = 0; i < N; i++) {
        const dx = x[i] - px, dy = y[i] - py, d = Math.sqrt(dx * dx + dy * dy) + 1, f = Math.max(0, 1 - d / reach), p = (14 * f * f + Math.random() * 2 * f) * s;
        vx[i] += (dx / d) * p; vy[i] += (dy / d) * p; heat[i] = Math.min(1, heat[i] + f * 0.9);
      }
      energy = 1; loop.wake();
    }
    let faces = 0; // web font faces the last sample was drawn with; a later, larger count means it used fallback glyphs
    const fontLoad = () => {
      if (!document.fonts || !document.fonts.load) return Promise.resolve();
      let late = false;
      return Promise.race([
        document.fonts.load(o.font.replace('{size}', '48'), String(o.text)).then(f => { if (!late) faces = f.length; }, () => {}),
        new Promise(r => setTimeout(() => { late = true; r(); }, 2000))
      ]);
    };
    // A font that arrives after the first sample (slow CDN, font CSS loaded without blocking) is drawn by sampling again.
    let checking = false;
    const recheck = () => {
      if (!ready || checking || !document.fonts || !document.fonts.load) return;
      checking = true;
      document.fonts.load(o.font.replace('{size}', '48'), String(o.text)).then(f => {
        checking = false;
        if (f.length > faces) { faces = f.length; build(true); }
      }, () => { checking = false; });
    };
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', recheck);
    if (document.readyState !== 'complete') addEventListener('load', recheck, { once: true });
    const at = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const onMove = e => { const p = at(e); ptr.x = p[0]; ptr.y = p[1]; ptr.in = !A.reduce.matches; loop.wake(); };
    const onLeave = () => { ptr.in = false; ptr.x = ptr.y = -1e4; };
    const onDown = e => { const p = at(e); scatter(p[0], p[1], e.pointerType === 'touch' ? 0.6 : 1); };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerleave', onLeave);
    target.addEventListener('pointerdown', onDown);
    const loop = A.loop(canvas, frame);
    let roT = 0;
    const ro = new ResizeObserver(() => { if (!ready) return; clearTimeout(roT); roT = setTimeout(() => { if (resize()) build(N > 0); }, 140); });
    ro.observe(canvas);
    colors();
    fontLoad().then(() => { ready = true; resize(); build(false); });

    return {
      setText(t) { o.text = t; return fontLoad().then(() => build(true)); },
      setStyle(s) { const refont = s.font && s.font !== o.font; Object.assign(o, s); colors(); loop.wake(); return refont ? fontLoad().then(() => build(true)) : Promise.resolve(); },
      scatter(px, py) { scatter(px == null ? W / 2 : px, py == null ? H / 2 : py, 1); },
      get count() { return N; },
      destroy() {
        loop.stop(); ro.disconnect(); removeEventListener('load', recheck);
        if (document.fonts && document.fonts.removeEventListener) document.fonts.removeEventListener('loadingdone', recheck);
        target.removeEventListener('pointermove', onMove); target.removeEventListener('pointerleave', onLeave); target.removeEventListener('pointerdown', onDown);
      }
    };
  };
})(typeof self !== 'undefined' ? self : this);
