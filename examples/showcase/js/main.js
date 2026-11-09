/* Page wiring: positioning switcher, mode toggle, hero particles, the derivation panel, scroll chrome, the dock and
   the adaptive frame. Loads last; themes.js already painted the first frame from <head>. */
(function (root) {
  'use strict';
  const A = root.Atelier, S = A.showcase, TH = A.themes, PAL = root.AtelierPalette, $ = id => document.getElementById(id);
  const token = name => A.css(document.documentElement, '--c-' + name, '#888888');
  const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const ids = Object.keys(TH.T);
  /* A new positioning first shows its own natural mode and recommended hue. */
  const setTheme = (id, el) => {
    if (id === TH.state.theme) return;
    const c = el ? center(el) : [innerWidth / 2, 80];
    A.transition(() => TH.apply({ theme: id, hue: null, mode: null }), c[0], c[1]);
  };

  S.safe('init', () => { A.reveal(); A.ipill.init(); A.scrollbar(document.documentElement); });

  /* top bar: positioning switcher and light/dark toggle */
  let seg = null;
  S.safe('themes', () => {
    const el = $('themeSeg');
    el.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.t === TH.state.theme)));
    seg = A.segmented(el, { onChange: (i, b) => setTheme(b.dataset.t, b) });
    $('modeBtn').addEventListener('click', e => {
      const c = e.clientX || e.clientY ? [e.clientX, e.clientY] : center(e.currentTarget); // keyboard clicks report 0,0
      S.toggleMode(c[0], c[1]);
    });
  });

  /* hero: the headline as particles, colored by the positioning's own paint style */
  let P = null;
  const heroRead = S.readout($('heroReadout'));
  function heroStyle() {
    const t = TH.T[TH.state.theme].particles, dark = TH.mode() === 'dark';
    const colors = t.paint === 'gradient' ? [token('accent'), token('spice')]
      : t.paint === 'confetti' ? [token('accent'), token('data-2'), token('data-3'), token('data-4')]
      : [token('text'), token('accent')];
    return { font: t.font, paint: t.paint, shape: t.shape, twinkle: t.twinkle, colors, hot: token('accent'), blend: t.paint === 'gradient' && dark ? 'lighter' : 'source-over' };
  }
  S.safe('hero', () => {
    const hint = $('heroHint');
    if (A.reduce.matches) hint.textContent = '已减少动态效果 · 文字保持静止';
    else if (!A.fine.matches) hint.textContent = '划过拨开文字 · 轻点打散';
    // Give the non-blocking font CSS a head start so a normal connection assembles once, in the real face.
    // particles.js samples again if the font only arrives later, so a slow or blocked font host costs at most this wait.
    const css = $('webfonts');
    new Promise(go => {
      if (!css || css.media === 'all') return go();
      css.addEventListener('load', () => requestAnimationFrame(go), { once: true });
      css.addEventListener('error', go, { once: true });
      setTimeout(go, 2000);
    }).then(() => S.safe('hero particles', () => {
      try {
        P = A.particles($('heroCanvas'), Object.assign(heroStyle(), {
          text: $('heroTitle').textContent, target: $('heroStage'),
          onStats: s => heroRead({ count: s.count, fps: s.fps, radius: s.radius + 'px', pointer: s.pointer ? s.pointer.join(',') : '—', energy: s.energy.toFixed(2) }, true)
        }));
      } catch (e) { $('heroTitle').style.cssText = 'position:static;width:auto;height:auto;clip-path:none;white-space:normal'; throw e; } // no canvas: show the real heading
    }));
  });
  S.safe('say', () => {
    const input = $('sayInput');
    $('sayForm').addEventListener('submit', e => {
      e.preventDefault();
      if (!P) return;
      const text = input.value.trim();
      P.setText(text || $('heroTitle').textContent); // the canvas is decorative; the page heading stays as written
      A.toast(text ? '粒子换成了「' + text + '」' : '已换回原句');
    });
  });

  /* 01 derivation panel: spec, swatches, contrast checks and the hue that drives the whole palette */
  const SW = ['bg', 'surface', 'sunken', 'line', 'text', 'text-2', 'accent', 'accent-strong', 'spice', 'ok', 'warn', 'bad'];
  let swatches = null, trackKey = '';
  function renderBrief(d) {
    const t = d.spec;
    $('briefGlyph').textContent = t.glyph; $('briefName').textContent = t.name; $('briefRole').textContent = t.role;
    const spec = $('briefSpec'); spec.textContent = '';
    for (const k in t.spec) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = t.spec[k]; spec.append(dt, dd); }
    if (!swatches) swatches = SW.map(k => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sc-sw'; b.innerHTML = '<i></i><span></span>';
      b.querySelector('span').textContent = k;
      b.addEventListener('click', () => A.copy(b.dataset.hex).then(ok => A.toast(ok ? '已复制 --c-' + k + ' ' + b.dataset.hex : '复制失败', ok ? '' : 'bad')));
      $('briefSwatches').appendChild(b);
      return b;
    });
    swatches.forEach((b, i) => {
      const hex = d.tokens[SW[i]];
      b.dataset.hex = hex; b.style.setProperty('--sw', hex); b.title = '--c-' + SW[i] + ' ' + hex;
      b.setAttribute('aria-label', '复制 ' + SW[i] + ' ' + hex);
    });
    const list = $('briefContrast'); list.textContent = '';
    d.report.forEach(r => {
      const li = document.createElement('li'), name = document.createElement('span'), b = document.createElement('b');
      name.textContent = r.pair.replace(' (icons, borders)', ' · 图标');
      b.textContent = r.ratio.toFixed(2) + ':1';
      li.title = (r.level === 'must' ? '至少 ' : '建议 ') + r.min + ':1';
      li.classList.toggle('is-fail', !r.pass);
      li.append(name, b); list.appendChild(li);
    });
    const hue = TH.state.hue != null ? TH.state.hue : TH.opts(d.theme, d.mode).accentHue, input = $('hueInput');
    if (+input.value !== hue) input.value = hue;
    $('hueValue').textContent = Math.round(hue) + '°';
    if (trackKey !== d.theme + d.mode) { // the track shows this theme's accent at every hue
      trackKey = d.theme + d.mode;
      const stops = [];
      for (let h = 0; h <= 360; h += 30) stops.push(PAL.derive(TH.opts(d.theme, d.mode, h % 360)).tokens.accent);
      input.style.setProperty('--hue-track', 'linear-gradient(90deg,' + stops.join(',') + ')');
    }
  }

  S.safe('brief', () => {
    const input = $('hueInput');
    let raf = 0;
    input.addEventListener('input', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; TH.apply({ hue: +input.value }); }); });
    $('resetHue').addEventListener('click', () => {
      TH.apply({ hue: null });
      A.toast('已恢复推荐色相 ' + TH.opts(TH.state.theme, TH.mode()).accentHue + '°');
    });
    $('copyTokens').addEventListener('click', () => {
      const st = TH.state, css = '/* ' + TH.T[st.theme].name + ' · palette.js */\n' +
        PAL.toCSS(TH.opts(st.theme, 'light', st.hue), ':root') + '\n' + PAL.toCSS(TH.opts(st.theme, 'dark', st.hue), '[data-mode="dark"]') + '\n';
      A.copy(css).then(ok => A.toast(ok ? '已复制浅色和深色两套颜色 tokens' : '复制失败，请检查浏览器权限', ok ? '' : 'bad'));
    });
  });

  /* positioning cards: each one previews its own type, shape and palette in its natural mode */
  const cards = [];
  function syncPositions() {
    cards.forEach(b => {
      const on = b.dataset.theme === TH.state.theme;
      b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
      PAL.apply(b, TH.opts(b.dataset.theme, null, on ? TH.state.hue : null));
    });
  }
  S.safe('positions', () => {
    const box = $('positions');
    ids.forEach(id => {
      const t = TH.T[id], b = document.createElement('button');
      b.type = 'button'; b.className = 'sc-pos'; b.setAttribute('role', 'radio');
      b.dataset.theme = id; b.dataset.mode = t.natural;
      b.setAttribute('aria-label', t.name + '，' + t.role);
      b.innerHTML = '<span class="sc-pos__glyph" aria-hidden="true"></span><span class="sc-pos__name"></span><span class="sc-pos__role"></span>' +
        '<span class="at-label"></span><span class="sc-pos__brief"></span><span class="sc-dials" aria-hidden="true"></span><span class="at-tilt__glare" aria-hidden="true"></span>';
      b.querySelector('.sc-pos__glyph').textContent = t.glyph;
      b.querySelector('.sc-pos__name').textContent = t.name;
      b.querySelector('.sc-pos__role').textContent = t.role;
      b.querySelector('.at-label').textContent = (t.natural === 'dark' ? '默认深色' : '默认浅色') + ' · ' + t.palette[t.natural].accentHue + '°';
      b.querySelector('.sc-pos__brief').textContent = t.brief;
      const dials = b.querySelector('.sc-dials');
      for (const k in t.dials) {
        const row = document.createElement('span'), name = document.createElement('span'), bar = document.createElement('i');
        row.className = 'sc-dial'; name.textContent = k; bar.style.setProperty('--v', t.dials[k]);
        row.append(name, bar); dials.appendChild(row);
      }
      b.addEventListener('click', () => setTheme(id, b));
      A.tilt(b, { max: 5 });
      box.appendChild(b); cards.push(b);
    });
    box.addEventListener('keydown', e => { // one tab stop; arrows move and select, like any radio group
      const i = cards.indexOf(document.activeElement), k = e.key;
      if (i < 0) return;
      const n = k === 'ArrowRight' || k === 'ArrowDown' ? i + 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? cards.length - 1 : null;
      if (n === null) return;
      e.preventDefault();
      const next = cards[(n + cards.length) % cards.length];
      next.focus(); setTheme(next.dataset.theme, next);
    });
    syncPositions();
  });

  /* every theme or mode change lands here: the switcher, labels, hero colors, panel and cards follow */
  document.addEventListener('atelier-theme', e => {
    const d = e.detail, t = d.spec, dark = d.mode === 'dark', html = document.documentElement;
    S.safe('theme sync', () => {
      $('brandMark').textContent = t.glyph;
      $('heroTheme').textContent = t.name.split(' · ')[0] + ' · ' + t.role.split(' / ')[0] + ' · ' + (dark ? '深色' : '浅色');
      $('modeBtn').setAttribute('aria-pressed', String(dark));
      if (seg) { const i = seg.items.findIndex(b => b.dataset.t === d.theme); if (i !== seg.index) seg.select(i, false, true); }
      if (P) P.setStyle(heroStyle());
      heroRead({ spring: A.num(html, '--spring-k', 0) + '/' + A.num(html, '--spring-c', 0) });
      renderBrief(d);
      syncPositions();
    });
  });

  /* scroll chrome: ruler ticks fill with progress; section labels decode once as they arrive */
  S.safe('chrome', () => {
    const ruler = document.querySelector('.sc-ruler');
    let raf = 0;
    const paint = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      ruler.style.setProperty('--progress', (max > 0 ? A.clamp(scrollY / max, 0, 1) * 100 : 0).toFixed(2) + '%');
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    addEventListener('resize', paint);
    paint();
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); A.scramble(en.target); } }), { threshold: 0.6 });
    document.querySelectorAll('[data-scramble]').forEach(el => io.observe(el));
  });

  /* dock: the capsule follows the section in view; a click scrolls there and the spy waits for the scroll to end */
  S.safe('dock', () => {
    const dock = $('dock'), items = Array.from(dock.querySelectorAll('.at-nav__item'));
    const secs = items.map(a => document.querySelector(a.getAttribute('href')));
    const nav = A.nav(dock, { preventDefault: true });
    let lock = false, lockT = 0, raf = 0;
    const hold = ms => { lock = true; clearTimeout(lockT); lockT = setTimeout(() => { lock = false; spy(); }, ms); };
    function spy() {
      if (lock) return;
      const line = innerHeight * 0.35, end = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
      let i = 0;
      secs.forEach((s, k) => { if (s && s.getBoundingClientRect().top <= line) i = k; });
      if (end) i = secs.length - 1;
      if (i !== nav.index) nav.select(i, true);
    }
    dock.addEventListener('click', e => {
      const it = e.target.closest('.at-nav__item'), s = it && secs[items.indexOf(it)];
      if (!s) return;
      const top = s.id === 'top' ? 0 : s.getBoundingClientRect().top + scrollY - 72;
      hold(900); // if the page cannot scroll that far, the spy still takes over again
      scrollTo({ top, behavior: A.reduce.matches ? 'auto' : 'smooth' });
    });
    const away = () => dock.classList.toggle('is-away', scrollY < innerHeight * 0.25);
    addEventListener('scroll', () => {
      if (lock) hold(160); // extends while the smooth scroll is still moving
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; away(); spy(); });
    }, { passive: true });
    addEventListener('resize', () => { away(); spy(); });
    away(); spy();
  });

  /* 03 adaptive frame: one nav, three forms. Drag the handle (or use arrow keys) to change the width. */
  S.safe('frame', () => {
    const frame = $('frame'), wrap = frame.parentElement, handle = $('frameHandle'), lis = Array.from($('frameSteps').children);
    const read = S.readout($('frameReadout')), nav = A.nav($('frameNav'), { preventDefault: true });
    const MIN = 280, MODES = { rail: ['侧栏', '<600 → 图标', 0], icons: ['图标栏', '<400 → 胶囊', 1], capsule: ['底部胶囊', '≥400 → 图标', 2] };
    let userW = null, width = 0, mode = '';
    const room = () => { const s = getComputedStyle(wrap); return wrap.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight); };
    const bounds = () => { const max = Math.floor(room()); return [Math.min(MIN, max), max]; }; // a very narrow phone pins the frame to its own width
    function layout() {
      const [min, max] = bounds();
      width = Math.round(A.clamp(userW == null ? max : userW, min, max));
      frame.style.width = width + 'px';
      const m = width >= 600 ? 'rail' : width >= 400 ? 'icons' : 'capsule', info = MODES[m];
      if (m !== mode) {
        mode = m; frame.dataset.mode = m; nav.setMode(m);
        lis.forEach((li, k) => { li.classList.toggle('is-on', k === info[2]); li.classList.remove('is-now'); });
        void frame.offsetWidth; lis[info[2]].classList.add('is-now'); // replay the chip pop for the form that just arrived
      }
      read({ width: width + 'px' }, true);
      read({ layout: info[0], next: info[1] });
      handle.setAttribute('aria-valuemin', min); handle.setAttribute('aria-valuemax', max); handle.setAttribute('aria-valuenow', width);
      handle.setAttribute('aria-valuetext', width + ' 像素，' + info[0]);
    }
    let drag = null;
    handle.addEventListener('pointerdown', e => {
      if (e.button) return;
      e.preventDefault(); handle.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, w: width };
    });
    handle.addEventListener('pointermove', e => {
      if (!drag) return;
      userW = A.clamp(drag.w + e.clientX - drag.x, ...bounds()); layout();
    });
    const end = () => { drag = null; };
    handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
    let nudgeT = 0;
    handle.addEventListener('keydown', e => {
      const step = e.shiftKey ? 64 : 16, k = e.key;
      const next = k === 'ArrowLeft' || k === 'ArrowDown' ? width - step : k === 'ArrowRight' || k === 'ArrowUp' ? width + step : k === 'Home' ? MIN : k === 'End' ? null : undefined;
      if (next === undefined) return;
      e.preventDefault();
      frame.classList.add('is-nudging'); clearTimeout(nudgeT); nudgeT = setTimeout(() => frame.classList.remove('is-nudging'), 260);
      userW = next == null ? null : A.clamp(next, ...bounds()); layout();
    });
    new ResizeObserver(layout).observe(wrap);
    layout();
  });

  TH.apply(); // dispatch once more now that every listener above is in place
})(typeof self !== 'undefined' ? self : this);
