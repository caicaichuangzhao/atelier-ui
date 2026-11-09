/* Pointer effects. Needs core.js. All three do nothing on touch screens and with reduced motion.
   Atelier.magnetic(el, { strength: 0.35, radius: 70 })  el leans toward a nearby pointer; [data-magnetic-inner] leans further
   Atelier.spotlight(container, '.tile')                    each tile gets --mx/--my (px) and the container --spot (0/1) for a CSS glow
   Atelier.tilt(el, { max: 7 })                             3D tilt plus --gx/--gy (%) and --glare (0/1) for a highlight
   Each returns a destroy function. Styles: pointer.css. Never stack two of these on the same region. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  const off = () => !A.fine.matches || A.reduce.matches;
  const listen = (el, map) => { for (const k in map) el.addEventListener(k, map[k]); return () => { for (const k in map) el.removeEventListener(k, map[k]); }; };

  A.magnetic = function (el, o) {
    o = Object.assign({ strength: 0.35, radius: 70 }, o);
    const inner = el.querySelector('[data-magnetic-inner]'), zone = o.zone || el.parentElement || el;
    let raf = 0, px = 0, py = 0, on = false;
    el.classList.add('at-magnetic');
    function apply() {
      raf = 0;
      const r = el.getBoundingClientRect(), t = getComputedStyle(el).transform;
      const m = t && t !== 'none' ? new DOMMatrixReadOnly(t) : { m41: 0, m42: 0 }; // measure the untransformed box
      const dx = px - (r.left + r.width / 2 - m.m41), dy = py - (r.top + r.height / 2 - m.m42);
      const reach = Math.max(r.width, r.height) / 2 + o.radius, d = Math.hypot(dx, dy);
      const f = on && d < reach ? o.strength * (1 - d / reach) : 0; // zero at the edge of reach, so it never jumps
      el.style.transform = f ? 'translate(' + (dx * f).toFixed(2) + 'px,' + (dy * f).toFixed(2) + 'px)' : '';
      if (inner) inner.style.transform = f ? 'translate(' + (dx * f * 0.5).toFixed(2) + 'px,' + (dy * f * 0.5).toFixed(2) + 'px)' : '';
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(apply); };
    return listen(zone, {
      pointermove(e) { if (e.pointerType !== 'mouse' || off()) return; px = e.clientX; py = e.clientY; on = true; kick(); },
      pointerleave() { on = false; kick(); }
    });
  };

  A.spotlight = function (container, selector) {
    let raf = 0, px = 0, py = 0, on = false;
    function apply() {
      raf = 0;
      const tiles = Array.from(container.querySelectorAll(selector)), rects = tiles.map(t => t.getBoundingClientRect());
      tiles.forEach((t, i) => { t.style.setProperty('--mx', (px - rects[i].left).toFixed(0) + 'px'); t.style.setProperty('--my', (py - rects[i].top).toFixed(0) + 'px'); });
      container.style.setProperty('--spot', on ? 1 : 0);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(apply); };
    return listen(container, {
      pointermove(e) { if (e.pointerType !== 'mouse' || off()) return; px = e.clientX; py = e.clientY; on = true; kick(); },
      pointerleave() { on = false; kick(); }
    });
  };

  A.tilt = function (el, o) {
    o = Object.assign({ max: 7 }, o);
    let raf = 0, nx = 0.5, ny = 0.5, on = false;
    el.classList.add('at-tilt');
    function apply() {
      raf = 0;
      const rx = on ? (0.5 - ny) * o.max * 2 : 0, ry = on ? (nx - 0.5) * o.max * 2 : 0;
      el.style.transform = on ? 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)' : '';
      el.style.setProperty('--gx', (nx * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', (ny * 100).toFixed(1) + '%');
      el.style.setProperty('--glare', on ? 1 : 0);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(apply); };
    return listen(el, {
      pointerenter() { el._atRect = el.getBoundingClientRect(); }, // measure before tilting, the tilted box is skewed
      pointermove(e) {
        if (e.pointerType !== 'mouse' || off()) return;
        const r = el._atRect || el.getBoundingClientRect();
        nx = A.clamp((e.clientX - r.left) / r.width, 0, 1); ny = A.clamp((e.clientY - r.top) / r.height, 0, 1); on = true; kick();
      },
      pointerleave() { on = false; el._atRect = null; kick(); }
    });
  };
})(typeof self !== 'undefined' ? self : this);
