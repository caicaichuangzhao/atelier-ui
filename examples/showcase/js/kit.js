/* Showcase helpers shared by specimens.js and main.js: live readouts, step chips, the prompt pill and mode toggle.
   These are page plumbing, not part of the reusable assets. */
(function (root) {
  'use strict';
  const A = root.Atelier, S = A.showcase = {};

  /* Live readout: read({ key: value }, quiet). A changed value flashes in the accent color, at most every 420 ms,
     so a drag that updates every frame does not strobe. Values written in the first 800 ms never flash. */
  S.readout = function (dl) {
    const cells = {}, born = performance.now();
    dl.querySelectorAll('dd[data-k]').forEach(d => { cells[d.dataset.k] = d; });
    return function (vals, quiet) {
      const now = performance.now();
      for (const k in vals) {
        const d = cells[k], v = String(vals[k]);
        if (!d || d.textContent === v) continue;
        d.textContent = v;
        if (quiet || now - born < 800 || A.reduce.matches || !d.animate || now - (d._f || 0) < 420) continue;
        d._f = now;
        if (d._a) d._a.cancel();
        d._a = d.animate([{ color: A.css(d, '--c-accent-strong', 'currentColor') }, { color: getComputedStyle(d).color }], { duration: 600, easing: 'ease-out' });
      }
    };
  };

  /* Step chips: each stage of an interaction lights its chip; a new interaction calls reset() first. */
  S.steps = function (ol) {
    const lis = Array.from(ol.children);
    let timers = [], fadeT = 0;
    const off = () => lis.forEach(li => li.classList.remove('is-on', 'is-now'));
    const mark = i => {
      const li = lis[i];
      if (!li || li.classList.contains('is-on')) return;
      li.classList.add('is-on', 'is-now');
      setTimeout(() => li.classList.remove('is-now'), 400);
    };
    const api = {
      mark,
      on(n) { for (let i = 0; i < n; i++) mark(i); },
      only(i) { lis.forEach((li, k) => { if (k !== i) li.classList.remove('is-on', 'is-now'); }); mark(i); },
      fade(ms) { clearTimeout(fadeT); fadeT = setTimeout(off, ms); },
      keep() { clearTimeout(fadeT); },
      later(fn, ms) { timers.push(setTimeout(fn, ms)); },
      reset() { timers.forEach(clearTimeout); timers = []; clearTimeout(fadeT); off(); },
      run(times, hold) { api.reset(); times.forEach((ms, i) => api.later(() => mark(i), ms)); api.fade(times[times.length - 1] + (hold || 1400)); },
      get lit() { return lis.filter(li => li.classList.contains('is-on')).length; }
    };
    return api;
  };

  /* The card's prompt pill, built with the same markup as the info pill component. */
  S.pill = function (text, title) {
    const rv = document.createElement('span');
    rv.className = 'at-ipill';
    rv.innerHTML = '<span class="at-ipill__shell"><button class="at-ipill__btn" type="button" aria-expanded="false">i</button>' +
      '<span class="at-ipill__body"><span class="at-ipill__label">AI 描述词</span><code></code>' +
      '<button class="at-ipill__copy" type="button"><i class="is-idle">⧉</i><i class="is-done">✓</i></button></span></span>' +
      '<span class="at-ipill__tip" aria-hidden="true">点击查看 AI 描述词</span>';
    rv.querySelector('.at-ipill__btn').setAttribute('aria-label', '查看「' + title + '」的 AI 描述词');
    rv.querySelector('.at-ipill__copy').setAttribute('aria-label', '复制 AI 描述词');
    const code = rv.querySelector('code');
    code.textContent = text; code.title = text;
    return rv;
  };

  /* One specimen card: builds the foot (prompt pill + step chips) and returns its parts.
     data-steps-touch replaces data-steps without a fine pointer, so touch never shows a hover step that cannot happen. */
  S.card = function (id) {
    const el = document.getElementById(id), foot = el.querySelector('.sc-card__foot');
    foot.appendChild(S.pill(el.dataset.prompt || '', el.querySelector('h3').textContent));
    const ol = document.createElement('ol');
    ol.className = 'sc-steps'; ol.setAttribute('aria-hidden', 'true');
    const steps = (!A.fine.matches && el.dataset.stepsTouch) || el.dataset.steps || '';
    steps.split('|').filter(Boolean).forEach(t => { const li = document.createElement('li'); li.textContent = t; ol.appendChild(li); });
    foot.appendChild(ol);
    return { el, stage: el.querySelector('.sc-card__stage'), read: S.readout(el.querySelector('.sc-readout')), steps: S.steps(ol) };
  };

  /* Flip light/dark with a circular reveal from (x, y). */
  S.toggleMode = function (x, y) {
    const TH = A.themes, next = TH.mode() === 'dark' ? 'light' : 'dark';
    return A.transition(() => TH.apply({ mode: next }), x, y);
  };

  /* Run one demo; a failure is logged and the rest of the page keeps working. */
  S.safe = function (name, fn) { try { fn(); } catch (e) { console.error('[showcase] ' + name, e); } };
})(typeof self !== 'undefined' ? self : this);
