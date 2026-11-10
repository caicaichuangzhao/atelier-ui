/* Marquee: an endless row that cruises, slows under the pointer, can be dragged and thrown, then picks its speed
   back up. Needs core.js; styles in marquee.css.
   <div class="at-marquee" role="region" aria-label="…"><div class="at-marquee__track"> items </div></div>
   const m = Atelier.marquee(el, { speed: 40, reverse: false, hover: 0.2, drag: true, onState(s) {} });
   m.pause(); m.play(); m.destroy();
   Copies made to fill the loop are aria-hidden and inert, so a screen reader and Tab see each item once.
   Keyboard focus inside the row stops it. Reduced motion: no loop, the row scrolls sideways by hand instead. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  A.marquee = function (el, o) {
    if (el._atMarquee) return el._atMarquee;
    o = Object.assign({ speed: 40, reverse: false, hover: 0.2, drag: true }, o);
    const track = el.querySelector('.at-marquee__track'), originals = Array.from(track.children);
    let setW = 0, x = 0, mult = 1, goal = 1, held = false, paused = false, drag = null, fling = 0, statT = 0, mode = 'cruise';
    const dir = o.reverse ? 1 : -1;

    function fill() {
      track.querySelectorAll('[data-at-clone]').forEach(c => c.remove());
      if (A.reduce.matches) { el.classList.add('is-static'); return; }
      el.classList.remove('is-static');
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      setW = originals.reduce((w, c) => w + c.getBoundingClientRect().width + gap, 0);
      if (setW < 1) return;
      const need = Math.ceil((el.clientWidth + setW) / setW); // enough copies to cover the box plus one set to wrap into
      for (let k = 0; k < need; k++) originals.forEach(c => {
        const d = c.cloneNode(true);
        d.setAttribute('data-at-clone', ''); d.setAttribute('aria-hidden', 'true'); d.inert = true;
        track.appendChild(d);
      });
    }
    const wrap = v => { if (!setW) return 0; v %= setW; return v > 0 ? v - setW : v; };
    const emit = () => { if (o.onState) o.onState({ mode, speed: Math.round(Math.abs(o.speed * mult + fling)), copies: track.children.length - originals.length }); };
    const loop = A.loop(el, dt => {
      if (A.reduce.matches || !setW) return false;
      if (!drag) {
        goal = paused || el.matches(':focus-within') ? 0 : held ? o.hover : 1;
        mult += (goal - mult) * Math.min(1, dt * 4);   // ease toward the goal speed instead of stopping dead
        fling *= Math.pow(0.04, dt);                    // a throw decays within about a second
        if (Math.abs(fling) < 2) fling = 0;
        x = wrap(x + (dir * o.speed * mult + fling) * dt);
      }
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      const next = drag ? 'drag' : goal === 0 ? 'paused' : fling ? 'coast' : held ? 'hover' : 'cruise';
      statT += dt;
      if (next !== mode || statT > 0.25) { mode = next; statT = 0; emit(); }
      return !(goal === 0 && mult < 0.002 && !fling && !drag); // fully stopped: sleep until play, focus or a drag
    });

    const on = {
      pointerenter(e) { if (e.pointerType === 'mouse') held = true; },
      pointerleave() { held = false; },
      pointerdown(e) {
        if (!o.drag || A.reduce.matches || e.button !== 0) return;
        drag = { x0: e.clientX, start: x, moved: false, id: e.pointerId, samples: [[performance.now(), e.clientX]] };
      },
      pointermove(e) {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x0;
        if (!drag.moved) { if (Math.abs(dx) < 6) return; drag.moved = true; el.setPointerCapture(e.pointerId); el.classList.add('is-dragging'); }
        x = wrap(drag.start + dx);
        drag.samples.push([performance.now(), e.clientX]);
        while (drag.samples.length > 2 && performance.now() - drag.samples[0][0] > 100) drag.samples.shift();
        loop.wake();
      },
      pointerup: end, pointercancel: end, lostpointercapture: end,
      click(e) { if (el._atSwallow) { e.preventDefault(); e.stopPropagation(); } }
    };
    function end() {
      if (!drag) return;
      const d = drag; drag = null;
      el.classList.remove('is-dragging');
      if (!d.moved) return;
      const a = d.samples[0], b = d.samples[d.samples.length - 1], v = (b[1] - a[1]) / Math.max(1, b[0] - a[0]) * 1000; // px/s
      fling = A.clamp(v, -3000, 3000) - dir * o.speed * mult; // hand the throw to the loop, on top of the cruise
      el._atSwallow = true; setTimeout(() => { el._atSwallow = false; }, 0); // the click after a drag is not a tap
      loop.wake();
    }
    for (const k in on) el.addEventListener(k, on[k], k === 'click');
    el.addEventListener('focusin', () => loop.wake());
    el.addEventListener('focusout', () => loop.wake());
    let w = 0;
    const ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) > 1) { w = el.clientWidth; fill(); loop.wake(); } });
    ro.observe(el);
    if (document.fonts) document.fonts.ready.then(() => { fill(); loop.wake(); }); // item widths change once the web font lands

    return (el._atMarquee = {
      pause() { paused = true; loop.wake(); }, play() { paused = false; loop.wake(); },
      get paused() { return paused; },
      destroy() { loop.stop(); ro.disconnect(); for (const k in on) el.removeEventListener(k, on[k], k === 'click'); track.querySelectorAll('[data-at-clone]').forEach(c => c.remove()); track.style.transform = ''; el._atMarquee = null; }
    });
  };
})(typeof self !== 'undefined' ? self : this);
