/* State button: idle → press → loading (narrows into a ring) → success (tick and burst) or error (shake, retry label) → idle.
   Needs core.js; styles in button.css. Wrap the button in a positioned element so the burst is not clipped.
   Markup: <span class="at-btn-wrap"><button class="at-btn" type="button"><span class="at-btn__label">发布</span>
     <svg class="at-btn__ring" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>
     <svg class="at-btn__tick" viewBox="0 0 24 24"><path d="M6 12.5l4 4L18.5 8"/></svg></button></span>
   Atelier.stateButton(btn, { action: () => Promise, labels: { error: '失败，重试' }, onState(s) }) */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  A.stateButton = function (btn, o) {
    if (btn._atButton) return btn._atButton; // already set up (hot reload, React StrictMode): reuse it instead of binding twice
    o = o || {};
    const label = btn.querySelector('.at-btn__label'), idleText = label.textContent;
    const labels = Object.assign({ error: '失败，重试' }, o.labels);
    let state = 'idle', t = 0;
    const emit = extra => { if (o.onState) o.onState(Object.assign({ state }, extra)); };
    function setState(s, text) {
      state = s; btn.dataset.state = s;
      btn.setAttribute('aria-busy', String(s === 'loading'));
      if (text != null) label.textContent = text;
      emit();
    }
    function widthTo(px, done) { // width cannot transition from auto, so pin the current width first
      btn.style.width = btn.getBoundingClientRect().width + 'px';
      void btn.offsetWidth;
      btn.style.width = px + 'px';
      clearTimeout(t);
      t = setTimeout(() => { if (done) done(); }, A.reduce.matches ? 0 : 420);
    }
    function natural() { const keep = btn.style.width; btn.style.width = ''; const w = btn.getBoundingClientRect().width; btn.style.width = keep; return w; }
    function back(text) {
      label.textContent = text;
      widthTo(natural(), () => { btn.style.width = ''; });
    }
    btn.addEventListener('click', () => {
      if (state === 'loading' || state === 'success') return;
      const h = btn.getBoundingClientRect().height;
      label.textContent = idleText;
      setState('loading');
      widthTo(h);
      const started = performance.now();
      Promise.resolve(o.action ? o.action() : null).then(() => 'success', () => 'error').then(result => {
        const wait = Math.max(0, 500 - (performance.now() - started)); // a spinner that flashes for 80 ms reads as a glitch
        setTimeout(() => {
          if (result === 'success') {
            setState('success');
            const host = btn.parentElement, hr = host.getBoundingClientRect(), br = btn.getBoundingClientRect();
            A.burst(host, br.left - hr.left + br.width / 2, br.top - hr.top + br.height / 2, { count: 12, distance: 34, colors: [A.css(btn, '--c-accent', '#888'), A.css(btn, '--c-ok', '#888')] });
            A.haptic(12);
            setTimeout(() => { setState('idle'); back(idleText); }, 1500);
          } else {
            setState('error'); back(labels.error); A.haptic([8, 40, 8]);
            setTimeout(() => { if (state === 'error') { setState('idle'); back(idleText); } }, 2600);
          }
        }, wait);
      });
    });
    return (btn._atButton = { get state() { return state; } });
  };
})(typeof self !== 'undefined' ? self : this);
