/* Capsule nav: the selected item opens to show its label while the pill glides under it. Neighbours slide aside
   from where they were (FLIP) instead of jumping. Needs core.js and segmented.js (Atelier.glider); styles in nav.css.
   Markup: <nav class="at-nav" data-mode="capsule"><span class="at-nav__glider"></span>
     <a class="at-nav__item" href="#a" aria-current="page"><svg aria-hidden="true">…</svg><span class="at-nav__label">首页</span></a> …</nav>
   Atelier.nav(navEl, { onChange(i, item), preventDefault: false }) → { select(i, quiet), setMode('capsule' | 'icons' | 'rail') } */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  A.nav = function (nav, o) {
    if (nav._atNav) return nav._atNav; // already set up (hot reload, React StrictMode): reuse it instead of binding twice
    o = o || {};
    const items = Array.from(nav.querySelectorAll('.at-nav__item'));
    const g = A.glider(nav, nav.querySelector('.at-nav__glider'));
    let cur = Math.max(0, items.findIndex(i => i.hasAttribute('aria-current')));
    function select(i, quiet) {
      if (i === cur && g.current) return;
      const before = items.map(it => it.getBoundingClientRect());
      items.forEach((it, k) => { if (k === i) it.setAttribute('aria-current', 'page'); else it.removeAttribute('aria-current'); });
      cur = i;
      const after = items.map(it => it.getBoundingClientRect()); // measure the final layout before any animation starts
      const dur = g.move(items[i]) || 0;
      if (dur && !A.reduce.matches) items.forEach((it, k) => {
        const dx = before[k].left - after[k].left, dy = before[k].top - after[k].top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) it.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: dur, easing: 'cubic-bezier(.25,.8,.25,1)' });
      });
      if (!quiet && o.onChange) o.onChange(i, items[i]);
    }
    nav.addEventListener('click', e => {
      const it = e.target.closest('.at-nav__item');
      if (!it) return;
      if (o.preventDefault) e.preventDefault();
      select(items.indexOf(it));
    });
    items.forEach(it => { it.setAttribute('aria-label', it.textContent.trim()); });
    g.move(items[cur], true);
    return (nav._atNav = {
      select,
      setMode(m) { if (nav.dataset.mode === m) return; nav.dataset.mode = m; g.move(items[cur], true); },
      get index() { return cur; }
    });
  };
})(typeof self !== 'undefined' ? self : this);
