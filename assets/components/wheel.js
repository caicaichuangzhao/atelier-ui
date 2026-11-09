/* Inertia wheel picker: drag or flick, it coasts and snaps to an item; items curve away like a drum.
   Wheel and arrow keys step one item. Needs core.js; styles in wheel.css.
   Markup: <div class="at-wheel" tabindex="0" aria-label="充值金额"><div class="at-wheel__lens"></div></div>
   Atelier.wheel(el, { values: ['¥10', '¥50', …], index: 2, onChange(i, v), onState(s) }) */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  A.wheel = function (el, o) {
    if (el._atWheel) return el._atWheel; // already set up (hot reload, React StrictMode): reuse it instead of binding twice
    const values = o.values, n = values.length, STEP = 18, ROW = A.num(el, '--wheel-row', 40);
    const R = ROW / Math.sin(STEP * Math.PI / 180); // drum radius so neighbours sit one row apart
    let pos = o.index || 0, index = Math.round(pos), drag = null, phase = 'rest', wheelAcc = 0, hush = false;
    const items = values.map(v => { const d = document.createElement('div'); d.className = 'at-wheel__item'; d.textContent = v; el.appendChild(d); return d; });
    el.setAttribute('role', 'spinbutton');
    el.setAttribute('aria-valuemin', 0); el.setAttribute('aria-valuemax', n - 1);
    const spring = A.spring({ from: pos, k: 170, c: 26, precision: 0.002, onUpdate: v => { pos = v; render(); }, onRest: () => { phase = 'rest'; emit(0); } });
    const emit = v => { if (o.onState) o.onState({ index, value: values[index], position: +pos.toFixed(2), velocity: Math.round(v || 0), phase }); };
    function render() {
      items.forEach((it, i) => {
        const a = (i - pos) * STEP;
        if (Math.abs(a) > 84) { it.style.visibility = 'hidden'; return; }
        it.style.visibility = '';
        it.style.transform = 'translateY(-50%) translateZ(' + -R + 'px) rotateX(' + -a + 'deg) translateZ(' + R + 'px)';
        it.style.opacity = Math.pow(Math.cos(a * Math.PI / 180), 1.6).toFixed(3);
      });
      const near = A.clamp(Math.round(pos), 0, n - 1);
      if (near !== index) {
        if (items[index]) items[index].classList.remove('is-on');
        index = near; A.haptic(3);
        if (o.onChange) o.onChange(index, values[index]);
      }
      items[index].classList.add('is-on');
      el.setAttribute('aria-valuenow', index); el.setAttribute('aria-valuetext', values[index]);
      if (phase !== 'rest' && !hush) emit((drag ? drag.v : spring.velocity) * ROW);
    }
    function go(i, vel) {
      phase = drag ? 'drag' : (vel ? 'coast' : 'snap');
      if (vel) emit(vel * ROW); // the coast starts at the release speed; the spring reports less from its first frame on
      hush = true; spring.set(pos); hush = false; // re-base the spring where the drag left pos, without reporting a stop
      spring.to(A.clamp(i, 0, n - 1), vel || 0);
    }
    el.addEventListener('pointerdown', e => {
      if (e.button) return;
      spring.stop(); el.setPointerCapture(e.pointerId); el.classList.add('is-dragging');
      drag = { y: e.clientY, p0: pos, t: performance.now(), v: 0, moved: false, ly: e.clientY };
      phase = 'drag';
    });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
      const now = performance.now(), dy = e.clientY - drag.y;
      if (Math.abs(dy) > 3) drag.moved = true;
      let p = drag.p0 - dy / ROW;
      if (p < 0) p = -Math.pow(-p, 0.7) * 0.6; else if (p > n - 1) p = n - 1 + Math.pow(p - (n - 1), 0.7) * 0.6; // rubber band at the ends
      const dt = Math.max(1, now - drag.t);
      drag.v = drag.v * 0.6 + (((drag.ly - e.clientY) / ROW) / (dt / 1000)) * 0.4; // items per second, smoothed
      drag.t = now; drag.ly = e.clientY;
      pos = p; render();
    });
    function end(e) {
      if (!drag) return;
      const d = drag; drag = null; el.classList.remove('is-dragging');
      if (!d.moved) { // a tap above or below the lens picks that neighbour
        if (e.type === 'pointercancel') return go(index);
        const r = el.getBoundingClientRect(), off = Math.round((e.clientY - (r.top + r.height / 2)) / ROW);
        return go(index + off);
      }
      const v = performance.now() - d.t > 80 ? 0 : d.v; // the finger stopped before lifting: no fling
      go(Math.round(pos + v * 0.22), v);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', e => {
      e.preventDefault();
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) < 40) return;
      go(index + Math.sign(wheelAcc)); wheelAcc = 0;
    }, { passive: false });
    el.addEventListener('keydown', e => {
      const k = e.key, t = k === 'ArrowUp' ? index + 1 : k === 'ArrowDown' ? index - 1 : k === 'PageUp' ? index + 3 : k === 'PageDown' ? index - 3 : k === 'Home' ? 0 : k === 'End' ? n - 1 : null;
      if (t === null) return;
      e.preventDefault(); go(t);
    });
    render();
    return (el._atWheel = { go, get index() { return index; }, get value() { return values[index]; } });
  };
})(typeof self !== 'undefined' ? self : this);
