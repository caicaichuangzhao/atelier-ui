/* Helper for the CSS loops in light.css (beam, aurora) and any other infinite CSS animation. Needs core.js.
   Atelier.pauseOffscreen(elsOrSelector, { margin: '80px' })  sets data-paused while an element is out of view,
     so a looping animation costs nothing when nobody can see it. Returns a destroy function. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  A.pauseOffscreen = function (els, o) {
    o = o || {};
    const list = typeof els === 'string' ? document.querySelectorAll(els) : els.length != null ? els : [els];
    if (!('IntersectionObserver' in root)) return () => {};
    const io = new IntersectionObserver(es => es.forEach(e => e.target.toggleAttribute('data-paused', !e.isIntersecting)), { rootMargin: o.margin || '80px' });
    Array.from(list).forEach(el => io.observe(el));
    return () => io.disconnect();
  };
})(typeof self !== 'undefined' ? self : this);
