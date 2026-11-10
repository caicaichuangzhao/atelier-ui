/* Press ripple: a circle of the element's own text color spreads from the exact press point, stays while the finger
   is down and fades after release. Needs core.js; styles in ripple.css.
   Atelier.ripple(scope = document, selector = '[data-ripple]', { onPress(info), onRelease({ held }) })   one delegated listener per scope.
   Keyboard: Enter or Space ripples from the center. It is feedback, not decoration, so it does not count toward the
   effect budget. Reduced motion: no spreading, a quick tint instead. Returns a destroy function. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  A.ripple = function (scope, selector, o) {
    scope = scope || document; selector = selector || '[data-ripple]'; o = o || {};
    if (scope._atRipple) return scope._atRipple;
    function spawn(host, x, y, kind) {
      const r = host.getBoundingClientRect(), lx = x - r.left, ly = y - r.top;
      const rad = Math.hypot(Math.max(lx, r.width - lx), Math.max(ly, r.height - ly)); // reach the farthest corner
      const dot = document.createElement('span');
      dot.className = 'at-ripple'; dot.setAttribute('aria-hidden', 'true');
      dot.style.cssText = 'left:' + (lx - rad) + 'px;top:' + (ly - rad) + 'px;width:' + rad * 2 + 'px;height:' + rad * 2 + 'px';
      host.appendChild(dot);
      const born = performance.now(), still = A.reduce.matches || !dot.animate;
      const grow = still ? null : dot.animate([{ transform: 'scale(0.06)' }, { transform: 'scale(1)' }], { duration: Math.min(560, 260 + rad * 1.2), easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'forwards' });
      if (o.onPress) o.onPress({ x: Math.round(lx), y: Math.round(ly), radius: Math.round(rad), kind });
      let gone = false;
      return function release() {
        if (gone) return; gone = true;
        const held = performance.now() - born, wait = still ? 0 : Math.max(0, 140 - held); // a quick tap still shows the circle
        setTimeout(() => {
          if (!dot.animate) { dot.remove(); return; }
          dot.animate([{ opacity: getComputedStyle(dot).opacity }, { opacity: 0 }], { duration: still ? 160 : 320, easing: 'ease-out', fill: 'forwards' })
            .onfinish = () => { if (grow) grow.cancel(); dot.remove(); };
        }, wait);
        return held;
      };
    }
    const live = new Map();
    const on = {
      pointerdown(e) {
        const host = e.button === 0 && e.target.closest(selector);
        if (!host || host.disabled || host.getAttribute('aria-disabled') === 'true') return;
        live.set(e.pointerId, spawn(host, e.clientX, e.clientY, e.pointerType));
      },
      keydown(e) {
        if (e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return;
        const host = e.target.closest && e.target.closest(selector);
        if (!host || host !== e.target) return;
        const r = host.getBoundingClientRect(), rel = spawn(host, r.left + r.width / 2, r.top + r.height / 2, 'key');
        const up = () => { rel(); host.removeEventListener('keyup', up); host.removeEventListener('blur', up); };
        host.addEventListener('keyup', up); host.addEventListener('blur', up);
      }
    };
    const end = e => { const rel = live.get(e.pointerId); if (rel) { live.delete(e.pointerId); const held = rel(); if (o.onRelease) o.onRelease({ held: Math.round(held || 0) }); } };
    ['pointerup', 'pointercancel'].forEach(k => { on[k] = end; });
    on.dragstart = () => live.forEach((rel, id) => end({ pointerId: id }));
    for (const k in on) scope.addEventListener(k, on[k], true);
    return (scope._atRipple = () => { for (const k in on) scope.removeEventListener(k, on[k], true); scope._atRipple = null; });
  };
})(typeof self !== 'undefined' ? self : this);
