/* Pull cord: drag the knob down; the cord stretches with growing resistance. Past the threshold the knob rings
   and you can let go to fire onToggle; the cord then springs back with a small bounce. Releasing earlier only springs back.
   Click, Enter or Space give it a short tug and toggle too. Needs core.js; styles in cord.css (--rest sets the cord length).
   Markup: <div class="at-cord"><svg class="at-cord__line"><path/></svg><button class="at-cord__knob" type="button" aria-label="拉一下切换深浅色"></button></div>
   Atelier.cord(el, { threshold: 70, max: 150, onToggle(x, y), onState(s) }) */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  A.cord = function (el, o) {
    if (el._atCord) return el._atCord; // already set up (hot reload, React StrictMode): reuse it instead of binding twice
    o = Object.assign({ threshold: 70, max: 150 }, o);
    const path = el.querySelector('.at-cord__line path'), knob = el.querySelector('.at-cord__knob');
    let ox = 0, oy = 0, drag = null, armed = false, rest = A.num(el, '--rest', 96);
    const sx = A.spring({ k: 260, c: 9, precision: 0.05, onUpdate: v => { ox = v; draw(); } });
    const sy = A.spring({ k: 300, c: 14, precision: 0.05, onUpdate: v => { oy = v; draw(); }, onRest: () => emit('rest') });
    const emit = phase => { if (o.onState) o.onState({ phase, pull: Math.round(Math.max(0, oy)), threshold: o.threshold, armed }); };
    function draw() {
      const ax = el.clientWidth / 2, y = Math.max(-20, oy), kx = ax + ox, ky = rest + y;
      const cx = ax + ox * 0.3 - sx.velocity * 0.02, cy = ky * 0.55; // the cord bows against the swing, like a rope
      path.setAttribute('d', 'M' + ax + ' 0 Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + kx.toFixed(1) + ' ' + ky.toFixed(1));
      knob.style.transform = 'translate(' + ox.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      el.style.setProperty('--pull', A.clamp(Math.max(0, oy) / o.threshold, 0, 1).toFixed(3));
    }
    function setArmed(v) {
      if (v === armed) return;
      armed = v; el.classList.toggle('is-armed', v);
      if (v) A.haptic(10);
    }
    function toggle() {
      const r = knob.getBoundingClientRect();
      if (o.onToggle) o.onToggle(r.left + r.width / 2, r.top + r.height / 2);
    }
    function tug() { // a short dip for clicks and keys, then the same toggle
      sy.set(oy); sy.to(0, 900);
      setTimeout(toggle, 140);
      emit('tug');
    }
    knob.addEventListener('pointerdown', e => {
      if (e.button) return;
      e.preventDefault(); knob.setPointerCapture(e.pointerId);
      sx.stop(); sy.stop();
      drag = { x: e.clientX, y: e.clientY, ox, oy: Math.max(0, oy), moved: false };
      el.classList.add('is-dragging');
    });
    knob.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
      if (!drag.moved) return;
      const raw = Math.max(0, drag.oy + dy);
      sy.set(o.max * (1 - Math.exp(-raw / o.max))); // resistance grows as the cord stretches
      sx.set(A.clamp(drag.ox + dx * 0.25, -40, 40));
      setArmed(oy >= o.threshold);
      emit('drag');
    });
    function release() {
      if (!drag) return;
      const d = drag; drag = null;
      el.classList.remove('is-dragging');
      if (!d.moved) { tug(); return; }
      const fire = armed;
      setArmed(false);
      sx.to(0); sy.to(0);
      if (fire) toggle();
      emit(fire ? 'toggle' : 'release');
    }
    knob.addEventListener('pointerup', release);
    knob.addEventListener('pointercancel', release);
    knob.addEventListener('click', e => { if (e.detail === 0) tug(); }); // keyboard activation; pointer taps go through release()
    new ResizeObserver(() => { rest = A.num(el, '--rest', 96); draw(); }).observe(el);
    draw();
    return (el._atCord = { tug });
  };
})(typeof self !== 'undefined' ? self : this);
