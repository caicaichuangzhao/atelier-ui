/* Proximity scrollbar. Native scrolling stays intact (wheel, touch, keyboard, screen readers);
   the visible thumb is a thin overlay that shows while scrolling and grows as the pointer nears the edge.
   Atelier.scrollbar(wrapperEl)              for <div class="at-scroll"><div class="at-scroll__view">...</div></div>
   Atelier.scrollbar(document.documentElement) for the whole page. Touch devices keep their own overlay bars. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const all = new Set();
  let px = -1, py = -1, queued = 0;

  // One shared pointer listener: read every rect first, then write, so instances never thrash layout.
  function flush() {
    queued = 0;
    const reads = [];
    all.forEach(s => reads.push([s, s.rect()]));
    reads.forEach(([s, r]) => s.near(r));
  }
  function queue() { if (!queued) queued = requestAnimationFrame(flush); }
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { px = e.clientX; py = e.clientY; queue(); } }, { passive: true });
  addEventListener('mouseout', e => { if (!e.relatedTarget) { px = py = -1; queue(); } });
  const smooth = t => t * t * (3 - 2 * t);

  A.scrollbar = function (host, opts) {
    opts = opts || {};
    if (host._atScrollbar) return host._atScrollbar;
    const page = host === document.documentElement;
    const view = page ? (document.scrollingElement || host) : host.querySelector(':scope > .at-scroll__view');
    if (!view || (!fine.matches && !opts.force)) return { update() {}, destroy() {} };
    const reach = () => parseFloat(getComputedStyle(host).getPropertyValue('--sb-reach')) || 56;
    const bar = document.createElement('div');
    bar.className = 'at-scrollbar' + (page ? ' at-scrollbar--page' : '');
    bar.setAttribute('aria-hidden', 'true');
    const thumb = document.createElement('div');
    thumb.className = 'at-scrollbar__thumb';
    bar.appendChild(thumb);
    (page ? document.body : host).appendChild(bar);
    host.classList.add('at-sb-on');

    let track = 0, size = 0, max = 0, near = 0, drag = null, hideT = 0, raf = 0, R = reach();
    function measure() {
      const vh = view.clientHeight, sh = view.scrollHeight;
      max = sh - vh;
      bar.hidden = max < 2;
      if (bar.hidden) return;
      track = bar.clientHeight;
      size = Math.max(28, (track * vh) / sh);
      thumb.style.height = size + 'px';
      R = reach();
      sync();
    }
    function sync() {
      if (bar.hidden) return;
      const y = (Math.min(max, Math.max(0, view.scrollTop)) / max) * (track - size);
      thumb.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
    }
    const scroller = page ? window : view;
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; sync(); });
      host.classList.add('is-sb-scrolling');
      clearTimeout(hideT);
      hideT = setTimeout(() => host.classList.remove('is-sb-scrolling'), 900);
    }
    scroller.addEventListener('scroll', onScroll, { passive: true });

    const inst = {
      rect() { return page || bar.hidden ? null : host.getBoundingClientRect(); },
      near(r) {
        let n = 0;
        if (px >= 0 && !bar.hidden) {
          const inside = page || (py >= r.top && py <= r.bottom && px >= r.left && px <= r.right + 4);
          const dx = (page ? innerWidth : r.right) - px;
          if (inside && dx < R) n = smooth(1 - Math.max(0, dx) / R);
        }
        if (drag) n = 1;
        n = Math.round(n * 50) / 50;
        if (n === near) return;
        near = n;
        host.style.setProperty('--sb-near', n);
        host.classList.toggle('is-sb-near', n > 0);
      }
    };
    all.add(inst);

    thumb.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      thumb.setPointerCapture(e.pointerId);
      view.style.scrollBehavior = 'auto'; // a smooth-scrolling root would make the drag lag behind the pointer
      drag = { y: e.clientY, top: view.scrollTop };
      host.classList.add('is-sb-drag');
      queue();
    });
    thumb.addEventListener('pointermove', e => {
      if (drag) view.scrollTop = drag.top + (e.clientY - drag.y) * (max / Math.max(1, track - size));
    });
    function end() {
      if (!drag) return;
      drag = null;
      view.style.scrollBehavior = '';
      host.classList.remove('is-sb-drag');
      queue();
    }
    thumb.addEventListener('pointerup', end);
    thumb.addEventListener('pointercancel', end);
    thumb.addEventListener('lostpointercapture', end);
    // clicking the rail jumps there, centering the thumb on the pointer
    bar.addEventListener('pointerdown', e => {
      if (e.target !== bar) return;
      const top = ((e.clientY - bar.getBoundingClientRect().top - size / 2) / Math.max(1, track - size)) * max;
      view.scrollTo({ top, behavior: reduce.matches ? 'auto' : 'smooth' });
    });

    const ro = new ResizeObserver(measure);
    ro.observe(page ? document.body : view);
    if (!page && view.firstElementChild) ro.observe(view.firstElementChild);
    if (page) addEventListener('resize', measure);
    measure();

    host._atScrollbar = {
      update: measure,
      destroy() {
        all.delete(inst); ro.disconnect();
        scroller.removeEventListener('scroll', onScroll);
        if (page) removeEventListener('resize', measure);
        bar.remove();
        host.classList.remove('at-sb-on', 'is-sb-near', 'is-sb-scrolling', 'is-sb-drag');
        host.style.removeProperty('--sb-near');
        delete host._atScrollbar;
      }
    };
    return host._atScrollbar;
  };
  A.scrollbar.all = function (selector) {
    return Array.from(document.querySelectorAll(selector || '.at-scroll')).map(el => A.scrollbar(el));
  };
})(typeof self !== 'undefined' ? self : this);
