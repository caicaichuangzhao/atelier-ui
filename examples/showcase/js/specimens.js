/* The eleven specimens. Each card wires one component to its live readout and step chips.
   Needs core.js, the components, fx/*.js and kit.js. Each card runs inside S.safe, so one failure stays local. */
(function (root) {
  'use strict';
  const A = root.Atelier, S = A.showcase, $ = id => document.getElementById(id);
  const mouse = e => e.pointerType === 'mouse';
  const token = name => A.css(document.documentElement, '--c-' + name, '#888888');

  /* 01 done burst: press → tick → strike → burst */
  S.safe('check', () => {
    const c = S.card('c-check'), list = $('checkList'), meter = $('checkMeter');
    let bursts = 0, pressed = false;
    const paint = (done, total, quiet) => {
      meter.querySelector('i').style.setProperty('--p', (done / total).toFixed(3));
      meter.querySelector('b').textContent = done + '/' + total;
      c.read({ done: done + '/' + total }, quiet);
    };
    list.addEventListener('pointerdown', e => {
      const box = e.target.closest('.at-check'), input = box && box.querySelector('input');
      if (e.button || !input || input.checked) return;
      pressed = true; c.steps.reset(); c.steps.mark(0); c.steps.fade(1400); // a press that never lands fades out
    });
    A.checks(list, {
      onChange(done, total, input) {
        const name = input.closest('.at-check').querySelector('.at-check__text').textContent;
        paint(done, total);
        if (!input.checked) { pressed = false; c.steps.reset(); c.read({ last: '↺ ' + name }); return; }
        if (!pressed) { c.steps.reset(); c.steps.mark(0); } // keyboard: Space toggles without a pointer press
        pressed = false; bursts++;
        c.steps.keep();
        c.steps.later(() => c.steps.mark(1), 60);
        c.steps.later(() => c.steps.mark(2), 160);
        c.steps.later(() => c.steps.mark(3), 260);
        c.steps.fade(1900);
        c.read({ last: '✓ ' + name, bursts });
        if (done === total) A.toast('四项都完成了');
      }
    });
    const inputs = Array.from(list.querySelectorAll('.at-check input'));
    paint(inputs.filter(i => i.checked).length, inputs.length, true);
  });

  /* 02 hold to seal: press → charge → stamp → done. Letting go early winds back. */
  S.safe('seal', () => {
    const c = S.card('c-seal'), btn = $('sealBtn'), side = $('sealSide'), label = btn.querySelector('.at-hold__label');
    let t0 = 0, held = 0, state = '待盖章', done = false;
    const set = s => { if (s !== state) { state = s; c.read({ state: s }); } };
    const h = A.hold(btn, {
      duration: 900, scope: $('sealPaper'),
      onProgress(p, holding) {
        if (done) return;
        if (holding) {
          if (!t0) { t0 = performance.now(); c.steps.reset(); c.steps.mark(0); set('蓄力中'); }
          held = (performance.now() - t0) / 1000;
          if (p > 0.1) c.steps.mark(1);
        } else {
          t0 = 0;
          if (p === 0 && state === '蓄力中') { set('待盖章'); c.steps.fade(600); } // a tap too short to count as a cancel
        }
        c.read({ press: Math.round(p * 100) + '%', held: held.toFixed(2) + 's' }, true);
      },
      onCancel() { set('已取消'); c.steps.fade(900); },
      onComplete() {
        done = true; set('已盖章'); c.read({ press: '100%' });
        c.steps.mark(1); c.steps.mark(2); c.steps.later(() => c.steps.mark(3), 340);
        label.textContent = '已盖'; side.classList.add('is-done');
      }
    });
    $('sealReset').addEventListener('click', () => {
      done = false; held = 0; t0 = 0;
      btn.focus(); // move focus off the reset link before it hides
      h.reset(); c.steps.reset();
      label.textContent = '按住'; side.classList.remove('is-done');
      set('待盖章'); c.read({ press: '0%', held: '0.00s' }, true);
    });
  });

  /* 03 glider segments: press → slide → past the midpoint → settle. The indicator never stretches. */
  S.safe('range', () => {
    const c = S.card('c-range'), seg = $('rangeSeg'), bars = $('rangeBars'), names = ['日', '周', '月', '年'];
    for (let i = 0; i < 12; i++) { const b = document.createElement('i'); b.style.setProperty('--k', i); bars.appendChild(b); }
    const show = k => { // made-up sample shapes, stable per period
      const hs = Array.from({ length: 12 }, (_, i) => 22 + 70 * Math.abs(Math.sin(i * (0.55 + k * 0.31) + k * 1.7)) * (0.55 + 0.45 * Math.sin(i / 3 + k)));
      const top = hs.indexOf(Math.max(...hs));
      Array.from(bars.children).forEach((b, i) => { b.style.setProperty('--h', hs[i].toFixed(1)); b.classList.toggle('is-peak', i === top); });
    };
    let pressed = false, dragged = false;
    seg.addEventListener('pointerdown', e => { if (e.button) return; pressed = true; dragged = false; c.steps.reset(); c.steps.mark(0); c.steps.fade(1400); });
    seg.addEventListener('keydown', () => { pressed = false; dragged = false; });
    const r = A.segmented(seg, {
      onChange(i) { show(i); c.read({ index: names[i] }); },
      onState(s) {
        if (s.phase === 'drag') {
          if (!dragged) { dragged = true; c.steps.keep(); c.steps.mark(0); }
          if (Math.abs(s.offset) > 4) c.steps.mark(1);
          if (s.over !== s.index) c.steps.mark(2);
          c.read({ offset: (s.offset > 0 ? '+' : '') + s.offset + '/' + s.threshold + 'px', glide: '跟手' }, true);
          return;
        }
        if (dragged) { // released after a drag: the indicator glides to the nearest option
          dragged = false; pressed = false;
          c.steps.mark(3); c.steps.fade(1200);
          c.read({ offset: '0px', glide: s.duration + 'ms' });
          return;
        }
        if (!s.duration) return; // the first quiet layout, or a tap on the current option
        if (!pressed) { c.steps.reset(); c.steps.mark(0); }
        pressed = false;
        c.steps.keep();
        c.steps.later(() => c.steps.mark(1), 40);
        c.steps.later(() => c.steps.mark(2), s.duration / 2);
        c.steps.later(() => c.steps.mark(3), s.duration);
        c.steps.fade(s.duration + 1200);
        c.read({ offset: '0px', glide: s.duration + 'ms' });
      }
    });
    show(r.index);
  });

  /* 04 inertia wheel: drag → fling → coast → snap */
  S.safe('wheel', () => {
    const c = S.card('c-wheel'), sum = $('wheelSum');
    const values = ['¥10', '¥20', '¥30', '¥50', '¥100', '¥200', '¥300', '¥500', '¥800', '¥1000'];
    const names = { rest: '静止', drag: '拖动', coast: '滑行', snap: '吸附' };
    let prev = 'rest', flung = false;
    const w = A.wheel($('wheel'), {
      values, index: 4,
      onChange(i, v) { sum.textContent = v; },
      onState(s) {
        if (prev === 'rest' && s.phase !== 'rest') c.steps.reset(); // a new gesture starts a new row of chips
        if (s.phase === 'drag') c.steps.mark(0);
        if (s.phase === 'coast' && prev !== 'coast') {
          if (flung || Math.abs(s.velocity) > 200) c.steps.mark(1);
          c.steps.later(() => c.steps.mark(2), 120);
        }
        if (s.phase === 'rest' && prev !== 'rest') { c.steps.mark(3); c.steps.fade(1200); flung = false; }
        const moving = s.phase !== 'rest';
        if (s.phase !== prev) c.read({ phase: names[s.phase] });
        c.read({ pos: s.position.toFixed(2), vel: s.velocity + 'px/s' }, moving);
        prev = s.phase;
      }
    });
    c.read({ vel: '0px/s' }, true);
    $('wheelSpin').addEventListener('click', () => {
      let t = w.index;
      while (Math.abs(t - w.index) < 2) t = Math.floor(Math.random() * values.length);
      flung = true;
      w.go(t, (t - w.index) * 2.5); // items per second; enough to coast without overshooting the target
    });
  });

  /* 05 pull cord: grab → pull → past the line → let go. Toggles the whole page between light and dark. */
  S.safe('cord', () => {
    const c = S.card('c-cord'), lamp = $('lamp'), knob = $('cord').querySelector('.at-cord__knob');
    const sync = () => lamp.classList.toggle('is-lit', A.themes.mode() === 'dark');
    document.addEventListener('atelier-theme', sync); sync();
    let pressed = false;
    knob.addEventListener('pointerdown', e => { if (e.button) return; pressed = true; c.steps.reset(); c.steps.mark(0); });
    A.cord($('cord'), {
      threshold: 70, max: 150,
      onToggle: (x, y) => S.toggleMode(x, y),
      onState(s) {
        if (s.phase === 'drag') {
          if (s.pull > 8) c.steps.mark(1);
          if (s.armed) c.steps.mark(2);
          c.read({ state: s.armed ? '松手即切换' : '拉伸中' });
          c.read({ pull: s.pull + 'px' }, true);
          return;
        }
        if (s.phase === 'toggle') { c.steps.mark(3); c.steps.fade(1400); c.read({ state: '已切换' }); }
        else if (s.phase === 'release') { c.steps.fade(700); c.read({ state: '弹回' }); }
        else if (s.phase === 'tug') { // a tap or a key: one short tug does the whole sequence
          if (!pressed) c.steps.reset();
          c.steps.on(4); c.steps.fade(1400); c.read({ state: '轻拽切换' });
        } else if (s.phase === 'rest') c.read({ state: '静止' });
        pressed = false;
        c.read({ pull: s.pull + 'px' }, true);
      }
    });
  });

  /* 06 corner peel: grab the corner → lift → past the line → peel off */
  S.safe('peel', () => {
    const c = S.card('c-peel'), names = { rest: '贴着', drag: '掀起中', peel: '撕下', done: '已揭开' };
    let prev = 'rest', settleName = '回弹';
    const p = A.peel($('peel'), {
      onState(s) {
        if (s.phase === 'drag' && prev !== 'drag') { c.steps.reset(); c.steps.mark(0); }
        if (s.phase === 'drag') { if (s.reveal > 3) c.steps.mark(1); if (s.armed) c.steps.mark(2); }
        if (s.phase === 'settle' && prev !== 'settle') {
          settleName = prev === 'drag' ? '回弹' : '提示'; // after a drag it springs back; on hover or tap it only hints
          if (prev === 'drag') c.steps.fade(900);
        }
        if (s.phase === 'peel' && prev !== 'peel') { if (prev !== 'drag') c.steps.on(3); c.steps.mark(3); } // the chips stay lit until reset
        c.read({ state: s.phase === 'settle' ? settleName : s.phase === 'drag' && s.armed ? '可撕下' : names[s.phase] });
        c.read({ lift: s.reveal + '%', tip: s.distance + '/' + s.threshold + 'px' }, s.phase === 'drag' || s.phase === 'settle' || s.phase === 'peel');
        prev = s.phase;
      },
      onDone() { A.toast('邀请码 ATL-7Q2K（示例）'); }
    });
    $('peelReset').addEventListener('click', () => { p.reset(); c.steps.reset(); $('peel').querySelector('.at-peel__grip').focus(); });
  });

  /* 07 spotlight bento + odometer: enter → spotlight → refresh → digits roll */
  S.safe('bento', () => {
    const c = S.card('c-bento'), box = $('bento'), btn = $('bentoRefresh');
    const fmt = {
      calls: v => Math.round(v).toLocaleString('en-US'), ok: v => v.toFixed(1), p95: v => String(Math.round(v)),
      keys: v => String(Math.round(v)), tok: v => v.toFixed(2)
    };
    const val = { calls: 128406, ok: 99.2, p95: 182, keys: 36, tok: 4.82 }, shown = {}, zero = s => s.replace(/\d/g, '0');
    let rolled = 0, refresh = 0;
    function roll() {
      for (const k in val) {
        const s = fmt[k](val[k]), was = shown[k] && zero(shown[k]) === zero(s) ? shown[k] : zero(s); // a new shape rolls up from 0
        for (let i = 0; i < s.length; i++) if (/\d/.test(s[i]) && s[i] !== was[i]) rolled++;
        shown[k] = s;
        A.odometer(box.querySelector('[data-odo="' + k + '"]'), s);
      }
      c.read({ rolled: rolled + ' 位' });
    }
    for (const k in val) { // start every column at 0 so the first roll counts up; screen readers keep the real value
      const el = box.querySelector('[data-odo="' + k + '"]'), s = fmt[k](val[k]);
      A.odometer(el, zero(s)); el.querySelector('.at-sr').textContent = s;
    }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); setTimeout(roll, 250); } }, { threshold: 0.35 });
    io.observe(box);
    btn.addEventListener('click', () => {
      io.disconnect();
      btn.classList.remove('is-spin'); void btn.offsetWidth; btn.classList.add('is-spin');
      val.calls += 120 + Math.floor(Math.random() * 2400);
      val.ok = A.clamp(val.ok + (Math.random() - 0.5) * 0.8, 97, 99.9);
      val.p95 = A.clamp(val.p95 + (Math.random() - 0.5) * 60, 140, 260);
      val.keys = A.clamp(val.keys + Math.round((Math.random() - 0.4) * 3), 30, 48);
      val.tok += 0.01 + Math.random() * 0.08;
      roll();
      c.read({ refresh: ++refresh });
      const k = A.fine.matches ? 2 : 1; // touch chips: 按下 | 刷新 | 滚动
      c.steps.keep(); c.steps.mark(k); c.steps.later(() => c.steps.mark(k + 1), 200); c.steps.fade(1600);
    });
    btn.addEventListener('pointerdown', e => { if (!mouse(e)) { c.steps.reset(); c.steps.mark(0); } });
    btn.addEventListener('animationend', () => btn.classList.remove('is-spin'));
    A.spotlight(box, '.at-spot');
    let raf = 0, pt = '—';
    box.addEventListener('pointerenter', e => { if (mouse(e)) { c.steps.reset(); c.steps.mark(0); } });
    box.addEventListener('pointermove', e => {
      if (!mouse(e)) return;
      const r = box.getBoundingClientRect();
      pt = Math.round(e.clientX - r.left) + ',' + Math.round(e.clientY - r.top);
      if (!A.reduce.matches) c.steps.mark(1); // the spotlight is off with reduced motion
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; c.read({ pointer: pt }, true); });
    });
    box.addEventListener('pointerleave', e => { if (!mouse(e)) return; cancelAnimationFrame(raf); raf = 0; c.read({ pointer: '—' }, true); c.steps.fade(700); });
  });

  /* 08 info pill: hover → open → copy → close */
  S.safe('pill', () => {
    const c = S.card('c-pill'), keys = $('keys');
    let copied = 0;
    c.read({ width: keys.querySelector('.at-ipill').offsetWidth + 'px' }, true); // 32px with a mouse, 44px on touch
    keys.querySelectorAll('.at-ipill').forEach(rv => {
      rv.addEventListener('pointerenter', e => { if (mouse(e) && !rv.classList.contains('is-open')) { c.steps.reset(); c.steps.mark(0); } });
      rv.addEventListener('pointerleave', e => { if (mouse(e) && !rv.classList.contains('is-open')) c.steps.fade(700); });
      rv.addEventListener('pointerdown', e => { if (!mouse(e) && !rv.classList.contains('is-open')) { c.steps.reset(); c.steps.mark(0); } }); // touch: the tap is step 1
    });
    keys.addEventListener('at-ipill', e => {
      const rv = e.target, d = e.detail;
      if (d.copied) { c.read({ copied: ++copied + ' 次' }); c.steps.mark(2); return; }
      if (d.open) {
        c.steps.keep(); c.steps.mark(1);
        c.read({ open: rv.closest('.sp-key').firstElementChild.textContent, width: (parseInt(rv.querySelector('.at-ipill__shell').style.width, 10) || rv.offsetWidth) + 'px' });
        return;
      }
      queueMicrotask(() => { // when another pill opens in the same click, this close is only a hand-over
        if (keys.querySelector('.at-ipill.is-open')) return;
        c.read({ open: '—', width: rv.offsetWidth + 'px' });
        c.steps.mark(3); c.steps.fade(900);
      });
    });
  });

  /* 09 magnetic state button: approach → press → working → result */
  S.safe('pub', () => {
    const c = S.card('c-pub'), stage = $('pubStage'), btn = $('pubBtn'), fail = $('pubFail');
    const touch = !A.fine.matches, P = touch ? [-1, 0, 1, 2] : [0, 1, 2, 3]; // chip per stage; touch has no "near" and ends on "复位"
    let near = false, done = false, t0 = 0;
    const fresh = () => { if (!done) return; done = false; c.steps.reset(); if (near) c.steps.mark(0); }; // a finished round makes room for the next
    A.magnetic($('pubWrap'), { zone: stage });
    stage.addEventListener('pointermove', e => {
      if (!mouse(e)) return;
      const r = btn.getBoundingClientRect(), d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      const now = d < Math.max(r.width, r.height) / 2 + 70; // the same reach the magnet uses
      if (now && !near) { near = true; if (!btn.dataset.state || btn.dataset.state === 'idle') fresh(); c.steps.keep(); c.steps.mark(0); }
      if (!now && near) { near = false; if (btn.dataset.state !== 'loading') c.steps.fade(700); }
    });
    stage.addEventListener('pointerleave', () => { if (near) { near = false; if (btn.dataset.state !== 'loading') c.steps.fade(700); } });
    btn.addEventListener('pointerdown', e => { // ignored while busy, as the button itself ignores clicks then
      if (e.button || btn.dataset.state === 'loading' || btn.dataset.state === 'success') return;
      fresh(); c.steps.keep(); c.steps.mark(P[1]);
    });
    A.stateButton(btn, {
      action: () => new Promise((ok, no) => setTimeout(() => (fail.checked ? no() : ok()), 700 + Math.random() * 600)),
      onState(s) {
        c.read({ state: s.state });
        if (s.state === 'loading') {
          fresh(); c.steps.keep(); c.steps.mark(P[1]); c.steps.mark(P[2]); // Enter or Space presses without a pointer
          t0 = performance.now(); c.read({ elapsed: '…', result: '—' });
        } else if (s.state === 'success' || s.state === 'error') {
          done = true; c.steps.mark(P[3]);
          c.read({ elapsed: Math.round(performance.now() - t0) + 'ms', result: s.state === 'success' ? '已发布' : '失败' });
          if (!near) c.steps.fade(2200);
        } else if (s.state === 'idle' && touch) { if (done) { c.steps.mark(3); c.steps.fade(1200); } } // the button is ready again
        else if (s.state === 'idle' && !near) c.steps.fade(400);
      }
    });
  });

  /* 10 proximity scrollbar: approach → thicken → drag → fade */
  S.safe('feed', () => {
    const c = S.card('c-feed'), feed = $('feed'), view = feed.querySelector('.at-scroll__view');
    const paths = ['/v1/chat/completions', '/v1/embeddings', '/v1/models', '/v1/images/generations', '/v1/audio/speech', '/v1/files'];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // fixed sample data, the same on every load
    const pad = n => String(n).padStart(2, '0');
    let sec = 9 * 3600 + 41 * 60 + 7, rows = '';
    for (let i = 0; i < 40; i++) {
      sec -= 1 + Math.floor(rnd() * 9);
      const code = i % 13 === 5 ? 429 : i % 17 === 9 ? 500 : 200, p = paths[Math.floor(rnd() * paths.length)];
      const ms = Math.round(code === 200 ? 120 + rnd() * (rnd() < 0.12 ? 2200 : 520) : 30 + rnd() * 60);
      rows += '<li><span>' + pad(Math.floor(sec / 3600)) + ':' + pad(Math.floor(sec / 60) % 60) + ':' + pad(sec % 60) + '</span>' +
        '<span' + (code !== 200 ? ' class="is-slow"' : '') + '>' + code + '</span><span>' + (p === '/v1/models' || p === '/v1/files' ? 'GET ' : 'POST ') + p + '</span>' +
        '<span' + (ms > 1000 ? ' class="is-slow"' : '') + '>' + ms + 'ms</span></li>'; // errors and slow calls in red
    }
    $('feedList').innerHTML = rows; // static sample markup built above, no outside input
    c.read({ rows: 40 }, true);
    A.scrollbar(feed);
    if (!A.fine.matches) { // touch keeps the platform's own overlay bars; the chips follow the swipe instead
      let idle = 0, down = false;
      const settle = () => { clearTimeout(idle); idle = setTimeout(() => { c.steps.mark(3); c.steps.fade(900); }, 240); };
      c.read({ near: '系统' }, true);
      view.addEventListener('touchstart', () => { down = true; clearTimeout(idle); c.steps.reset(); c.steps.mark(0); }, { passive: true });
      const lift = () => { down = false; c.steps.mark(2); settle(); }; // 停下 only after the lift
      view.addEventListener('touchend', lift, { passive: true });
      view.addEventListener('touchcancel', lift, { passive: true }); // system gesture took the touch
      view.addEventListener('scroll', () => {
        c.steps.keep(); c.steps.mark(1);
        c.read({ scroll: Math.round(view.scrollTop / Math.max(1, view.scrollHeight - view.clientHeight) * 100) + '%' }, true);
        if (!down) settle(); // momentum after the lift pushes the stop back
      }, { passive: true });
      return;
    }
    let used = false, raf = 0;
    function sync() {
      raf = 0;
      const near = parseFloat(feed.style.getPropertyValue('--sb-near')) || 0, drag = feed.classList.contains('is-sb-drag');
      const max = view.scrollHeight - view.clientHeight;
      if (near > 0) { if (!used) { used = true; c.steps.reset(); c.steps.mark(0); } c.steps.keep(); }
      if (near > 0.5) c.steps.mark(1);
      if (drag) c.steps.mark(2);
      if (near === 0 && used) { used = false; c.steps.mark(3); c.steps.fade(1000); }
      c.read({ near: Math.round(near * 100) + '%', scroll: (max > 0 ? Math.round((view.scrollTop / max) * 100) : 0) + '%' }, true);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(sync); };
    new MutationObserver(kick).observe(feed, { attributes: true, attributeFilter: ['style', 'class'] });
    view.addEventListener('scroll', kick, { passive: true });
  });

  /* 11 ink trail: move → speed up → thin out → fade. The brush follows the theme. */
  S.safe('trail', () => {
    const c = S.card('c-trail'), hint = $('trailHint'), names = { brush: '笔锋', glow: '辉光', beads: '团子串' };
    const style = () => {
      const st = A.themes.state, t = A.themes.T[st.theme], mode = t.ribbon[A.themes.mode()];
      const color = token(mode === 'glow' || st.theme === 'porcelain' ? 'accent' : 'text');
      return { mode, width: t.ribbon.width, color, colors: [token('accent'), token('data-2'), token('data-3'), token('data-4')] };
    };
    let base = style().width, stroke = false;
    const r = A.ribbon($('trailCanvas'), Object.assign(style(), {
      life: 0.5, target: $('trail'),
      onStats(s) {
        if (!s.points) { // the last point has faded
          if (stroke) { stroke = false; c.steps.mark(3); c.steps.fade(900); }
          c.read({ speed: '0px/s' }, true);
          return;
        }
        if (!stroke) { stroke = true; c.steps.reset(); c.steps.mark(0); }
        if (s.speed > 600) c.steps.mark(1);
        if (s.width && s.width < base * 0.6) c.steps.mark(2);
        c.read({ speed: s.speed + 'px/s', width: s.width + 'px' }, true);
      }
    }));
    const brush = () => c.read({ brush: names[style().mode] });
    document.addEventListener('atelier-theme', () => { const s = style(); base = s.width; r.setStyle(s); brush(); });
    brush(); c.read({ speed: '0px/s' }, true);
    if (A.reduce.matches) hint.textContent = '已减少动态效果 · 拖尾关闭';
    else if (!A.fine.matches) hint.textContent = '用手指横向划过';
  });
})(typeof self !== 'undefined' ? self : this);
