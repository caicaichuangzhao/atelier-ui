/* Scratch reveal: the pointer wipes a top layer away to show the layer under it, and the wipe slowly heals.
   The cover is a real element (image, text, gradient); a small canvas paints the mask and is applied with
   mask-image, so no pixels of the cover are read and any CSS content works. Needs core.js; styles in scratch.css.
   <div class="at-scratch" aria-label="…"><div class="at-scratch__under">…</div><div class="at-scratch__cover">…</div></div>
   const s = Atelier.scratch(el, { brush: 46, heal: 1.6, soft: 0.55, auto: true, onState(s) {} });
   s.clear() reveals everything · s.reset() covers it again · s.destroy()
   brush: radius in px (scaled down on small stages). heal: seconds for a wiped spot to grow back (0 = stays wiped).
   Mouse wipes just by moving over it (auto: false needs a pressed button); touch and pen wipe while pressed, and a
   vertical swipe still scrolls the page. Keyboard: the stage is focusable; Space or Enter toggles fully revealed.
   Reduced motion: no healing, wipes stay. Without mask-image support the cover fades while the pointer is over it. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  const maskOK = typeof CSS !== 'undefined' && (CSS.supports('mask-image', 'url(x)') || CSS.supports('-webkit-mask-image', 'url(x)'));

  A.scratch = function (el, o) {
    if (el._atScratch) return el._atScratch;
    o = Object.assign({ brush: 46, heal: 1.6, soft: 0.55, auto: true }, o);
    const cover = el.querySelector('.at-scratch__cover');
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
    const S = 0.25; // mask resolution: a quarter of the stage is plenty for a soft brush and keeps each mask update cheap
    let W = 0, H = 0, brush = o.brush, last = null, down = null, wiped = 0, statT = 1, idle = 0, dirty = false, full = false;
    let lastStroke = -1e9, phase = 'covered', strokes = 0;
    el.classList.add(maskOK ? 'has-mask' : 'no-mask');

    function size() {
      const r = el.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width * S)); H = Math.max(1, Math.round(r.height * S));
      cv.width = W; cv.height = H;
      brush = o.brush * A.clamp(Math.min(r.width, r.height) / 420, 0.55, 1); // a smaller stage gets a smaller brush
      fill(full ? 0 : 1); push();
    }
    function fill(a) { ctx.globalCompositeOperation = 'copy'; ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.fillRect(0, 0, W, H); }
    function push() { // hand the mask to CSS; the cover stays a normal element
      dirty = false;
      if (!maskOK) return;
      const url = 'url(' + cv.toDataURL() + ')';
      cover.style.webkitMaskImage = url; cover.style.maskImage = url;
    }
    function dab(x, y) {
      const r = brush * S, g = ctx.createRadialGradient(x, y, r * (1 - o.soft), x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }
    function stroke(px, py) { // fill the gap between pointer events so a fast swipe draws a line, not a row of dots
      if (full) return;
      const x = px * S, y = py * S;
      if (last) {
        const d = Math.hypot(x - last[0], y - last[1]), step = Math.max(1, brush * S * 0.35), n = Math.min(40, Math.ceil(d / step));
        for (let i = 1; i <= n; i++) dab(last[0] + ((x - last[0]) * i) / n, last[1] + ((y - last[1]) * i) / n);
      } else { dab(x, y); strokes++; }
      last = [x, y]; dirty = true; lastStroke = performance.now(); phase = 'wiping'; loop.wake();
    }
    function measure() { // how see-through the cover is on average (0 = fully covered, 1 = gone), from a coarse grid
      const d = ctx.getImageData(0, 0, W, H).data;
      let open = 0, all = 0;
      for (let i = 3; i < d.length; i += 32) { all++; open += 255 - d[i]; }
      return all ? open / (all * 255) : 0;
    }
    const loop = A.loop(el, dt => {
      const heal = o.heal > 0 && !A.reduce.matches && !full, quiet = performance.now() - lastStroke > 300;
      let active = dirty;
      if (heal && wiped > 0) {
        // Grow the cover back by adding a little alpha everywhere. 'lighter' adds instead of blending, so in an 8-bit
        // canvas it still reaches fully opaque; a blended fill stalls around 90% and leaves a faint see-through patch.
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(0,0,0,' + Math.max(1.5 / 255, dt / o.heal).toFixed(4) + ')';
        ctx.fillRect(0, 0, W, H);
        active = dirty = true;
      }
      if (dirty) push();
      statT += dt;
      if (statT > 0.15) {
        statT = 0; wiped = measure();
        if (quiet) phase = full ? 'revealed' : wiped > 0.002 ? (heal ? 'healing' : 'wiped') : 'covered';
        if (o.onState) o.onState({ phase, wiped: Math.round(wiped * 100), brush: Math.round(brush), strokes });
      }
      idle = active ? 0 : idle + dt;
      return idle < 0.35; // run a moment past the last change so the final state gets reported, then sleep
    });

    const at = e => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const on = {
      pointermove(e) {
        if (e.pointerType === 'mouse') { if (o.auto || e.buttons) stroke(...at(e)); return; }
        if (!down || e.pointerId !== down.id) return;
        if (!down.ok) {
          const dx = e.clientX - down.x, dy = e.clientY - down.y;
          if (Math.hypot(dx, dy) < 6) return;
          if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx) * 1.4) { down = null; return; } // vertical swipe: scroll
          down.ok = true; el.setPointerCapture(e.pointerId);
          stroke(down.x - el.getBoundingClientRect().left, down.y - el.getBoundingClientRect().top);
        }
        stroke(...at(e));
      },
      pointerdown(e) { if (e.pointerType !== 'mouse') { down = { id: e.pointerId, x: e.clientX, y: e.clientY, ok: false }; last = null; } },
      pointerup(e) { if (down && e.pointerId === down.id) { if (!down.ok) stroke(...at(e)); down = null; last = null; } },
      pointercancel() { down = null; last = null; },
      pointerleave(e) { if (e.pointerType === 'mouse') last = null; },
      keydown(e) { if (e.target === el && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); full ? api.reset() : api.clear(); } }
    };
    for (const k in on) el.addEventListener(k, on[k]);
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    const ro = new ResizeObserver(() => { size(); loop.wake(); });
    ro.observe(el);
    size();

    const api = {
      clear() { full = true; fill(0); dirty = true; lastStroke = -1e9; el.classList.add('is-revealed'); loop.wake(); },
      reset() { full = false; fill(1); dirty = true; lastStroke = -1e9; last = null; wiped = 0; el.classList.remove('is-revealed'); loop.wake(); },
      get wiped() { return wiped; }, get revealed() { return full; },
      destroy() { loop.stop(); ro.disconnect(); for (const k in on) el.removeEventListener(k, on[k]); cover.style.maskImage = cover.style.webkitMaskImage = ''; el._atScratch = null; }
    };
    return (el._atScratch = api);
  };
})(typeof self !== 'undefined' ? self : this);
