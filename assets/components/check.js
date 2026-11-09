/* Done check: press shrinks the box, the tick draws itself, the label strikes through and a small burst marks the moment.
   Unchecking reverses quietly, without a burst. Needs core.js; styles in check.css.
   Markup: <label class="at-check"><input type="checkbox"><span class="at-check__box"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span><span class="at-check__text">写周报</span></label>
   Atelier.checks(listEl, { onChange(done, total, input) }) */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  A.checks = function (list, o) {
    if (list._atChecks) return list._atChecks; // already set up (hot reload, React StrictMode): reuse it instead of binding twice
    o = o || {};
    const inputs = () => Array.from(list.querySelectorAll('.at-check input'));
    list.addEventListener('change', e => {
      const input = e.target.closest('.at-check input');
      if (!input) return;
      const label = input.closest('.at-check'), box = label.querySelector('.at-check__box');
      label.classList.toggle('is-done', input.checked);
      if (input.checked) {
        const lr = label.getBoundingClientRect(), br = box.getBoundingClientRect();
        A.burst(label, br.left - lr.left + br.width / 2, br.top - lr.top + br.height / 2, {
          count: 10, distance: 26, colors: [A.css(label, '--c-accent', '#888'), A.css(label, '--c-spice', '#888'), A.css(label, '--c-ok', '#888')]
        });
        A.haptic(10);
      }
      const all = inputs();
      if (o.onChange) o.onChange(all.filter(i => i.checked).length, all.length, input);
    });
    inputs().forEach(i => i.closest('.at-check').classList.toggle('is-done', i.checked));
    return (list._atChecks = { get done() { return inputs().filter(i => i.checked).length; } });
  };
})(typeof self !== 'undefined' ? self : this);
