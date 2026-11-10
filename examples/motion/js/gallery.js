/* Motion atlas wiring: positioning switcher, family filter (itself a FLIP template), and one block per template card.
   Each block only connects the reusable asset to the card's readout and step chips; the effects live in assets/. */
(function (root) {
  'use strict';
  const A = root.Atelier, S = A.showcase, TH = A.themes, PAL = root.AtelierPalette, $ = id => document.getElementById(id);
  const token = name => A.css(document.documentElement, '--c-' + name, '#888888');
  const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const once = (el, fn, margin) => { // run fn the first time el comes into view
    if (!('IntersectionObserver' in root)) { fn(); return; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margin || '0px 0px -15% 0px' });
    io.observe(el);
  };
  const replay = (els, cls) => { // restart a CSS-driven entrance: drop the class without transitions, then add it back
    els.forEach(el => { el.classList.add('is-reset'); el.classList.remove(cls); });
    void document.body.offsetWidth;
    els.forEach(el => el.classList.remove('is-reset'));
    requestAnimationFrame(() => requestAnimationFrame(() => els.forEach(el => el.classList.add(cls))));
  };

  S.safe('init', () => { A.reveal(); A.ipill.init(); A.scrollbar(document.documentElement); A.pauseOffscreen('.at-aurora, .at-beam'); });

  /* ---------- page chrome ---------- */
  const heroRead = S.readout($('heroReadout'));
  function sync() {
    const t = TH.T[TH.state.theme];
    $('brandMark').textContent = t.glyph;
    $('heroTheme').textContent = t.name + ' · ' + t.role.split(' / ')[0];
    heroRead({ theme: t.name.split(' · ')[1] || t.name, spring: t.spec['动效'].split('，')[0] }, true);
  }
  S.safe('themes', () => {
    const el = $('themeSeg');
    el.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.t === TH.state.theme)));
    A.segmented(el, { onChange: (i, b) => {
      if (b.dataset.t === TH.state.theme) return;
      const c = center(b);
      A.transition(() => TH.apply({ theme: b.dataset.t, hue: null, mode: null }), c[0], c[1]);
    } });
    $('modeBtn').addEventListener('click', e => {
      const c = e.clientX || e.clientY ? [e.clientX, e.clientY] : center(e.currentTarget);
      S.toggleMode(c[0], c[1]);
    });
    document.addEventListener('atelier-theme', sync);
    sync();
  });
  S.safe('chrome', () => {
    const ruler = document.querySelector('.sc-ruler');
    let raf = 0;
    const paint = () => { raf = 0; const max = document.documentElement.scrollHeight - innerHeight; ruler.style.setProperty('--progress', (max > 0 ? A.clamp(scrollY / max, 0, 1) * 100 : 0).toFixed(2) + '%'); };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    paint();
    document.querySelectorAll('[data-scramble]').forEach(el => once(el, () => A.scramble(el), '0px'));
  });
  S.safe('hero', () => { A.split($('heroTitle'), { by: 'char', stagger: 45, cap: 520 }); });

  /* ---------- family filter: FLIP on the grid of cards ---------- */
  S.safe('filter', () => {
    const grid = $('grid'), cards = Array.from(grid.children);
    A.segmented($('familySeg'), { onChange: (i, b) => {
      const f = b.dataset.f;
      A.flip(grid, () => cards.forEach(c => { c.hidden = f !== 'all' && c.dataset.family !== f; }), { scale: false });
      heroRead({ showing: cards.filter(c => !c.hidden).length });
    } });
  });

  /* 01 split entrance */
  S.safe('split', () => {
    const c = S.card('m-split'), big = $('splitBig'), small = $('splitSmall');
    const a = A.split(big, { by: 'char', stagger: 40 }), b = A.split(small, { by: 'word', stagger: 60 });
    const total = () => Math.max(a.total, b.total + 120);
    const report = () => c.read({ pieces: a.pieces.length + b.pieces.length, stagger: '40 / 60ms', total: total() + 'ms' });
    function play() {
      a.reset(); b.reset();
      c.steps.reset(); c.steps.mark(0);
      requestAnimationFrame(() => { a.play(); setTimeout(() => b.play(), 120); });
      c.steps.later(() => c.steps.mark(1), 160);
      c.steps.later(() => c.steps.mark(2), total());
      c.steps.fade(total() + 1600);
      report();
    }
    A.segmented($('splitSeg'), { onChange: (i, btn) => { big.dataset.split = small.dataset.split = btn.dataset.v; play(); } });
    c.el.querySelector('[data-replay]').addEventListener('click', play);
    report();
    once(c.el, () => c.steps.run([0, 160, total()], 1600));
  });

  /* 02 streaming reply */
  S.safe('stream', () => {
    const c = S.card('m-stream'), out = $('streamOut'), btn = $('streamBtn');
    const TEXT = '先把四拍做全：按下 100ms 内缩到 0.96，处理中收窄成圆并转圈，成功时画出对勾，最后回到原样。\n悬停只做一件事，抬起或者亮边，二选一。所有位移都用弹簧，中途再点也能从当前位置接着走。';
    let s = null;
    btn.addEventListener('click', () => {
      if (s) { s.stop(); return; }
      const t0 = performance.now();
      let first = 0;
      c.steps.reset(); c.steps.mark(0);
      btn.textContent = '停止';
      c.read({ state: 'waiting', chars: 0, cps: '—' });
      s = A.stream(out, TEXT, { cps: 60, onToken: txt => {
        if (!first) { first = performance.now(); c.steps.mark(1); c.steps.later(() => c.steps.mark(2), 240); }
        const secs = (performance.now() - first) / 1000;
        c.read({ chars: txt.length, cps: secs > 0.4 ? Math.round(txt.length / secs) + ' 字/s' : '—', state: 'streaming' }, true);
      } });
      s.done.then(full => {
        s = null;
        btn.textContent = '再生成';
        c.read({ state: full ? 'done' : 'stopped' });
        if (full) c.steps.mark(3);
        if (!first) c.steps.reset(); // stopped before the first token arrived
        else c.steps.fade(2400);
      });
    });
  });

  /* 03 marker */
  S.safe('mark', () => {
    const c = S.card('m-mark'), marks = Array.from(c.el.querySelectorAll('.at-mark'));
    const lines = () => c.read({ lines: marks.reduce((n, m) => n + m.getClientRects().length, 0) }, true);
    A.reveal('#m-mark .at-mark');
    once(c.el, () => c.steps.run([0, 120, 2100], 1600), '0px 0px -6% 0px');
    c.el.querySelector('[data-replay]').addEventListener('click', () => { replay(marks, 'is-in'); c.steps.run([0, 120, 2100], 1600); });
    lines();
    new ResizeObserver(lines).observe(c.stage);
  });

  /* 04 scroll scrub inside its own scroller */
  S.safe('scrub', () => {
    const c = S.card('m-scrub'), box = $('scrubBox'), view = box.querySelector('.at-scroll__view');
    A.scrollbar(box);
    A.scrub($('scrubText'), { by: 'char', root: view, start: 0.32, end: 0.8, onUpdate: (p, lit, n) => {
      c.read({ progress: Math.round(p * 100) + '%', lit: lit + ' / ' + n }, true);
      if (view.scrollTop < 2) { c.steps.reset(); return; }
      c.steps.keep(); c.steps.mark(0);
      if (lit > 0) c.steps.mark(1);
      if (lit >= n) { c.steps.mark(2); c.steps.fade(2400); }
    } });
    if (A.reduce.matches) c.read({ progress: '—', lit: 'all' });
  });

  /* 05 border beam while a key is generated */
  S.safe('beam', () => {
    const c = S.card('m-beam'), card = $('beamCard'), btn = $('beamBtn'), key = $('beamKey'), state = $('beamState');
    const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('').slice(0, n);
    let raf = 0;
    btn.addEventListener('click', () => {
      if (card.classList.contains('is-running')) return;
      card.classList.remove('is-off', 'is-done'); card.classList.add('is-running');
      btn.disabled = true; state.textContent = '生成中…';
      c.steps.reset(); c.steps.mark(0); c.steps.later(() => c.steps.mark(1), 300);
      const t0 = performance.now();
      const tick = () => { c.read({ state: 'running', elapsed: ((performance.now() - t0) / 1000).toFixed(1) + 's' }, true); raf = requestAnimationFrame(tick); };
      tick();
      setTimeout(() => {
        cancelAnimationFrame(raf);
        card.classList.remove('is-running'); card.classList.add('is-off', 'is-done');
        A.scramble(key, 'sk-' + hex(4) + ' ···· ···· ' + hex(4));
        state.textContent = '已生成 · 只显示首尾';
        btn.disabled = false; btn.textContent = '再生成一个';
        c.read({ state: 'done', elapsed: ((performance.now() - t0) / 1000).toFixed(1) + 's' });
        c.steps.mark(2); c.steps.fade(2400);
      }, 2600);
    });
  });

  /* 06 shine */
  S.safe('shine', () => {
    const c = S.card('m-shine'), text = $('shineText'), items = Array.from(c.el.querySelectorAll('[data-shine]'));
    let n = 0;
    function sweep(how) {
      n++; c.read({ sweeps: n, trigger: how });
      items.forEach(el => el.classList.remove('is-shine'));
      replay([text], 'is-in');
      void c.el.offsetWidth;
      items.forEach(el => el.classList.add('is-shine'));
      c.steps.run([0, 120, 1000], 1200);
    }
    items.forEach(el => {
      el.addEventListener('animationend', () => el.classList.remove('is-shine'));
      el.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse' || A.reduce.matches) return; n++; c.read({ sweeps: n, trigger: 'hover' }); c.steps.run([0, 120, 900], 1000); });
    });
    c.el.querySelector('.mo-cta').addEventListener('click', () => sweep('tap'));
    c.el.querySelector('[data-replay]').addEventListener('click', () => sweep('replay'));
    once(c.el, () => sweep('view'));
  });

  /* 07 aurora */
  S.safe('aurora', () => {
    const c = S.card('m-aurora'), box = $('auroraBox'), btn = $('auroraBtn');
    const read = () => {
      const p = A.reduce.matches ? 'reduced' : box.classList.contains('at-still') ? 'by user' : box.hasAttribute('data-paused') ? 'off-screen' : 'no';
      c.read({ paused: p });
      if (p === 'off-screen') c.steps.mark(2);
    };
    new MutationObserver(read).observe(box, { attributes: true, attributeFilter: ['class', 'data-paused'] });
    btn.addEventListener('click', () => {
      const still = box.classList.toggle('at-still');
      btn.setAttribute('aria-pressed', String(still));
      btn.textContent = still ? '继续' : '暂停';
    });
    once(c.el, () => { c.steps.mark(0); c.steps.later(() => c.steps.mark(1), 700); });
    read();
  });

  /* 08 dot field */
  S.safe('dots', () => {
    const c = S.card('m-dots'), boxEl = $('dotsBox'), fine = A.fine.matches;
    if (A.reduce.matches) $('dotsHint').textContent = '已减少动态效果 · 点阵保持静止';
    else if (!fine) $('dotsHint').textContent = '轻点一下';
    const style = () => ({ color: token('line-strong'), hot: token('accent'), shape: TH.state.theme === 'ink' || TH.state.theme === 'night' ? 'square' : 'round' });
    const d = A.dotfield($('dotsCanvas'), Object.assign(style(), { target: boxEl, gap: 18, lens: 96,
      onStats: s => c.read({ dots: s.dots, ripples: s.ripples, fps: s.fps || 'idle' }, true) }));
    boxEl.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; c.steps.keep(); c.steps.mark(0); c.steps.later(() => c.steps.mark(1), 160); });
    boxEl.addEventListener('pointerdown', () => {
      c.steps.keep();
      if (fine) { c.steps.on(3); c.steps.later(() => c.steps.mark(3), 120); } else { c.steps.reset(); c.steps.mark(0); c.steps.later(() => c.steps.mark(1), 100); c.steps.later(() => c.steps.mark(2), 600); c.steps.fade(2200); }
    });
    boxEl.addEventListener('pointerleave', () => c.steps.fade(1400));
    document.addEventListener('atelier-theme', () => d.setStyle(style()));
  });

  /* 09 parallax on the page scroll */
  S.safe('plx', () => {
    const c = S.card('m-plx');
    let lastS = null;
    A.parallax($('plxBox'), { onUpdate: p => {
      const s = (p - 0.5) * 2;
      c.read({ progress: Math.round(p * 100) + '%', near: (-s * 40).toFixed(0) + 'px', far: (s * 0.7 * 40).toFixed(0) + 'px' }, true);
      if (lastS !== null && Math.abs(s - lastS) > 0.002) {
        c.steps.mark(0);
        if (Math.abs(s) > 0.3) c.steps.mark(1);
        if (c.steps.lit >= 2 && Math.abs(s) < 0.08) c.steps.mark(2);
        c.steps.fade(1800);
      }
      lastS = s;
    } });
    if (A.reduce.matches) c.read({ progress: '—', near: '0px', far: '0px' });
  });

  /* 10 marquee */
  S.safe('marquee', () => {
    const c = S.card('m-marquee'), fine = A.fine.matches;
    let prev = '';
    A.marquee($('mq1'), { speed: 36, onState: s => {
      c.read({ speed: s.speed + ' px/s', mode: s.mode, copies: s.copies }, true);
      if (s.mode === prev) return;
      const was = prev; prev = s.mode;
      if (s.mode === 'hover') { c.steps.keep(); c.steps.mark(1); }
      else if (s.mode === 'drag') { c.steps.keep(); c.steps.mark(fine ? 2 : 1); }
      else if (s.mode === 'coast') c.steps.mark(2);
      else if (s.mode === 'cruise') {
        if (was && was !== 'paused') { c.steps.mark(3); c.steps.fade(1600); } else c.steps.mark(0);
      }
    } });
    A.marquee($('mq2'), { speed: 28, reverse: true });
    if (A.reduce.matches) c.read({ speed: '0', mode: 'manual', copies: 0 });
  });

  /* 11 FLIP filter and shuffle */
  S.safe('flip', () => {
    const c = S.card('m-flip'), grid = $('flipGrid'), items = Array.from(grid.children);
    function run(mutate) {
      c.steps.reset(); c.steps.mark(0);
      A.flip(grid, () => { mutate(); c.steps.mark(1); }).then(r => {
        if (r) c.read({ moved: r.moved, io: r.entered + ' / ' + r.exited, dur: r.duration + 'ms' });
        c.steps.mark(3); c.steps.fade(1400);
      });
      c.steps.later(() => c.steps.mark(2), 40);
    }
    A.segmented($('flipSeg'), { onChange: (i, b) => run(() => items.forEach(li => { li.hidden = b.dataset.k !== 'all' && li.dataset.k !== b.dataset.k; })) });
    $('flipSort').addEventListener('click', () => run(() => {
      const arr = Array.from(grid.children);
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      arr.forEach(li => grid.appendChild(li));
    }));
  });

  /* 12 shared element: a positioning card opens into its brief */
  S.safe('morph', () => {
    const c = S.card('m-morph'), list = $('morphList'), panel = $('morphPanel');
    let open = null;
    ['ink', 'night', 'dango'].forEach(id => {
      const t = TH.T[id], b = document.createElement('button');
      b.type = 'button'; b.className = 'mo-morph__card'; b.dataset.theme = id; b.dataset.mode = t.natural;
      b.innerHTML = '<b></b><span></span>';
      b.querySelector('b').textContent = t.glyph; b.querySelector('span').textContent = t.name;
      b.setAttribute('aria-label', '展开「' + t.name + '」'); b.setAttribute('aria-haspopup', 'dialog');
      PAL.apply(b, TH.opts(id, t.natural)); // each card previews its own palette, type and corners
      b.addEventListener('click', () => show(b, id));
      list.appendChild(b);
    });
    function show(b, id) {
      if (open) return;
      const t = TH.T[id], t0 = performance.now();
      open = b;
      panel.dataset.theme = id; panel.dataset.mode = t.natural;
      PAL.apply(panel, TH.opts(id, t.natural));
      $('morphGlyph').textContent = t.glyph; $('morphTitle').textContent = t.name + ' · ' + t.role;
      $('morphBrief').textContent = t.brief; $('morphSpec').textContent = t.spec['动效'];
      panel.hidden = false; b.style.visibility = 'hidden';
      c.steps.reset(); c.steps.mark(0); c.steps.later(() => c.steps.mark(1), 60);
      c.read({ from: t.name.split(' · ')[1] || id, state: 'open' });
      $('morphClose').focus({ preventScroll: true });
      A.morph(b, panel).then(() => { c.read({ dur: Math.round(performance.now() - t0) + 'ms' }); c.steps.mark(2); });
    }
    function hide() {
      if (!open) return;
      const b = open;
      c.read({ state: 'closing' });
      A.morph(b, panel, { reverse: true }).then(() => {
        panel.hidden = true; b.style.visibility = ''; open = null;
        b.focus({ preventScroll: true });
        c.read({ state: 'list' }); c.steps.mark(3); c.steps.fade(1400);
      });
    }
    $('morphClose').addEventListener('click', hide);
    panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); hide(); } });
  });

  /* 13 skeleton → content */
  S.safe('skel', () => {
    const c = S.card('m-skel'), list = $('skelList');
    const ROWS = [['P', 'POST /v1/chat/completions', '200 · 1.24s'], ['G', 'GET /v1/models', '200 · 86ms'], ['P', 'POST /v1/embeddings', '200 · 312ms']];
    const skeleton = () => { list.innerHTML = ROWS.map(() => '<li><span class="at-skel is-circle"></span><span><span class="at-skel" style="width:82%"></span><span class="at-skel" style="width:46%;margin-top:9px"></span></span></li>').join(''); };
    const real = animate => {
      list.textContent = '';
      ROWS.forEach((r, i) => {
        const li = document.createElement('li');
        if (animate) { li.className = 'at-skel-in'; li.style.setProperty('--i', i); }
        li.innerHTML = '<span class="mo-skel__av" aria-hidden="true"></span><span><b></b><small></small></span>';
        li.querySelector('.mo-skel__av').textContent = r[0]; li.querySelector('b').textContent = r[1]; li.querySelector('small').textContent = r[2] + ' · 示例';
        list.appendChild(li);
      });
    };
    let t = 0, show = 0;
    function load() {
      clearTimeout(t); clearTimeout(show);
      const wait = 900 + Math.round(Math.random() * 900);
      c.steps.reset(); c.steps.mark(0);
      list.setAttribute('aria-busy', 'true');
      c.read({ state: 'loading', wait: wait + 'ms' });
      show = setTimeout(() => { skeleton(); c.steps.mark(1); }, 300); // the skeleton only shows if loading outlasts 300ms
      t = setTimeout(() => {
        clearTimeout(show); real(true); list.setAttribute('aria-busy', 'false');
        c.steps.mark(1); c.steps.mark(2); c.steps.later(() => c.steps.mark(3), 200); c.steps.fade(1800);
        c.read({ state: 'ready' });
      }, wait);
    }
    $('skelReload').addEventListener('click', load);
    real(false);
    c.read({ state: 'ready', wait: '—' });
    once(c.el, load);
  });

  /* 14 press ripple */
  S.safe('ripple', () => {
    const c = S.card('m-ripple');
    let n = 0;
    A.ripple(c.el, '[data-ripple]', {
      onPress: i => { n++; c.read({ presses: n, origin: i.x + ',' + i.y, held: '…' }); c.steps.reset(); c.steps.mark(0); c.steps.later(() => c.steps.mark(1), 90); },
      onRelease: r => { c.read({ held: r.held + 'ms' }); c.steps.mark(1); c.steps.mark(2); c.steps.later(() => c.steps.mark(3), 320); c.steps.fade(1600); }
    });
  });

  /* 15 confetti on the last checkbox */
  S.safe('confetti', () => {
    const c = S.card('m-confetti'), boxes = Array.from(c.el.querySelectorAll('.mo-todo__box input')), done = $('todoDone');
    let bursts = 0;
    boxes.forEach(box => box.addEventListener('change', () => {
      const k = boxes.filter(x => x.checked).length;
      c.read({ done: k + ' / 3' });
      c.steps.reset(); if (k) c.steps.mark(0);
      if (k < 3) { done.textContent = ''; c.steps.fade(1400); return; }
      c.steps.mark(1);
      done.textContent = '三步都完成了，可以正式接入了。';
      const r = box.getBoundingClientRect(), pr = A.confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: 90, spread: 80 });
      if (pr.count) { bursts++; c.steps.later(() => c.steps.mark(2), 60); c.steps.later(() => c.steps.mark(3), 700); }
      c.read({ pieces: pr.count, bursts });
      pr.then(() => c.steps.fade(600));
    }));
  });

  /* 16 draw-in chart */
  S.safe('draw', () => {
    const c = S.card('m-draw'), svg = $('drawSvg'), bars = $('drawBars');
    const V = [12, 18, 15, 24, 22, 31, 29, 38], W = 300, H = 120, pad = 10, max = 42;
    const pts = V.map((v, i) => [pad + i * (W - pad * 2) / (V.length - 1), H - pad - (v / max) * (H - pad * 2)]);
    const line = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    const end = pts[pts.length - 1];
    svg.innerHTML = '<defs><linearGradient id="drawFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".26"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>' +
      '<path data-draw-fade fill="url(#drawFill)" d="' + line + ' L' + end[0].toFixed(1) + ' ' + H + ' L' + pts[0][0].toFixed(1) + ' ' + H + ' Z"/>' +
      '<path data-draw pathLength="1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="' + line + '"/>' +
      '<circle data-draw-pop cx="' + end[0].toFixed(1) + '" cy="' + end[1].toFixed(1) + '" r="4.5" fill="currentColor"/>';
    [0.34, 0.42, 0.38, 0.55, 0.5, 0.62, 0.58, 0.7, 0.66, 0.8, 0.74, 0.92].forEach((v, i) => {
      const b = document.createElement('i'); b.style.setProperty('--v', v); b.style.setProperty('--i', i); bars.appendChild(b);
    });
    const targets = [svg, bars];
    A.reveal('#drawSvg, #drawBars');
    once(c.el, () => c.steps.run([0, 650, 1150, 1300], 1400));
    c.el.querySelector('[data-replay]').addEventListener('click', () => { replay(targets, 'is-in'); c.steps.run([0, 650, 1150, 1300], 1400); });
  });

  /* 17 flip card */
  S.safe('flipcard', () => {
    const c = S.card('m-flipcard');
    let from = null;
    A.flipcard($('flipcard'), { onState: s => {
      c.read({ angle: (((s.angle % 360) + 360) % 360) + '°', face: s.face, vel: Math.abs(s.velocity) + '°/s' }, true);
      if (s.phase === 'drag') {
        if (from === null) { from = s.angle; c.steps.reset(); c.steps.mark(0); }
        c.steps.keep(); c.steps.mark(1);
        if (Math.abs(s.angle - from) > 60) c.steps.mark(2);
      } else if (s.phase === 'settle' && from === null) { c.steps.reset(); c.steps.on(2); from = 'button'; }
      else if (s.phase === 'rest') { c.steps.mark(3); c.steps.fade(1400); from = null; }
    } });
  });

  /* 18 swipe stack */
  S.safe('stack', () => {
    const c = S.card('m-stack');
    const st = A.stack($('stack'), {
      onSwipe: (dir, card, left) => { c.read({ dir: dir === 'right' ? '收下' : '跳过', left, offset: '0' }); c.steps.on(2); c.steps.mark(2); c.steps.later(() => c.steps.mark(3), 260); c.steps.fade(1600); },
      onState: s => {
        c.read({ left: s.left }, true);
        if (s.phase === 'drag') { c.steps.keep(); if (!c.steps.lit) c.steps.mark(0); c.read({ offset: s.offset + 'px' }, true); if (s.toward) c.steps.mark(1); }
        else if (s.phase === 'rest' || s.phase === 'back') { c.read({ offset: '0' }, true); if (s.phase === 'rest') c.steps.fade(900); }
        else if (s.phase === 'undo') { c.read({ dir: '撤销' }); c.steps.reset(); }
      }
    });
    $('stackLeft').addEventListener('click', () => { c.steps.reset(); st.swipe('left'); });
    $('stackRight').addEventListener('click', () => { c.steps.reset(); st.swipe('right'); });
    $('stackUndo').addEventListener('click', () => { if (!st.undo()) A.toast('没有可以撤销的'); });
    $('stackReset').addEventListener('click', () => { st.reset(); $('stack').focus({ preventScroll: true }); });
  });

  /* ---------- signature scenes ---------- */

  /* S1 orbit. The cards are original SVG posters (no photos): a gradient from two theme data colors, one large
     shape and an index number, so every positioning repaints the sphere and nothing is borrowed. */
  S.safe('orbit', () => {
    const c = S.card('s-orbit'), el = $('orbit'), world = $('orbitWorld'), cap = $('orbitCap');
    const NAMES = ['晨雾', '潮汐', '回声', '折光', '星图', '纸页', '远山', '火花', '流沙', '织线', '方舟', '雪线', '灯塔', '月相', '码头', '风口',
      '琴弦', '花窗', '地铁', '晚霞', '轨迹', '颗粒', '镜面', '回廊', '信标', '暗房', '薄荷', '岛屿', '石阶', '钟楼', '海盐', '旷野'];
    const SHAPE = [
      '<circle cx="62" cy="34" r="24"/>', '<path d="M18 75 V46 A32 32 0 0 1 82 46 V75 Z"/>', '<path d="M50 10 L86 70 H14 Z"/>',
      '<path d="M0 22 H100 M0 38 H100 M0 54 H100" stroke="rgb(255 255 255 / .5)" stroke-width="7" fill="none"/>',
      '<rect x="30" y="14" width="40" height="40" rx="6" transform="rotate(14 50 34)"/>', '<path d="M0 75 Q30 20 60 48 T100 30 V75 Z"/>',
      '<circle cx="34" cy="38" r="18"/><circle cx="66" cy="38" r="18"/>', '<path d="M20 60 L50 16 L80 60" fill="none" stroke="rgb(255 255 255 / .5)" stroke-width="8" stroke-linejoin="round"/>'
    ];
    const sr = el.getBoundingClientRect(), N = Math.round(A.clamp((sr.width * sr.height) / 6000, 24, 32)); // ~one card per 6000 px²
    for (let i = 0; i < N; i++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'at-orbit__card'; b.tabIndex = -1; b.dataset.k = i % 6;
      b.setAttribute('aria-label', '作品 ' + (i + 1) + '：' + NAMES[i]);
      b.innerHTML = '<svg viewBox="0 0 100 75" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
        '<defs><linearGradient id="og' + i + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--og-a)"/><stop offset="1" style="stop-color:var(--og-b)"/></linearGradient></defs>' +
        '<rect width="100" height="75" fill="url(#og' + i + ')"/><g fill="rgb(255 255 255 / .34)">' + SHAPE[i % SHAPE.length] + '</g>' +
        '<text x="8" y="67" font-size="12" font-weight="700" fill="#fff" style="font-family:var(--f-mono)">' + String(i + 1).padStart(2, '0') + '</text></svg>';
      world.appendChild(b);
    }
    const paint = () => world.querySelectorAll('.at-orbit__card').forEach(b => { // colors follow the active theme
      const k = +b.dataset.k;
      b.style.setProperty('--og-a', token('data-' + (k + 1))); b.style.setProperty('--og-b', token('data-' + (((k + 2) % 6) + 1)));
    });
    paint(); document.addEventListener('atelier-theme', paint);
    let dragging = false, picked = -1;
    const orb = A.orbit(el, {
      shape: 'sphere', drift: A.fine.matches ? 6 : 4,
      onPick: (card, i) => { picked = i; cap.innerHTML = '选中 <b>' + String(i + 1).padStart(2, '0') + ' ' + NAMES[i] + '</b> · 再点一次或按 Esc 收回'; c.steps.mark(3); c.read({ picked: NAMES[i] }); },
      onRelease: () => { picked = -1; cap.textContent = '拖动转一转，点一张看看。'; c.read({ picked: '—' }); c.steps.fade(700); },
      onState: s => {
        c.read({ phase: s.phase, spin: s.speed + '°/s' }, true);
        if (s.phase === 'drag') { if (!dragging) { dragging = true; c.steps.reset(); c.steps.on(2); } c.steps.keep(); }
        else if (dragging) { dragging = false; if (s.phase === 'coast') c.steps.mark(2); if (picked < 0) c.steps.fade(1800); }
        else if (s.phase === 'drift' && !c.steps.lit) c.steps.mark(0);
      }
    });
    A.segmented($('orbitShape'), { onChange: (i, b) => orb.setShape(b.dataset.v) });
  });

  /* S2 scratch */
  S.safe('scratch', () => {
    const c = S.card('s-scratch'), el = $('scratch');
    let was = 'covered';
    const sc = A.scratch(el, {
      brush: 46, heal: 1.6,
      onState: s => {
        c.read({ phase: s.phase, wiped: s.wiped + '%', brush: s.brush + 'px' }, true);
        if (s.phase === 'wiping' && was !== 'wiping') { c.steps.reset(); c.steps.on(2); }
        if (s.phase === 'wiping' && s.wiped > 12) c.steps.mark(2);
        if (s.phase === 'healing' && was === 'wiping') { c.steps.mark(3); }
        if (s.phase === 'covered' && was === 'healing') c.steps.fade(500);
        if (s.phase === 'revealed') { c.steps.reset(); c.steps.on(3); c.steps.fade(1600); }
        was = s.phase;
      }
    });
    $('scratchReset').addEventListener('click', e => { sc.reset(); spin(e.currentTarget); c.steps.reset(); });
  });
  const spin = b => { b.classList.remove('is-spin'); void b.offsetWidth; b.classList.add('is-spin'); };

  /* S3 SVG flow: CSS loop + one SMIL packet; svgPlay pauses both off screen, the button pauses by hand */
  S.safe('flow', () => {
    const c = S.card('s-flow'), box = $('flowBox'), svg = $('flowSvg'), btn = $('flowPause');
    let stop = A.svgPlay(box), held = false;
    const clock = svg.querySelector('.mo-flow__nodes .at-svg-pop'); // the first node starts at 0s: its time is the cycle time
    const label = () => {
      if (A.reduce.matches) return '静止';
      if (held) return '暂停';
      const a = clock.getAnimations ? clock.getAnimations()[0] : null;
      if (!a || a.currentTime == null) return '—';
      const p = (a.currentTime % 8000) / 8000;
      return p < 0.14 ? '入场' : p < 0.84 ? '停留' : p < 0.94 ? '退场' : '留白';
    };
    const tick = () => c.read({ state: label() }, true);
    setInterval(tick, 400); tick();
    once(c.el, () => c.steps.run([0, 300, 900, 1500], 1800));
    btn.addEventListener('click', () => {
      held = !held;
      if (held) { stop(); box.classList.add('is-paused'); if (svg.pauseAnimations) svg.pauseAnimations(); }
      else { box.classList.remove('is-paused'); if (svg.unpauseAnimations) svg.unpauseAnimations(); stop = A.svgPlay(box); }
      btn.setAttribute('aria-pressed', String(held)); btn.setAttribute('aria-label', held ? '继续流程动画' : '暂停流程动画');
      btn.innerHTML = held ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>';
      tick();
    });
  });

  /* S4 SVG route: draw the line, then fly along it; the range input scrubs the same motion */
  S.safe('route', () => {
    const c = S.card('s-route'), svg = $('routeSvg'), path = $('routePath'), plane = $('routePlane'), end = $('routeEnd'), range = $('routeRange');
    const grid = svg.querySelector('.mo-route__grid'), L = path.getTotalLength();
    for (let x = 20; x <= 300; x += 28) grid.insertAdjacentHTML('beforeend', '<path d="M' + x + ' 10 V190"/>');
    for (let y = 18; y <= 190; y += 28) grid.insertAdjacentHTML('beforeend', '<path d="M10 ' + y + ' H310"/>');
    let scrubbing = false, fly = null, landed = false;
    const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    fly = A.pathMotion(plane, path, {
      duration: 3200, rotate: true, easing: ease,
      onUpdate: p => {
        const t = ease(p), a = path.getPointAtLength(Math.min(L, t * L + 1)), b = path.getPointAtLength(Math.max(0, t * L - 1));
        const heading = Math.round((Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI + 450) % 360); // 0° = north, clockwise
        if (!scrubbing) range.value = String(Math.round(p * 1000));
        end.classList.toggle('is-on', p >= 0.999);
        c.read({ progress: Math.round(p * 100) + '%', heading: heading + '°', state: p >= 0.999 ? '到达' : fly && fly.playing ? '飞行中' : p > 0 ? '停在途中' : '待出发' }, true);
        if (p >= 0.999) { if (!landed) { landed = true; c.steps.on(4); c.steps.fade(1800); } } // light the chips once, on landing
        else { landed = false; if (p > 0.04) { c.steps.keep(); c.steps.mark(2); } }
      }
    });
    const go = () => {
      c.steps.reset(); fly.pause().seek(0); end.classList.remove('is-on'); landed = false;
      A.drawPaths.undraw(svg); c.steps.mark(0);
      A.drawPaths(svg, { duration: 1400 }).then(() => { c.steps.mark(1); fly.play(); });
    };
    once(c.el, go);
    $('routeReplay').addEventListener('click', e => { spin(e.currentTarget); go(); });
    range.addEventListener('input', () => {
      scrubbing = true; fly.pause();
      path.getAnimations().forEach(a => a.finish()); path.style.strokeDashoffset = '0'; // the line is fully drawn while scrubbing
      fly.seek(+range.value / 1000);
    });
    range.addEventListener('change', () => { scrubbing = false; if (+range.value < 1000) fly.play(); });
  });

  /* S5 interactive SVG: drag the knob (phase sideways, amplitude up and down) or use the sliders */
  S.safe('wave', () => {
    const c = S.card('s-wave'), svg = $('waveSvg'), line = $('wavePath'), knob = $('waveKnob'), eq = $('waveEq'), fIn = $('waveF'), aIn = $('waveA');
    const X0 = 28, X1 = 304, MID = 90, AMP = 43, TMAX = Math.PI * 4; // x spans two full turns; amplitude 1 = 43 px
    const span = X1 - X0, toX = t => X0 + (t / TMAX) * span;
    let amp = 1, freq = 1, phase = 0, knobT = Math.PI / 2, drag = null;
    const crest = () => { // the first crest away from the left axis: freq·t + phase = π/2 (mod 2π)
      const per = (Math.PI * 2) / freq;
      let t = ((((Math.PI / 2 - phase) / freq) % per) + per) % per;
      if (t < 0.5) t += per;
      return t;
    };
    function draw(quiet) {
      let d = '';
      for (let i = 0; i <= 160; i++) { const t = (i / 160) * TMAX; d += (i ? 'L' : 'M') + toX(t).toFixed(1) + ' ' + (MID - Math.sin(freq * t + phase) * amp * AMP).toFixed(1); }
      line.setAttribute('d', d);
      if (!drag) knobT = crest();
      knob.setAttribute('transform', 'translate(' + toX(knobT).toFixed(1) + ' ' + (MID - amp * AMP).toFixed(1) + ')');
      const ph = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      eq.textContent = 'y = ' + amp.toFixed(1) + ' · sin(' + freq.toFixed(1) + 'x + ' + ph.toFixed(2) + ')';
      knob.setAttribute('aria-valuetext', '振幅 ' + amp.toFixed(1) + '，相位 ' + ph.toFixed(2));
      c.read({ amp: amp.toFixed(1), freq: freq.toFixed(1), phase: ph.toFixed(2) }, quiet);
    }
    knob.addEventListener('pointerdown', e => {
      const p = A.svgPoint(svg, e);
      drag = { x: p.x, y: p.y, t: knobT, amp, id: e.pointerId };
      knob.setPointerCapture(e.pointerId); knob.classList.add('is-drag');
      c.steps.reset(); c.steps.mark(0);
    });
    knob.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const p = A.svgPoint(svg, e);
      knobT = A.clamp(drag.t + ((p.x - drag.x) / span) * TMAX, 0.3, TMAX - 0.3); // the knob stays under the finger
      phase = Math.PI / 2 - freq * knobT;
      amp = A.clamp(drag.amp + (drag.y - p.y) / AMP, 0.2, 1.4);
      aIn.value = String(Math.round(amp * 10));
      draw(true); c.steps.keep(); c.steps.mark(1); c.steps.mark(2);
    });
    const up = () => { if (!drag) return; drag = null; knob.classList.remove('is-drag'); c.steps.mark(3); c.steps.fade(1400); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => knob.addEventListener(n, up));
    knob.addEventListener('keydown', e => {
      const k = { ArrowLeft: [0, 0.2], ArrowRight: [0, -0.2], ArrowUp: [0.1, 0], ArrowDown: [-0.1, 0] }[e.key];
      if (!k) return;
      e.preventDefault(); amp = A.clamp(amp + k[0], 0.2, 1.4); phase += k[1]; aIn.value = String(Math.round(amp * 10)); draw();
    });
    fIn.addEventListener('input', () => { freq = +fIn.value / 10; draw(true); });
    aIn.addEventListener('input', () => { amp = +aIn.value / 10; draw(true); });
    draw(true);
  });
})(typeof self !== 'undefined' ? self : this);
