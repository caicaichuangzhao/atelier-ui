/* Hold to confirm: press and hold; a ring fills around the button while it sinks, the stamp waits above the paper.
   Letting go early winds the ring back with a "cancelled" note. A full hold drops the stamp. Space or Enter work the same way.
   Needs core.js; styles in hold.css.
   Markup: <button class="at-hold" type="button"><svg class="at-hold__ring" viewBox="0 0 48 48"><circle class="at-hold__track" cx="24" cy="24" r="21"/>
     <circle class="at-hold__fill" cx="24" cy="24" r="21"/></svg><span class="at-hold__label">按住</span></button>
   Atelier.hold(btn, { duration: 900, scope: paperEl, onProgress(p), onComplete(), onCancel(p) })
   `scope` receives --hold (0..1) and .is-stamped, so a seal on the paper can follow the press. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  A.hold = function (btn, o) {
    if (btn._atHold) return btn._atHold; // already set up (hot reload, React StrictMode): reuse it instead of binding twice
    o = Object.assign({ duration: 900 }, o);
    const fill = btn.querySelector('.at-hold__fill'), C = 2 * Math.PI * 21;
    let p = 0, raf = 0, holding = false, done = false, last = 0;
    fill.style.strokeDasharray = C; fill.style.strokeDashoffset = C;
    btn.setAttribute('aria-description', '按住约 ' + (o.duration / 1000).toFixed(1) + ' 秒确认，提前松开会取消');
    function paint() {
      fill.style.strokeDashoffset = C * (1 - p);
      btn.style.setProperty('--hold', p.toFixed(3));
      if (o.scope) o.scope.style.setProperty('--hold', p.toFixed(3)); // e.g. the paper, so a waiting seal can follow the press
      if (o.onProgress) o.onProgress(p, holding);
    }
    function tick(now) {
      const dt = last ? now - last : 16; last = now;
      if (holding) p = Math.min(1, p + dt / o.duration);
      else p = Math.max(0, p - dt / 260); // winds back faster than it filled
      paint();
      if (holding && p >= 1) { finish(); return; }
      raf = (holding || p > 0) ? requestAnimationFrame(tick) : 0;
    }
    function start() {
      if (done || holding) return;
      holding = true; last = 0; btn.classList.add('is-holding'); A.haptic(6);
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function release() {
      if (!holding) return;
      holding = false; btn.classList.remove('is-holding');
      if (p > 0.04 && p < 1 && o.onCancel) o.onCancel(p);
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function finish() {
      holding = false; done = true; raf = 0; p = 1; paint();
      btn.classList.remove('is-holding'); btn.classList.add('is-done');
      if (o.scope) o.scope.classList.add('is-stamped');
      A.haptic([14, 30, 20]);
      if (o.onComplete) o.onComplete();
    }
    btn.addEventListener('pointerdown', e => { if (e.button) return; e.preventDefault(); btn.setPointerCapture(e.pointerId); btn.focus({ preventScroll: true }); start(); });
    btn.addEventListener('pointermove', e => { // sliding the finger away cancels, the same as letting go
      if (!holding) return;
      const r = btn.getBoundingClientRect();
      if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) > r.width * 1.1) release();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach(n => btn.addEventListener(n, release));
    btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
    btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') release(); });
    btn.addEventListener('contextmenu', e => e.preventDefault());
    return (btn._atHold = {
      reset() { cancelAnimationFrame(raf); raf = 0; holding = false; done = false; p = 0; paint(); btn.classList.remove('is-done', 'is-holding'); if (o.scope) o.scope.classList.remove('is-stamped'); },
      get progress() { return p; }
    });
  };
})(typeof self !== 'undefined' ? self : this);
