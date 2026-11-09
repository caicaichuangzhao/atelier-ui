/* Atelier core: shared helpers for every effect and component. Load it first.
   Everything hangs off window.Atelier; nothing else becomes global. Pair with core.css. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  document.documentElement.classList.add('at-js');
  A.reduce = matchMedia('(prefers-reduced-motion: reduce)');
  A.fine = matchMedia('(hover: hover) and (pointer: fine)');
  A.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  A.lerp = (a, b, t) => a + (b - a) * t;
  A.css = (el, name, fallback) => { const v = getComputedStyle(el).getPropertyValue(name).trim(); return v === '' ? fallback : v; };
  A.num = (el, name, fallback) => { const v = parseFloat(A.css(el, name, '')); return isNaN(v) ? fallback : v; };
  A.haptic = ms => { if (navigator.vibrate && !A.reduce.matches) try { navigator.vibrate(ms || 8); } catch (e) { /* ignored */ } };

  /* Damped spring on rAF. With `el` and no fixed k/c it reads --spring-k / --spring-c at each to(),
     so a theme change also changes how drags settle. */
  A.spring = function (o) {
    let x = o.from || 0, v = 0, target = x, raf = 0, last = 0;
    const s = {
      k: o.k || 380, c: o.c || 32, precision: o.precision || 0.01, onUpdate: o.onUpdate, onRest: o.onRest,
      get value() { return x; }, get velocity() { return v; }, get target() { return target; },
      to(t, vel) {
        if (o.el && o.k == null) { s.k = A.num(o.el, '--spring-k', 380); s.c = A.num(o.el, '--spring-c', 32); }
        target = t; if (vel != null) v = vel;
        if (!raf) { last = 0; raf = requestAnimationFrame(step); }
        return s;
      },
      set(val) { s.stop(); x = target = val; v = 0; if (s.onUpdate) s.onUpdate(x, 0); return s; },
      stop() { cancelAnimationFrame(raf); raf = 0; }
    };
    function step(now) {
      const dt = last ? Math.min(0.032, (now - last) / 1000) : 1 / 60;
      last = now;
      if (A.reduce.matches) { x = target; v = 0; }
      else for (let i = 0, h = dt / 4; i < 4; i++) { v += (-s.k * (x - target) - s.c * v) * h; x += v * h; }
      const done = Math.abs(v) < s.precision * 10 && Math.abs(x - target) < s.precision;
      if (done) { x = target; v = 0; }
      if (s.onUpdate) s.onUpdate(x, v);
      if (done) { raf = 0; if (s.onRest) s.onRest(x); } else raf = requestAnimationFrame(step);
    }
    return s;
  };

  /* Frame loop that runs only while `el` is near the viewport and the tab is visible.
     Return false from frame() to sleep; call wake() when input arrives. */
  A.loop = function (el, frame) {
    let seen = false, raf = 0, last = 0, on = true;
    function tick(now) {
      raf = 0;
      if (!on || !seen || document.hidden) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      if (frame(dt, now) !== false) raf = requestAnimationFrame(tick);
    }
    function wake() { if (!raf && on && seen && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } }
    const io = new IntersectionObserver(es => { seen = es[es.length - 1].isIntersecting; wake(); }, { rootMargin: '120px' });
    io.observe(el);
    document.addEventListener('visibilitychange', wake);
    return { wake, stop() { on = false; cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', wake); } };
  };

  /* Clipboard with a textarea fallback for file:// and http pages. Resolves true or false. */
  A.copy = function (text) {
    const fallback = () => {
      const ta = document.createElement('textarea'), active = document.activeElement;
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); if (active && active.focus) active.focus();
      return ok;
    };
    if (navigator.clipboard && root.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, fallback);
    return Promise.resolve(fallback());
  };

  /* One polite live region; the newest message replaces the previous one. */
  let toastEl, toastT;
  A.toast = function (msg, tone) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'at-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.dataset.tone = tone || '';
    toastEl.classList.remove('is-on'); void toastEl.offsetWidth; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  };

  /* Success burst: short marks and a ring fly out from (x, y) inside `host` (host must be positioned). */
  A.burst = function (host, x, y, o) {
    o = o || {};
    if (A.reduce.matches || !host.animate) return;
    const n = o.count || 10, dist = o.distance || 34, colors = o.colors || [A.css(host, '--c-accent', '#888')];
    const ease = 'cubic-bezier(.2,.7,.3,1)';
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i'), ang = (i / n) * 360 + (Math.random() - 0.5) * 24, d = dist * (0.75 + Math.random() * 0.45);
      p.className = 'at-burst-bit' + (i % 2 ? ' is-dot' : '');
      p.style.cssText = 'left:' + x + 'px;top:' + y + 'px;background:' + colors[i % colors.length];
      host.appendChild(p);
      p.animate([
        { transform: 'translate(-50%,-50%) rotate(' + (ang + 90) + 'deg) translateY(-4px) scale(1)', opacity: 1 },
        { transform: 'translate(-50%,-50%) rotate(' + (ang + 90) + 'deg) translateY(' + -d + 'px) scale(.3)', opacity: 0 }
      ], { duration: 500 + Math.random() * 200, easing: ease }).onfinish = () => p.remove();
    }
    if (o.ring === false) return;
    const r = document.createElement('i');
    r.className = 'at-burst-ring';
    r.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + dist * 1.7 + 'px;height:' + dist * 1.7 + 'px;border-color:' + colors[0];
    host.appendChild(r);
    r.animate([{ transform: 'translate(-50%,-50%) scale(.35)', opacity: 0.8 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }], { duration: 460, easing: ease }).onfinish = () => r.remove();
  };

  /* Scroll reveal: elements with [data-reveal] rise in once; items entering together get a short stagger. */
  A.reveal = function (selector) {
    const els = document.querySelectorAll(selector || '[data-reveal]');
    if (A.reduce.matches || !('IntersectionObserver' in root)) { els.forEach(e => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver(es => es.filter(e => e.isIntersecting).forEach((e, i) => {
      io.unobserve(e.target); e.target.style.setProperty('--i', i); e.target.classList.add('is-in');
    }), { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    els.forEach(e => io.observe(e));
  };

  /* Circular reveal for theme or mode changes, growing from the point the user touched. */
  A.transition = function (update, x, y) {
    if (!document.startViewTransition || A.reduce.matches) { update(); return Promise.resolve(); }
    x = x == null ? innerWidth / 2 : x; y = y == null ? innerHeight / 2 : y;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = document.startViewTransition(update);
    t.ready.then(() => document.documentElement.animate(
      { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
      { duration: 640, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }
    )).catch(() => {});
    return t.finished.catch(() => {});
  };
})(typeof self !== 'undefined' ? self : this);
