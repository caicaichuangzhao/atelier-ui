/* Swipe stack: decide on one card at a time. The top card follows the finger 1:1 and tilts with it; the card below
   rises as you pull; past a third of the width (or with a throw) it flies off, otherwise it springs back.
   Needs core.js; styles in stack.css.
   <div class="at-stack" tabindex="0" aria-label="…">
     <article class="at-stack__card">… <span class="at-stack__stamp" data-dir="right">收下</span><span class="at-stack__stamp" data-dir="left">跳过</span></article> …
   </div>
   const s = Atelier.stack(el, { onSwipe(dir, card, left), onState(s) {} });
   s.swipe('left' | 'right'); s.undo(); s.reset(); s.left (cards remaining)
   Keyboard: ← / → decide, Backspace or Ctrl+Z undo. Decisions are announced in a polite live region.
   Reduced motion: dragging still follows the finger, but cards leave and return with a fade. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  A.stack = function (el, o) {
    if (el._atStack) return el._atStack;
    o = o || {};
    const cards = Array.from(el.querySelectorAll(':scope > .at-stack__card')), done = [];
    const live = document.createElement('span');
    live.className = 'at-sr'; live.setAttribute('role', 'status');
    el.appendChild(live);
    let top = 0, drag = null;
    const W = () => el.getBoundingClientRect().width || 300;
    const title = c => (c.querySelector('h3, h4, b') || c).textContent.trim();
    const emit = s => { if (o.onState) o.onState(Object.assign({ left: cards.length - top }, s)); };

    /* the waiting cards: each one a little smaller and lower; `pull` (0–1) raises them toward the next place */
    function layout(pull, holdTop) { // holdTop: the top card is being dragged or springing back, leave its transform alone
      pull = pull || 0;
      cards.forEach((c, i) => {
        const k = i - top;
        if (k < 0) { c.classList.remove('is-top'); c.setAttribute('aria-hidden', 'true'); c.inert = true; return; } // already decided
        const depth = Math.max(0, k - pull);
        c.style.zIndex = String(cards.length - i);
        c.setAttribute('aria-hidden', String(k !== 0)); c.inert = k !== 0;
        c.classList.toggle('is-top', k === 0);
        if (k === 0 && holdTop) return;
        c.style.transform = 'translateY(' + Math.min(depth, 2) * 12 + 'px) scale(' + (1 - Math.min(depth, 2) * 0.05) + ')';
        c.style.opacity = k > 2 ? '0' : '1';
      });
      el.toggleAttribute('data-empty', top >= cards.length);
    }
    function pose(c, x, y) {
      const r = A.clamp(x / W() * 16, -18, 18);
      c.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + r.toFixed(2) + 'deg)';
      const p = A.clamp(Math.abs(x) / (W() / 3), 0, 1);
      c.querySelectorAll('.at-stack__stamp').forEach(s => { s.style.opacity = (s.dataset.dir === (x > 0 ? 'right' : 'left') ? p : 0).toFixed(3); });
      return p;
    }
    function fly(c, dir, vx, vy, from) {
      const w = W(), x0 = from ? from[0] : 0, y0 = from ? from[1] : 0;
      const sx = dir === 'right' ? 1 : -1, speed = Math.max(Math.abs(vx), 1.2); // px/ms
      const dist = w * 1.25 - Math.abs(x0), dur = A.clamp(dist / speed, 200, 420);
      const x1 = sx * w * 1.25, y1 = y0 + (vy || 0) * dur * 0.6, r1 = sx * 22;
      const end = () => { c.style.transform = 'translate(' + x1 + 'px,' + y1 + 'px) rotate(' + r1 + 'deg)'; c.style.opacity = '0'; c.style.visibility = 'hidden'; };
      if (A.reduce.matches || !c.animate) { end(); return; }
      const a = c.animate([{ transform: c.style.transform || 'none', opacity: 1 },
        { transform: 'translate(' + x1 + 'px,' + y1 + 'px) rotate(' + r1 + 'deg)', opacity: 0.4 }], { duration: dur, easing: 'cubic-bezier(.3,.6,.4,1)' });
      c._atFly = a;
      a.onfinish = () => { if (c._atFly === a) { c._atFly = null; end(); } }; // an undo mid-flight cancels it: then do nothing
    }
    function decide(dir, vx, vy, from) {
      if (top >= cards.length) return;
      const c = cards[top];
      c.querySelectorAll('.at-stack__stamp').forEach(s => { s.style.opacity = s.dataset.dir === dir ? '1' : '0'; });
      done.push({ c, dir });
      top++;
      fly(c, dir, vx || 0, vy || 0, from);
      layout(0);
      A.haptic(10);
      live.textContent = (dir === 'right' ? '收下：' : '跳过：') + title(c);
      if (o.onSwipe) o.onSwipe(dir, c, cards.length - top);
      emit({ phase: 'decided', dir });
    }
    function undo() {
      const last = done.pop();
      if (!last) return false;
      const c = last.c;
      top--;
      c._atFly = null;
      c.getAnimations().forEach(a => a.cancel());
      c.style.visibility = ''; c.style.opacity = '1';
      c.querySelectorAll('.at-stack__stamp').forEach(s => { s.style.opacity = '0'; });
      const sx = last.dir === 'right' ? 1 : -1, from = 'translate(' + sx * W() * 1.25 + 'px,-20px) rotate(' + sx * 22 + 'deg)';
      layout(0);
      if (c.animate && !A.reduce.matches) c.animate([{ transform: from, opacity: 0.4 }, { transform: c.style.transform, opacity: 1 }], { duration: parseFloat(A.css(el, '--d-move', '')) || 460, easing: A.css(el, '--e-move', 'ease-out') });
      live.textContent = '撤销：' + title(c);
      emit({ phase: 'undo', dir: last.dir });
      return true;
    }
    function reset() { while (undo()); }

    el.addEventListener('pointerdown', e => {
      const c = cards[top];
      if (!c || e.button !== 0 || !c.contains(e.target) || e.target.closest('button, a, input')) return;
      c.getAnimations().forEach(a => a.cancel());
      if (c._atBack) c._atBack.stop();
      const m = (c.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/) || [0, 0, 0]).slice(1).map(Number); // catch it mid-spring
      drag = { c, x0: e.clientX - m[0], y0: e.clientY - m[1], id: e.pointerId, moved: false, s: [] };
    });
    el.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const x = e.clientX - drag.x0, y = (e.clientY - drag.y0) * 0.35; // vertical travel is damped: the decision is sideways
      if (!drag.moved) { if (Math.hypot(x, y) < 6) return; drag.moved = true; el.setPointerCapture(e.pointerId); el.classList.add('is-dragging'); }
      const p = pose(drag.c, x, y);
      drag.x = x; drag.y = y;
      drag.s.push([performance.now(), x, y]);
      while (drag.s.length > 2 && performance.now() - drag.s[0][0] > 100) drag.s.shift();
      layout(p, true);
      emit({ phase: 'drag', offset: Math.round(x), toward: p >= 1 ? (x > 0 ? 'right' : 'left') : null });
    });
    function end() {
      if (!drag) return;
      const d = drag; drag = null;
      el.classList.remove('is-dragging');
      if (!d.moved) return;
      const a = d.s[0], b = d.s[d.s.length - 1], dt = Math.max(1, b[0] - a[0]), vx = (b[1] - a[1]) / dt, vy = (b[2] - a[2]) / dt;
      const far = Math.abs(d.x) > W() / 3, thrown = Math.abs(vx) > 0.5 && Math.sign(vx) === Math.sign(d.x);
      if (far || thrown) { decide(d.x > 0 ? 'right' : 'left', vx, vy, [d.x, d.y]); return; }
      // spring back home, handing over the release velocity (px/ms → px/s)
      const c = d.c, sx = A.spring({ el, from: d.x }), sy = A.spring({ el, from: d.y });
      let x = d.x, y = d.y;
      sx.onUpdate = v => { x = v; layout(pose(c, x, y), true); };
      sy.onUpdate = v => { y = v; pose(c, x, y); };
      c.classList.add('is-live'); // per-frame writes from the springs: no CSS transition on top of them
      sx.onRest = () => { c.classList.remove('is-live'); layout(0); emit({ phase: 'rest' }); };
      c._atBack = { stop() { sx.stop(); sy.stop(); c.classList.remove('is-live'); } };
      sx.to(0, vx * 1000); sy.to(0, vy * 1000);
      emit({ phase: 'back' });
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    el.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); decide(e.key === 'ArrowRight' ? 'right' : 'left'); }
      else if (e.key === 'Backspace' || (e.key === 'z' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); undo(); }
    });

    layout(0);
    return (el._atStack = { swipe: dir => decide(dir === 'right' ? 'right' : 'left'), undo, reset, get left() { return cards.length - top; } });
  };
})(typeof self !== 'undefined' ? self : this);
