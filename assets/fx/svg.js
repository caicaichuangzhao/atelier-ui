/* SVG motion helpers. Needs core.js; the draw styles live in svg.css.
   Atelier.svgPlay(container, { margin: '80px' })
     Pauses every animation inside while it is off screen: CSS animations (via .is-paused) and SMIL
     (<animate>, <animateMotion> … via svg.pauseAnimations()). With reduced motion SMIL is parked on its last frame
     (data-still="<seconds>" on the <svg> picks another frame) and CSS animations are left to the page's own
     prefers-reduced-motion rules. Returns a destroy function.
   Atelier.drawPaths(svg, { stagger: 120, duration: 700, order: 'dom' | 'left' | 'top', easing })
     Draws every [data-draw] path, line, polyline, circle … one after another (pathLength is set to 1 for you).
     data-draw-delay / data-draw-dur on an element override its timing. Resolves when the last stroke lands.
     .undraw(svg) erases them again. Reduced motion: shown at once.
   Atelier.pathMotion(el, path, { duration: 2400, rotate: true, loop: false, easing: t => t, onUpdate(p) })
     Moves any element (SVG or HTML positioned over the SVG) along an SVG path with getPointAtLength, turning with the
     path's direction when rotate is on. Returns { play(), pause(), seek(p), reverse(), get progress } — p is 0…1.
   Atelier.svgPoint(svg, event) → { x, y } in the SVG's own coordinates (viewBox units), for drags and hot spots. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  const SMIL = 'animate, animateTransform, animateMotion, set';

  A.svgPlay = function (box, o) {
    o = Object.assign({ margin: '80px' }, o);
    const svgs = () => Array.from(box.matches('svg') ? [box] : box.querySelectorAll('svg')).filter(s => s.pauseAnimations && s.querySelector(SMIL));
    const still = () => svgs().forEach(s => { s.pauseAnimations(); s.setCurrentTime(parseFloat(s.dataset.still) || longest(s)); });
    if (A.reduce.matches) { box.classList.add('is-still'); still(); return () => {}; }
    let inView = true, on = true;
    const set = () => { // plays only while it is on screen and the tab is visible; each state is tracked on its own
      const v = inView && !document.hidden;
      if (v === on) return;
      on = v;
      box.classList.toggle('is-paused', !v);
      svgs().forEach(s => (v ? s.unpauseAnimations() : s.pauseAnimations()));
    };
    if (!('IntersectionObserver' in root)) return () => {};
    const io = new IntersectionObserver(es => { inView = es[es.length - 1].isIntersecting; set(); }, { rootMargin: o.margin });
    io.observe(box);
    document.addEventListener('visibilitychange', set);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', set); inView = true; on = false; box.classList.remove('is-paused'); svgs().forEach(s => s.unpauseAnimations()); };
  };
  function longest(svg) { // the end of the longest single cycle, so a parked SMIL scene shows its finished state
    let t = 0;
    svg.querySelectorAll(SMIL).forEach(a => {
      const d = parseFloat(a.getAttribute('dur')) || 0, b = parseFloat(a.getAttribute('begin')) || 0, kt = (a.getAttribute('keyTimes') || '').split(';').map(Number);
      // a loop that fades out at the end looks best around its hold: aim for the last keyTime below 0.9
      const hold = kt.length > 2 ? kt.filter(k => k <= 0.88).pop() || 0.5 : 0.999;
      t = Math.max(t, b + d * hold);
    });
    return t || 0;
  }

  A.drawPaths = function (svg, o) {
    o = Object.assign({ stagger: 120, duration: 700, order: 'dom', easing: 'cubic-bezier(.65,0,.35,1)' }, o);
    let els = Array.from(svg.querySelectorAll('[data-draw]'));
    if (o.order !== 'dom') {
      const key = e => { const b = e.getBBox(); return o.order === 'left' ? b.x : b.y; };
      els = els.map(e => [key(e), e]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
    }
    els.forEach(e => { e.setAttribute('pathLength', '1'); e.classList.add('at-draw-path'); });
    if (A.reduce.matches || !svg.animate) { els.forEach(e => { e.style.strokeDashoffset = '0'; }); return Promise.resolve(); }
    const runs = els.map((e, i) => {
      const delay = e.dataset.drawDelay != null ? +e.dataset.drawDelay : i * o.stagger, dur = e.dataset.drawDur != null ? +e.dataset.drawDur : o.duration;
      e.style.strokeDashoffset = '1';
      const a = e.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: dur, delay, easing: o.easing, fill: 'forwards' });
      return a.finished.then(() => { e.style.strokeDashoffset = '0'; a.cancel(); }, () => {});
    });
    return Promise.all(runs);
  };
  A.drawPaths.undraw = function (svg) {
    svg.querySelectorAll('[data-draw]').forEach(e => { e.getAnimations().forEach(a => a.cancel()); e.style.strokeDashoffset = '1'; });
  };

  A.pathMotion = function (el, path, o) {
    o = Object.assign({ duration: 2400, rotate: true, loop: false, easing: t => t }, o);
    const len = path.getTotalLength(), ctm = () => (el instanceof SVGElement ? null : path.getScreenCTM());
    let p = 0, dir = 1, playing = false, last = 0, raf = 0;
    function place() {
      const t = o.easing(A.clamp(p, 0, 1)), at = path.getPointAtLength(t * len), ahead = path.getPointAtLength(Math.min(len, t * len + 1)), back = path.getPointAtLength(Math.max(0, t * len - 1));
      const ang = Math.atan2(ahead.y - back.y, ahead.x - back.x) * 180 / Math.PI;
      const m = ctm();
      if (m) { // HTML element over the SVG: convert to page pixels relative to the element's offset parent
        const pt = new DOMPoint(at.x, at.y).matrixTransform(m), host = (el.offsetParent || document.body).getBoundingClientRect();
        el.style.transform = 'translate(' + (pt.x - host.left).toFixed(1) + 'px,' + (pt.y - host.top).toFixed(1) + 'px) translate(-50%,-50%)' + (o.rotate ? ' rotate(' + ang.toFixed(1) + 'deg)' : '');
      } else el.setAttribute('transform', 'translate(' + at.x.toFixed(2) + ' ' + at.y.toFixed(2) + ')' + (o.rotate ? ' rotate(' + ang.toFixed(1) + ')' : ''));
      if (o.onUpdate) o.onUpdate(p);
    }
    function tick(now) {
      raf = 0;
      if (!playing) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      p += (dir * dt * 1000) / o.duration;
      if (dir > 0 ? p >= 1 : p <= 0) { // only the end it is heading for counts: p starts at 0 when playing forward
        if (o.loop) p = dir > 0 ? p - 1 : p + 1;
        else { p = A.clamp(p, 0, 1); playing = false; }
      }
      place();
      if (playing) raf = requestAnimationFrame(tick);
    }
    place();
    const api = {
      play() { if (A.reduce.matches) { p = dir > 0 ? 1 : 0; place(); return api; } if (!playing) { playing = true; last = 0; if (p >= 1 && dir > 0) p = 0; if (p <= 0 && dir < 0) p = 1; raf = requestAnimationFrame(tick); } return api; },
      pause() { playing = false; cancelAnimationFrame(raf); raf = 0; return api; },
      seek(v) { p = A.clamp(v, 0, 1); place(); return api; },
      reverse() { dir = -dir; return api; },
      get progress() { return p; }, get playing() { return playing; }
    };
    return api;
  };

  A.svgPoint = function (svg, e) {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };
})(typeof self !== 'undefined' ? self : this);
