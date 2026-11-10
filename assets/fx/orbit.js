/* Orbit: cards arranged on a sphere, ring or helix that you drag to spin. It drifts on its own and a throw keeps it
   spinning while it slows. Picking a card brings it to the front and enlarges it while the camera moves into the
   sphere and the other cards spread out and dim. Pure CSS 3D (one transform per card per frame), no WebGL.
   Needs core.js; styles in orbit.css.
   <div class="at-orbit" tabindex="0" role="group" aria-label="…"><div class="at-orbit__world">
     <button class="at-orbit__card" type="button" tabindex="-1" aria-label="…">…</button> …
   </div></div>
   const orb = Atelier.orbit(el, { shape: 'sphere' | 'ring' | 'helix', radius: 0.42, drift: 6, tilt: -12, onPick(card, i), onRelease(), onState(s) });
   orb.pick(i) · orb.release() · orb.focus(i) turns card i to the front · orb.setShape(name) re-arranges with an ease ·
   orb.spin(dx, dy) adds a throw in deg/s · orb.destroy()
   radius is a fraction of the stage's shorter side; card size follows the shape and the card count (--orbit-card).
   Many small cards read as a sphere, a few big ones as a loose ring: aim for about one card per 6000 px² of stage.
   Keyboard on the stage: arrows spin, Enter / Space picks the card at the front, Esc puts it back.
   Touch: a horizontal drag spins; a vertical one scrolls the page. Reduced motion: no drift and no inertia, turns,
   lifts and the camera move jump to their end, picking still works. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  const TAU = Math.PI * 2, RAD = Math.PI / 180;

  // Point i of n on a unit sphere (golden-angle spiral), ring or helix, as [x, y, z]; y points down like CSS.
  function layout(shape, i, n) {
    if (shape === 'ring') { // up to 14 cards per ring; more cards stack into rows, like a drum
      const rows = Math.ceil(n / 14), per = Math.ceil(n / rows), row = Math.floor(i / per), k = i % per, a = (k / per) * TAU + row * 0.4;
      return [Math.sin(a), rows > 1 ? (row / (rows - 1) - 0.5) * 0.46 * (rows - 1) : 0, Math.cos(a)];
    }
    if (shape === 'helix') {
      const turns = helixTurns(n), a = (i / n) * TAU * turns, h = 1.7, r = 0.78; // narrower than the sphere, so the climb reads
      return [Math.sin(a) * r, (i / Math.max(1, n - 1)) * h - h / 2, Math.cos(a) * r];
    }
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996323; // golden angle spreads them evenly
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  }
  const helixTurns = n => Math.max(2, Math.round(n / 8));
  // Card width so the cards cover the shape without overlapping much (card height = width × 0.75).
  function cardSize(shape, n, R) {
    if (shape === 'ring') { const rows = Math.ceil(n / 14), per = Math.ceil(n / rows); return Math.min(R * (TAU / per) * 0.86, rows > 1 ? (R * 0.46 / 0.75) * 0.92 : R); }
    if (shape === 'helix') { const t = helixTurns(n); return Math.min(R * 0.78 * (TAU / (n / t)) * 0.86, ((R * 1.7) / t / 0.75) * 0.82); }
    return R * Math.sqrt((4 * Math.PI * 0.6) / (n * 0.75)); // about 60% of the sphere's surface
  }

  A.orbit = function (el, o) {
    if (el._atOrbit) return el._atOrbit;
    o = Object.assign({ shape: 'sphere', radius: 0.42, drift: 6, tilt: -12 }, o);
    const cards = Array.from(el.querySelectorAll('.at-orbit__world > .at-orbit__card'));
    const n = cards.length, lift = new Float32Array(n), pos = cards.map(() => [0, 0, 1]);
    const hx = new Float32Array(n), hy = new Float32Array(n), hz = new Float32Array(n), hf = new Float32Array(n), hr = new Float32Array(n); // projection of each card, for hit tests
    let hov = -1, ptr = null;
    let rx = o.tilt, ry = 0, vx = 0, vy = 0, R = 200, P = 1100, cardW = 100, pickS = 2.4, zoom = 0, turn = null, drag = null;
    let statT = 0, picked = -1, front = -1, phase = 'drift', said = '';
    let from = cards.map((_, i) => layout(o.shape, i, n)), to = from, mix = 1;

    function measure() {
      const r = el.getBoundingClientRect();
      R = Math.max(40, Math.min(r.width, r.height) * o.radius);
      P = parseFloat(getComputedStyle(el).perspective) || 1100;
      cardW = A.clamp(cardSize(o.shape, n, R), 36, R * 0.9);
      el.style.setProperty('--orbit-card', cardW.toFixed(1) + 'px');
      // the picked card should fill about 70% of the stage: undo the perspective boost, then scale the rest
      const zf = Math.min(P * 0.6, R * 1.9), boost = P / (P - zf);
      pickS = A.clamp(Math.min(r.width * 0.7, (r.height * 0.7) / 0.75) / (cardW * boost), 1.4, 4.5);
    }
    const emit = () => { if (o.onState) o.onState({ phase, rx: Math.round(rx), ry: Math.round(((ry % 360) + 360) % 360), speed: Math.round(Math.hypot(vx, vy + (picked < 0 && !A.reduce.matches ? o.drift : 0))), picked, front, shape: o.shape, zoom: +zoom.toFixed(2) }); };

    function paint() {
      const cy = Math.cos(ry * RAD), sy = Math.sin(ry * RAD), cx = Math.cos(rx * RAD), sx = Math.sin(rx * RAD);
      const Re = R * (1 + zoom * 0.85), zf = Math.min(P * 0.6, R * 1.9), t = mix < 1 ? mix * mix * (3 - 2 * mix) : 1;
      let best = -2, bi = -1;
      for (let i = 0; i < n; i++) {
        const a = from[i], b = to[i], p = pos[i], L = lift[i];
        p[0] = a[0] + (b[0] - a[0]) * t; p[1] = a[1] + (b[1] - a[1]) * t; p[2] = a[2] + (b[2] - a[2]) * t;
        // world rotation: ry around Y, then rx around X
        const x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy, y2 = p[1] * cx - z1 * sx, z2 = p[1] * sx + z1 * cx;
        const len = Math.hypot(x1, y2, z2) || 1;
        // each card faces outward from the center; a lifted card straightens up, moves to the middle and comes forward
        const yaw = (Math.atan2(x1, z2) / RAD) * (1 - L), pitch = (-Math.asin(A.clamp(y2 / len, -1, 1)) / RAD) * (1 - L);
        const x = x1 * Re * (1 - L), y = y2 * Re * (1 - L), z = z2 * Re * (1 - L) + zf * L, s = 1 + (pickS - 1) * L;
        cards[i].style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) rotateY(' + yaw.toFixed(2) + 'deg) rotateX(' + pitch.toFixed(2) + 'deg)' + (L > 0.001 ? ' scale(' + s.toFixed(3) + ')' : '');
        cards[i].style.setProperty('--front', Math.max(L, (z2 / len + 1) / 2).toFixed(3));
        cards[i].style.setProperty('--back', (A.clamp((-z2 / len) * 2.5, 0, 1) * (1 - L)).toFixed(3)); // facing away: show a card back
        const k = P / Math.max(1, P - z), f = L > 0.5 ? 1 : z2 / len; // perspective projection of the card's center
        hx[i] = x * k; hy[i] = y * k; hz[i] = z; hf[i] = f; hr[i] = 0.5 * cardW * s * k * Math.max(0.3, f);
        if (z2 > best) { best = z2; bi = i; }
      }
      if (bi !== front) { if (front >= 0) cards[front].classList.remove('is-front'); front = bi; if (bi >= 0) cards[bi].classList.add('is-front'); }
    }

    const loop = A.loop(el, dt => {
      const still = A.reduce.matches;
      if (turn) { // ease to the target orientation, the short way round
        const k = still ? 1 : 1 - Math.pow(0.0009, dt);
        ry += turn.dy * k; rx += turn.dx * k; turn.dy *= 1 - k; turn.dx *= 1 - k;
        if (Math.abs(turn.dy) < 0.05 && Math.abs(turn.dx) < 0.05) turn = null;
        phase = 'turn';
      } else if (drag) phase = 'drag';
      else {
        if (still) vx = vy = 0;
        else {
          const f = Math.pow(0.2, dt); // a throw loses most of its speed within about a second
          vx *= f; vy *= f;
          if (Math.abs(vx) < 0.3) vx = 0;
          if (Math.abs(vy) < 0.3) vy = 0;
          ry += (vy + (picked < 0 ? o.drift : 0)) * dt;
          rx += vx * dt;
          if (picked < 0 && Math.abs(vx) < 5) rx += (o.tilt - rx) * Math.min(1, dt * 1.5); // settle back to the resting tilt
        }
        phase = Math.hypot(vx, vy) > 6 ? 'coast' : picked >= 0 ? 'held' : o.drift && !still ? 'drift' : 'rest';
      }
      rx = A.clamp(rx, -70, 70);
      if (mix < 1) mix = still ? 1 : Math.min(1, mix + dt * 1.5);
      let easing = false;
      const zg = picked >= 0 ? 1 : 0;
      if (Math.abs(zg - zoom) > 0.001) { zoom += still ? zg - zoom : (zg - zoom) * Math.min(1, dt * 5); easing = true; } else zoom = zg;
      for (let i = 0; i < n; i++) {
        const g = i === picked ? 1 : 0, d = g - lift[i];
        if (Math.abs(d) > 0.001) { lift[i] += still ? d : d * Math.min(1, dt * 6); easing = true; } else lift[i] = g;
      }
      const box = ptr ? el.getBoundingClientRect() : null; // read before this frame's writes
      paint();
      if (box && !drag) hover(hitAt(ptr[0], ptr[1], box));
      statT += dt;
      if (phase !== said || statT > 0.2) { statT = 0; said = phase; emit(); } // a phase change is reported at once
      const moving = drag || turn || mix < 1 || easing || vx || vy || (o.drift && picked < 0 && !still);
      if (!moving) emit();
      return !!moving;
    });

    // ---------- input ----------
    // Taps are resolved here, in projection space, not by the browser. A card under the finger wins (the nearest one to
    // the viewer if several overlap); a tap in a gap takes the nearest card facing the viewer, so a finger never misses on a
    // sphere that is mostly gaps. While a card is picked only exact hits count, so tapping empty space puts it back.
    // Reach is never under 22px (a 44px finger), and cards seen edge-on at the rim or from behind are never picked.
    function hitAt(x, y, box) {
      const X = x - box.left - box.width / 2, Y = y - box.top - box.height / 2, slack = picked >= 0 ? 1 : 1.7;
      let on = -1, onZ = -1e9, near = -1, nearD = slack;
      for (let i = 0; i < n; i++) {
        if (hf[i] < 0.15) continue;
        const d = Math.hypot(X - hx[i], Y - hy[i]) / Math.max(hr[i], 22);
        if (d < 1) { if (hz[i] > onZ) { onZ = hz[i]; on = i; } }
        else if (d < nearD) { nearD = d; near = i; }
      }
      return on >= 0 ? on : near;
    }
    const hit = e => hitAt(e.clientX, e.clientY, el.getBoundingClientRect());
    function hover(i) {
      if (i === hov) return;
      if (hov >= 0) cards[hov].classList.remove('is-hover');
      hov = i; if (i >= 0) cards[i].classList.add('is-hover');
      el.classList.toggle('is-over', i >= 0);
    }
    const degPerPx = () => 180 / Math.max(240, R * 2.6); // a drag across the sphere turns it about half way
    const on = {
      pointerdown(e) {
        if (e.button !== 0) return;
        drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, id: e.pointerId, moved: false, samples: [[performance.now(), e.clientX, e.clientY]] };
      },
      pointermove(e) {
        if (e.pointerType === 'mouse') ptr = [e.clientX, e.clientY];
        if (!drag) { if (e.pointerType === 'mouse') hover(hit(e)); return; }
        if (e.pointerId !== drag.id) return;
        if (!drag.moved) {
          const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          if (Math.hypot(dx, dy) < 6) return;
          if (e.pointerType !== 'mouse' && Math.abs(dy) > Math.abs(dx)) { drag = null; return; } // vertical swipe: let the page scroll
          drag.moved = true; turn = null; vx = vy = 0;
          el.setPointerCapture(e.pointerId); el.classList.add('is-dragging');
        }
        const k = degPerPx() * (picked >= 0 ? 0.5 : 1); // zoomed in: the same drag turns less
        ry += (e.clientX - drag.lx) * k; rx -= (e.clientY - drag.ly) * k;
        drag.lx = e.clientX; drag.ly = e.clientY;
        const now = performance.now();
        drag.samples.push([now, e.clientX, e.clientY]);
        while (drag.samples.length > 2 && now - drag.samples[0][0] > 100) drag.samples.shift();
        loop.wake();
      },
      pointerup: end, pointercancel: end, lostpointercapture: end,
      pointerleave() { ptr = null; hover(-1); },
      click(e) {
        if (el._atSwallow) { e.preventDefault(); e.stopPropagation(); return; }
        const direct = e.target.closest && e.target.closest('.at-orbit__card'); // a screen reader or script activated the button itself
        const i = direct ? cards.indexOf(direct) : hit(e);
        if (i < 0) { release(); return; }
        if (i === picked) release(); else pick(i);
      },
      keydown(e) {
        if (e.target !== el) return;
        const step = { ArrowLeft: [0, 24], ArrowRight: [0, -24], ArrowUp: [-14, 0], ArrowDown: [14, 0] }[e.key];
        if (step) { e.preventDefault(); turn = { dx: step[0], dy: step[1] }; vx = vy = 0; loop.wake(); return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (front >= 0) (front === picked ? release() : pick(front)); return; }
        if (e.key === 'Escape' && picked >= 0) { e.preventDefault(); release(); }
      }
    };
    function end() {
      if (!drag) return;
      const d = drag; drag = null;
      el.classList.remove('is-dragging');
      if (!d.moved) return;
      const a = d.samples[0], b = d.samples[d.samples.length - 1], t = Math.max(16, b[0] - a[0]), k = degPerPx();
      vy = A.clamp(((b[1] - a[1]) / t) * 1000 * k, -720, 720); // deg/s around Y from the horizontal throw
      vx = A.clamp((-(b[2] - a[2]) / t) * 1000 * k, -360, 360);
      el._atSwallow = true; setTimeout(() => { el._atSwallow = false; }, 0); // the click after a drag is not a pick
      loop.wake();
    }
    for (const k in on) el.addEventListener(k, on[k]);

    function turnTo(i) { // the shortest rotation that brings card i to the front
      const p = to[i], wantY = -Math.atan2(p[0], p[2]) / RAD;
      const tilt = Math.asin(A.clamp(p[1], -1, 1)) / RAD, wantX = o.shape === 'sphere' ? tilt : tilt * 0.5 + o.tilt * 0.5;
      const dy = ((((wantY - ry) % 360) + 540) % 360) - 180;
      turn = { dy, dx: A.clamp(wantX, -60, 60) - rx }; vx = vy = 0; loop.wake();
    }
    function pick(i) {
      if (i < 0 || i >= n) return;
      if (picked >= 0) { cards[picked].classList.remove('is-picked'); cards[picked].setAttribute('aria-pressed', 'false'); }
      picked = i; turnTo(i);
      cards[i].classList.add('is-picked'); cards[i].setAttribute('aria-pressed', 'true'); el.classList.add('has-pick');
      if (o.onPick) o.onPick(cards[i], i);
      emit();
    }
    function release() {
      if (picked < 0) return;
      cards[picked].classList.remove('is-picked'); cards[picked].setAttribute('aria-pressed', 'false');
      picked = -1; el.classList.remove('has-pick');
      if (o.onRelease) o.onRelease();
      loop.wake(); emit();
    }

    const ro = new ResizeObserver(() => { measure(); paint(); loop.wake(); });
    ro.observe(el);
    cards.forEach(c => c.setAttribute('aria-pressed', 'false'));
    measure(); paint(); el.classList.add('is-ready');

    return (el._atOrbit = {
      pick, release, focus: turnTo,
      setShape(name) {
        if (name === o.shape) return;
        from = pos.map(p => p.slice()); o.shape = name; to = cards.map((_, i) => layout(name, i, n)); mix = 0;
        measure(); if (picked >= 0) turnTo(picked); loop.wake(); emit();
      },
      spin(dx, dy) { vx += dx || 0; vy += dy || 0; loop.wake(); },
      get shape() { return o.shape; }, get picked() { return picked; }, get front() { return front; },
      destroy() { loop.stop(); ro.disconnect(); for (const k in on) el.removeEventListener(k, on[k]); el._atOrbit = null; }
    });
  };
})(typeof self !== 'undefined' ? self : this);
