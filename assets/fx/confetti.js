/* Confetti: paper pieces burst from a point, flutter as they turn and drift down under gravity and air drag.
   Needs core.js. One shared fixed canvas is created on demand and removed when the last piece lands.
   Atelier.confetti({ x, y, count: 90, angle: 90, spread: 70, power: 1, colors, onDone }) → Promise (resolves when the
     last piece lands; its .count is the number of pieces launched)
     x, y in viewport pixels (default: center); angle in degrees, 90 = straight up.
   Only for real milestones: first task done, a plan unlocked, a streak. Not on payment or error pages.
   Reduced motion: nothing flies (show the success in words instead); low-end devices get half the pieces. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  let cv = null, ctx = null, parts = [], loop = 0, last = 0, waiters = [], dpr = 1;
  function size() { dpr = Math.min(2, root.devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
  function ensure() {
    if (cv) return;
    cv = document.createElement('canvas');
    cv.className = 'at-confetti'; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:var(--z-toast,60)';
    document.body.appendChild(cv); ctx = cv.getContext('2d'); size();
    root.addEventListener('resize', size);
  }
  function frame(now) {
    const dt = last ? Math.min(0.033, (now - last) / 1000) : 1 / 60;
    last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      p.vy += 980 * p.g * dt;                         // gravity, px/s²
      const drag = Math.pow(p.drag, dt * 60);          // paper is light: air slows it fast
      p.vx *= drag; p.vy *= drag;
      p.x += (p.vx + Math.sin(p.age * p.wob + p.ph) * 40) * dt; // side-to-side sway while falling
      p.y += p.vy * dt;
      p.rot += p.vr * dt; p.flip += p.vf * dt;
      if (p.y > innerHeight + 40 || p.age > p.life) { parts.splice(i, 1); continue; }
      const fade = Math.min(1, (p.life - p.age) / 0.5);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.flip));                 // turning over: the piece narrows to an edge and back
      ctx.fillStyle = p.c;
      if (p.shape === 0) ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h * 1.4, p.w * 0.45, p.h * 2.8); // thin streamer
      ctx.restore();
    }
    if (parts.length) loop = requestAnimationFrame(frame);
    else { loop = 0; last = 0; cv.remove(); root.removeEventListener('resize', size); cv = null; waiters.forEach(w => w()); waiters = []; }
  }

  A.confetti = function (o) {
    o = o || {};
    if (A.reduce.matches) { const none = Promise.resolve(0); none.count = 0; return none; }
    ensure();
    const doc = document.documentElement;
    const colors = o.colors || ['accent', 'spice', 'data-2', 'data-3', 'data-4', 'warn'].map(k => A.css(doc, '--c-' + k, '#e34'));
    const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    const n = Math.round((o.count || 90) * (weak ? 0.5 : 1)), x = o.x == null ? innerWidth / 2 : o.x, y = o.y == null ? innerHeight / 2 : o.y;
    const base = (o.angle == null ? 90 : o.angle) * Math.PI / 180, spread = (o.spread || 70) * Math.PI / 180, power = o.power || 1;
    for (let i = 0; i < n; i++) {
      const a = base + (Math.random() - 0.5) * spread, v = (520 + Math.random() * 520) * power;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: -Math.sin(a) * v, g: 0.55 + Math.random() * 0.35, drag: 0.93 + Math.random() * 0.03,
        rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 12, flip: Math.random() * 6.3, vf: 6 + Math.random() * 10,
        wob: 3 + Math.random() * 4, ph: Math.random() * 6.3, w: 6 + Math.random() * 6, h: 4 + Math.random() * 5,
        c: colors[i % colors.length], shape: i % 7 === 0 ? 2 : i % 4 === 0 ? 1 : 0, age: 0, life: 2.6 + Math.random() * 1.6 });
    }
    if (!loop) loop = requestAnimationFrame(frame);
    const landed = new Promise(r => waiters.push(() => { if (o.onDone) o.onDone(n); r(n); }));
    landed.count = n; // pieces launched, known at once
    return landed;
  };
})(typeof self !== 'undefined' ? self : this);
