/* Glider and segmented control. Needs core.js; styles in segmented.css.
   Atelier.glider(box, el)    moves an indicator onto an item. It slides at constant size, duration grows with distance
                              (capped at 520 ms) and a second change mid-flight starts from where the indicator is.
   Atelier.segmented(root, { onChange(i, button), onState(s) })
     click, arrow keys, or drag the selected segment: it follows the finger and switches only after crossing the next segment's midpoint. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};

  A.glider = function (box, el, o) {
    o = Object.assign({ max: 520, base: 260, per: 0.3, easing: 'cubic-bezier(.25,.8,.25,1)' }, o);
    let cur = null, anim = null, stale = false;
    const boxOf = it => {
      const a = it.getBoundingClientRect(), b = box.getBoundingClientRect();
      return { x: a.left - b.left - box.clientLeft + box.scrollLeft, y: a.top - b.top - box.clientTop + box.scrollTop, w: a.width, h: a.height };
    };
    const frame = b => ({ transform: 'translate(' + b.x + 'px,' + b.y + 'px)', width: b.w + 'px', height: b.h + 'px' });
    function now() {
      const s = getComputedStyle(el), m = s.transform === 'none' ? { m41: 0, m42: 0 } : new DOMMatrixReadOnly(s.transform);
      return { x: m.m41, y: m.m42, w: parseFloat(s.width), h: parseFloat(s.height) };
    }
    function place(b) { if (anim) { anim.cancel(); anim = null; } Object.assign(el.style, frame(b)); el.classList.add('is-ready'); }
    function move(it, instant) {
      const to = boxOf(it);
      if (instant || !cur || A.reduce.matches || !el.animate) { cur = it; place(to); return 0; }
      const from = now(), dist = Math.hypot(to.x - from.x, to.y - from.y);
      cur = it;
      if (dist < 0.5 && Math.abs(to.w - from.w) < 0.5 && Math.abs(to.h - from.h) < 0.5) { place(to); return 0; }
      if (anim) anim.cancel();
      Object.assign(el.style, frame(to));
      const dur = Math.min(o.max, o.base + dist * o.per);
      anim = el.animate([frame(from), frame(to)], { duration: dur, easing: o.easing });
      anim.onfinish = () => { anim = null; if (stale) { stale = false; place(boxOf(cur)); } };
      return dur;
    }
    function follow(x, y) { // during a drag: put the indicator at (x, y) at its current size
      if (anim) { anim.cancel(); anim = null; }
      const b = now();
      el.style.transform = 'translate(' + x + 'px,' + (y == null ? b.y : y) + 'px)';
    }
    // a resize mid-slide (a label opening, a capsule growing) must not cut the slide short: fix up when it lands
    if ('ResizeObserver' in root) new ResizeObserver(() => { if (!cur) return; if (anim) stale = true; else place(boxOf(cur)); }).observe(box);
    return { move, follow, now, boxOf, get current() { return cur; } };
  };

  A.segmented = function (rootEl, o) {
    if (rootEl._atSegmented) return rootEl._atSegmented; // already set up (hot reload, React StrictMode): reuse it instead of binding twice
    o = o || {};
    const items = Array.from(rootEl.querySelectorAll(':scope > button'));
    const g = A.glider(rootEl, rootEl.querySelector(':scope > .at-seg__glider'));
    let cur = Math.max(0, items.findIndex(b => b.getAttribute('aria-checked') === 'true')), drag = null, swallow = false;
    const emit = s => { if (o.onState) o.onState(Object.assign({ index: cur }, s)); };
    function select(i, focus, quiet) {
      i = A.clamp(i, 0, items.length - 1);
      items.forEach((b, k) => { b.setAttribute('aria-checked', String(k === i)); b.tabIndex = k === i ? 0 : -1; b.classList.remove('is-over'); });
      if (focus) items[i].focus();
      const changed = i !== cur;
      cur = i;
      const dur = g.move(items[i]);
      if (changed && !quiet && o.onChange) o.onChange(i, items[i]);
      emit({ phase: 'settle', duration: Math.round(dur) });
    }
    items.forEach((b, k) => { b.setAttribute('role', 'radio'); b.tabIndex = k === cur ? 0 : -1; });
    rootEl.setAttribute('role', rootEl.getAttribute('role') || 'radiogroup');
    select(cur, false, true);

    rootEl.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || swallow) return;
      select(items.indexOf(b));
    });
    rootEl.addEventListener('keydown', e => {
      const k = e.key, n = k === 'ArrowRight' || k === 'ArrowDown' ? cur + 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? cur - 1 : k === 'Home' ? 0 : k === 'End' ? items.length - 1 : null;
      if (n === null) return;
      e.preventDefault();
      select((n + items.length) % items.length, true);
    });
    rootEl.addEventListener('pointerdown', e => {
      const b = e.target.closest('button');
      if (!b || items.indexOf(b) !== cur || e.button !== 0) return;
      const start = g.now();
      drag = { x0: e.clientX, gx: start.x, w: start.w, moved: false, over: cur, id: e.pointerId };
    });
    rootEl.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      if (!drag.moved) {
        if (Math.abs(dx) < 5) return;
        drag.moved = true; rootEl.setPointerCapture(e.pointerId); rootEl.classList.add('is-dragging');
      }
      const first = g.boxOf(items[0]), last = g.boxOf(items[items.length - 1]);
      const x = A.clamp(drag.gx + dx, first.x, last.x);
      g.follow(x);
      const center = x + drag.w / 2;
      let over = 0, best = Infinity;
      items.forEach((b, k) => { const bx = g.boxOf(b), d = Math.abs(bx.x + bx.w / 2 - center); if (d < best) { best = d; over = k; } });
      if (over !== drag.over) { drag.over = over; A.haptic(4); items.forEach((b, k) => b.classList.toggle('is-over', k === over && k !== cur)); }
      emit({ phase: 'drag', offset: Math.round(dx), over, threshold: Math.round(drag.w / 2) });
    });
    function end() {
      if (!drag) return;
      const d = drag; drag = null;
      rootEl.classList.remove('is-dragging');
      if (!d.moved) return;
      swallow = true; setTimeout(() => { swallow = false; }, 0); // the click after a drag is not a tap
      select(d.over);
    }
    rootEl.addEventListener('pointerup', end);
    rootEl.addEventListener('pointercancel', end);
    return (rootEl._atSegmented = { select, get index() { return cur; }, items });
  };
})(typeof self !== 'undefined' ? self : this);
