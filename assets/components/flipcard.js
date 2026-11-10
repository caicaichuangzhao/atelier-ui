/* Flip card: a card with two faces. Click a [data-flip] button, press F, or drag it sideways; it turns 1:1 with the
   finger and, on release, finishes the turn if it went a third of the way or was thrown, otherwise falls back.
   Needs core.js; styles in flipcard.css.
   <div class="at-flipcard"><div class="at-flipcard__inner">
     <section class="at-flipcard__face is-front">… <button type="button" data-flip>看背面</button></section>
     <section class="at-flipcard__face is-back">… <button type="button" data-flip>翻回</button></section>
   </div></div>
   const f = Atelier.flipcard(el, { onState(s) {} });   f.flip(toBack?)   f.back (boolean)
   The hidden face is inert, so Tab never lands on something you cannot see. Reduced motion: the faces cross-fade. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  A.flipcard = function (el, o) {
    if (el._atFlip) return el._atFlip;
    o = o || {};
    const inner = el.querySelector('.at-flipcard__inner'), front = el.querySelector('.is-front'), back = el.querySelector('.is-back');
    let angle = 0, isBack = false, drag = null, swallow = false, lastDir = 1;
    const spring = A.spring({ el, from: 0, onUpdate: (v, vel) => { angle = v; render(); emit(drag ? 'drag' : 'settle', vel); }, onRest: () => emit('rest', 0) });
    function render() {
      inner.style.transform = 'rotateY(' + angle.toFixed(2) + 'deg)';
      const edge = Math.abs(Math.sin(angle * Math.PI / 180)); // 0 face-on, 1 edge-on
      el.style.setProperty('--flip-shade', (edge * 0.35).toFixed(3));
      el.style.setProperty('--flip-lift', edge.toFixed(3));
      const showBack = Math.cos(angle * Math.PI / 180) < 0;
      if (showBack !== el.classList.contains('is-showing-back')) el.classList.toggle('is-showing-back', showBack);
    }
    function emit(phase, vel) {
      if (o.onState) o.onState({ phase, angle: Math.round(angle), face: Math.cos(angle * Math.PI / 180) < 0 ? 'back' : 'front', velocity: Math.round(vel || 0) });
    }
    function settle(toBack, vel) {
      const had = el.contains(document.activeElement);
      isBack = toBack;
      front.inert = toBack; back.inert = !toBack;
      front.setAttribute('aria-hidden', String(toBack)); back.setAttribute('aria-hidden', String(!toBack));
      // nearest resting angle for that face; on a tie keep spinning the way the card last turned
      const want = toBack ? 180 : 0, k = Math.round((angle - want) / 360), dir = vel ? Math.sign(vel) : lastDir;
      let goal = want, bd = Infinity;
      [k - 1, k, k + 1].forEach(j => { const g = want + 360 * j, d = Math.abs(g - angle) - (Math.sign(g - angle) === dir ? 0.5 : 0); if (d < bd) { bd = d; goal = g; } });
      lastDir = Math.sign(goal - angle) || lastDir;
      el.classList.toggle('is-back', toBack);
      if (A.reduce.matches) { spring.set(goal); }
      else spring.to(goal, vel);
      if (had) { const btn = (toBack ? back : front).querySelector('[data-flip]'); if (btn) btn.focus({ preventScroll: true }); }
    }
    function flip(toBack) { settle(toBack == null ? !isBack : !!toBack, 0); }

    el.addEventListener('click', e => {
      const b = e.target.closest('[data-flip]');
      if (!b || swallow) return;
      flip();
    });
    el.addEventListener('keydown', e => { if ((e.key === 'f' || e.key === 'F') && !e.target.closest('input, textarea')) { e.preventDefault(); flip(); } });
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('input, textarea, select, a')) return;
      spring.stop();
      drag = { x0: e.clientX, a0: angle, w: el.getBoundingClientRect().width, moved: false, id: e.pointerId, s: [[performance.now(), angle]] };
    });
    el.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      if (!drag.moved) { if (Math.abs(dx) < 6) return; drag.moved = true; el.setPointerCapture(e.pointerId); el.classList.add('is-dragging'); }
      angle = drag.a0 + (dx / drag.w) * 180; // a full card width turns it over
      render();
      drag.s.push([performance.now(), angle]);
      while (drag.s.length > 2 && performance.now() - drag.s[0][0] > 100) drag.s.shift();
      emit('drag', 0);
    });
    function end() {
      if (!drag) return;
      const d = drag; drag = null;
      el.classList.remove('is-dragging');
      if (!d.moved) return;
      swallow = true; setTimeout(() => { swallow = false; }, 0);
      const a = d.s[0], b = d.s[d.s.length - 1], vel = (b[1] - a[1]) / Math.max(1, b[0] - a[0]) * 1000; // deg/s
      const turned = angle - d.a0, fast = Math.abs(vel) > 0.5 * 180 / d.w * 1000; // 0.5 px/ms in degrees
      const commit = Math.abs(turned) > 60 || (fast && Math.sign(vel) === Math.sign(turned));
      settle(commit ? !isBack : isBack, vel);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);

    front.inert = false; back.inert = true; back.setAttribute('aria-hidden', 'true');
    render();
    return (el._atFlip = { flip, get back() { return isBack; } });
  };
})(typeof self !== 'undefined' ? self : this);
