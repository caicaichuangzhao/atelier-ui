/* Scroll-linked motion. Needs core.js; scrub also needs split.js. Styles in scroll.css.
   Every instance shares one scroll listener per scroller and one rAF: all boxes are read first, then all styles written.
   Atelier.progress(el, onUpdate(p), { root })   p goes 0 → 1 as el travels through the viewport (or through `root`,
     a scroll container): 0 when its top meets the bottom edge, 1 when its bottom leaves the top edge. Writes --p on el.
   Atelier.parallax(scope, { root, range: 40 })   children with data-depth="-1 … 1" drift up to ±range px (capped at 40)
     across the journey. Depth 0 stays put; keep it to 1–2 moving layers.
   Atelier.scrub(el, { root, by: 'char' | 'word', from: 0.18, start: 0.2, end: 0.6 })   the text lights up piece by
     piece while el moves from `start` to `end` of its journey, like reading along. Good for one statement, not body text.
   Each returns a destroy function. Reduced motion: parallax stays put, scrub shows the full text at once. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  const hubs = new Map(); // scroller → { items:Set, raf }

  function hub(scroller) {
    let h = hubs.get(scroller);
    if (h) return h;
    h = { items: new Set(), raf: 0 };
    const target = scroller === root ? root : scroller;
    h.kick = () => { if (!h.raf) h.raf = requestAnimationFrame(h.run); };
    h.run = () => {
      h.raf = 0;
      let top = 0, vh = innerHeight;
      if (scroller !== root) { const r = scroller.getBoundingClientRect(); top = r.top + scroller.clientTop; vh = scroller.clientHeight; }
      const reads = [];
      h.items.forEach(it => { const r = it.el.getBoundingClientRect(); reads.push([it, A.clamp((top + vh - r.top) / (vh + r.height), 0, 1)]); });
      reads.forEach(([it, p]) => { if (Math.abs(p - it.p) > 0.0005) { it.p = p; it.update(p); } });
    };
    target.addEventListener('scroll', h.kick, { passive: true });
    root.addEventListener('resize', h.kick);
    h.off = () => { target.removeEventListener('scroll', h.kick); root.removeEventListener('resize', h.kick); hubs.delete(scroller); };
    hubs.set(scroller, h);
    return h;
  }
  function track(el, update, scroller) {
    const h = hub(scroller || root), it = { el, update, p: -1 };
    h.items.add(it); h.kick();
    return () => { h.items.delete(it); if (!h.items.size) h.off(); };
  }

  A.progress = function (el, onUpdate, o) {
    o = o || {};
    return track(el, p => { el.style.setProperty('--p', p.toFixed(4)); if (onUpdate) onUpdate(p); }, o.root);
  };

  A.parallax = function (scope, o) {
    o = Object.assign({ range: 40 }, o);
    const range = Math.min(40, o.range), layers = Array.from(scope.querySelectorAll('[data-depth]'));
    if (A.reduce.matches) return () => {};
    return track(scope, p => {
      const s = (p - 0.5) * 2; // −1 at the bottom of the viewport, +1 at the top
      layers.forEach(l => { l.style.translate = '0 ' + (-s * parseFloat(l.dataset.depth || 0) * range).toFixed(2) + 'px'; });
      if (o.onUpdate) o.onUpdate(p);
    }, o.root);
  };

  A.scrub = function (el, o) {
    o = Object.assign({ by: 'word', from: 0.18, start: 0.2, end: 0.6 }, o);
    const sp = A.split(el, { by: o.by, when: 'manual', stagger: 0, cap: 0 });
    el.classList.add('at-scrub', 'is-in');
    if (A.reduce.matches) { el.classList.add('is-done'); return () => {}; }
    return track(el, p => {
      const pieces = sp.pieces, n = pieces.length, t = A.clamp((p - o.start) / (o.end - o.start), 0, 1) * n;
      pieces.forEach((pc, i) => {
        const v = (o.from + (1 - o.from) * A.clamp(t - i, 0, 1)).toFixed(3);
        if (pc._atO !== v) { pc._atO = v; pc.style.opacity = v; } // only the one or two pieces in transit change per frame
      });
      if (o.onUpdate) o.onUpdate(p, Math.min(n, Math.round(t)), n);
    }, o.root);
  };
})(typeof self !== 'undefined' ? self : this);
