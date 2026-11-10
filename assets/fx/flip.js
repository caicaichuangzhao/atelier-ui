/* Layout motion with FLIP (First, Last, Invert, Play). Needs core.js. No CSS file needed.
   Atelier.flip(container, mutate, { items: ':scope > *', scale: true, stagger: 18, onDone })
     Records every child's box, runs mutate() (sort, filter, add, remove), then moves each child from its old box to
     its new one. Hide items with the `hidden` attribute: they fade out where they stood while the rest close the gap;
     newly shown or added items fade in. Call it again mid-flight and everything continues from where it is on screen.
     scale: false only translates (use it when items change height and their text must not stretch).
     Returns a Promise that resolves when the motion ends.
   Atelier.morph(from, to, { reverse: false })
     Shared element: `to` (already visible, e.g. a detail panel) grows out of `from`'s box; with reverse it shrinks
     back into it. Children of `to` marked [data-morph-fade] fade in after the box has mostly opened.
     The caller shows and hides the elements; morph only animates. Returns a Promise.
   Timing comes from the theme: --d-move and --e-move on the container, so every positioning keeps its own feel.
   Reduced motion: mutate() runs and the layout simply changes. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  const okEase = e => e && root.CSS && CSS.supports('transition-timing-function', e);
  function timing(el, o) {
    const e = A.css(el, '--e-move', ''), d = parseFloat(A.css(el, '--d-move', '')) || 480;
    return { duration: o.duration || d, easing: o.easing || (okEase(e) ? e : 'cubic-bezier(.2,.8,.2,1)') };
  }

  A.flip = function (container, mutate, o) {
    o = Object.assign({ items: ':scope > *', scale: true, stagger: 18 }, o);
    if (A.reduce.matches || !container.animate) { mutate(); return Promise.resolve(); }
    const kids = () => Array.from(container.querySelectorAll(o.items));
    const cBox = container.getBoundingClientRect();
    // First: where everything is on screen right now, mid-animation included
    const first = new Map();
    kids().forEach(el => {
      if (el._atFlipOut) { el._atFlipOut(); return; } // an item still fading out from the last call: finish it now
      if (el.hidden || !el.getClientRects().length) return;
      first.set(el, el.getBoundingClientRect());
    });
    kids().forEach(el => { (el._atFlipAnims || []).forEach(a => a.cancel()); el._atFlipAnims = null; });
    mutate();
    const t = timing(container, o), all = [];
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    let entered = 0, moved = 0, exited = 0;
    kids().forEach(el => {
      const was = first.get(el), shown = !el.hidden && el.getClientRects().length;
      if (was && shown) { // Last, Invert, Play
        const now = el.getBoundingClientRect(), dx = was.left - now.left, dy = was.top - now.top;
        const sx = o.scale && now.width ? was.width / now.width : 1, sy = o.scale && now.height ? was.height / now.height : 1;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
        moved++;
        el.style.transformOrigin = '0 0';
        const a = el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' }, { transform: 'none' }], t);
        el._atFlipAnims = [a]; all.push(a.finished.then(() => { el.style.transformOrigin = ''; }, () => {}));
      } else if (!was && shown) { // entering: fade and settle in, a little after the others start moving
        const a = el.animate([{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }],
          { duration: t.duration * 0.8, easing: t.easing, delay: Math.min(entered++ * o.stagger, 160) + 60, fill: 'backwards' });
        el._atFlipAnims = [a]; all.push(a.finished.catch(() => {}));
      } else if (was && !shown && el.hidden) { // leaving: put it back where it stood, out of flow, and fade it there
        exited++;
        el.hidden = false;
        Object.assign(el.style, { position: 'absolute', margin: '0', pointerEvents: 'none', zIndex: '0',
          left: (was.left - cBox.left - container.clientLeft + container.scrollLeft) + 'px', top: (was.top - cBox.top - container.clientTop + container.scrollTop) + 'px',
          width: was.width + 'px', height: was.height + 'px' });
        const done = () => { el._atFlipOut = null; el.hidden = true; ['position', 'margin', 'pointerEvents', 'zIndex', 'left', 'top', 'width', 'height'].forEach(k => { el.style[k] = ''; }); };
        const a = el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.92)' }], { duration: t.duration * 0.5, easing: 'cubic-bezier(.55,0,1,.45)' });
        el._atFlipOut = () => { a.cancel(); done(); };
        all.push(a.finished.then(done, () => {}));
      }
    });
    const result = { moved, entered, exited, duration: Math.round(t.duration) };
    return Promise.all(all).then(() => { if (o.onDone) o.onDone(result); return result; });
  };

  A.morph = function (from, to, o) {
    o = o || {};
    if (A.reduce.matches || !to.animate) return Promise.resolve();
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), t = timing(to, o);
    const inv = 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px) scale(' + a.width / b.width + ',' + a.height / b.height + ')';
    const rFrom = getComputedStyle(from).borderRadius, rTo = getComputedStyle(to).borderRadius;
    (to._atMorph || []).forEach(x => x.cancel());
    to.style.transformOrigin = '0 0';
    const frames = [{ transform: inv, borderRadius: rFrom }, { transform: 'none', borderRadius: rTo }];
    const box = to.animate(o.reverse ? frames.slice().reverse() : frames, { duration: o.reverse ? t.duration * 0.75 : t.duration, easing: t.easing, fill: 'both' });
    const fades = Array.from(to.querySelectorAll('[data-morph-fade]')).map((el, i) => el.animate(
      o.reverse ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
      o.reverse ? { duration: 120, fill: 'both' } : { duration: 320, delay: t.duration * 0.35 + i * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }));
    to._atMorph = [box].concat(fades);
    return box.finished.then(() => { to._atMorph.forEach(x => x.cancel()); to._atMorph = null; to.style.transformOrigin = ''; }, () => {});
  };
})(typeof self !== 'undefined' ? self : this);
