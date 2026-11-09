/* Info pill: hovering the i shows a hint bubble; clicking makes the button itself grow to the right into a pill
   that holds the content and a copy button. One open at a time; Esc or a click outside closes it. Needs core.js.
   Markup:
   <span class="at-ipill">
     <span class="at-ipill__shell">
       <button class="at-ipill__btn" type="button" aria-expanded="false" aria-label="查看回调地址">i</button>
       <span class="at-ipill__body"><span class="at-ipill__label">回调</span><code>https://…</code>
         <button class="at-ipill__copy" type="button" aria-label="复制"><i class="is-idle">⧉</i><i class="is-done">✓</i></button></span>
     </span>
     <span class="at-ipill__tip" aria-hidden="true">点击查看回调地址</span>
   </span>
   Atelier.ipill.init() once per page; listen for 'at-ipill' events ({ detail: { open, copied } }) to sync readouts. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  let openOne = null, inited = false;
  const parts = rv => ({ rv, shell: rv.querySelector('.at-ipill__shell'), btn: rv.querySelector('.at-ipill__btn'), body: rv.querySelector('.at-ipill__body') });
  const emit = (rv, d) => rv.dispatchEvent(new CustomEvent('at-ipill', { bubbles: true, detail: d }));

  // open width = button + natural content width, stopping 16px before the edge of the clipping box
  function fit(p) {
    p.body.style.width = '';
    const bw = p.btn.offsetWidth, natural = bw + p.body.scrollWidth;
    const clip = p.rv.closest('[data-ipill-bound]'), right = clip ? clip.getBoundingClientRect().right : document.documentElement.clientWidth;
    const room = right - p.rv.getBoundingClientRect().left - 16;
    const w = Math.max(Math.min(160, natural), Math.min(natural, room));
    if (w < natural) p.body.style.width = (w - bw) + 'px';
    p.shell.style.width = w + 'px';
  }
  function setOpen(rv, open) {
    const p = parts(rv);
    clearTimeout(p.shell._atReset);
    p.btn.setAttribute('aria-expanded', String(open));
    if (open) {
      if (openOne && openOne !== rv) setOpen(openOne, false);
      openOne = rv; rv.classList.add('is-open'); fit(p);
    } else {
      if (openOne === rv) openOne = null;
      rv.classList.remove('is-open');
      p.shell.style.width = ''; // the CSS transition shrinks it back to the circle
      p.shell._atReset = setTimeout(() => { p.body.style.width = ''; }, 450);
    }
    emit(rv, { open });
  }
  function copy(btn) {
    const rv = btn.closest('.at-ipill'), code = rv.querySelector('code');
    A.copy(code.dataset.copy || code.textContent).then(ok => {
      A.toast(ok ? '已复制到剪贴板' : '复制失败，请手动选择文本', ok ? '' : 'bad');
      if (!ok) return;
      btn.classList.add('is-copied'); A.haptic(6);
      setTimeout(() => btn.classList.remove('is-copied'), 1400);
      emit(rv, { open: true, copied: true });
    });
  }
  A.ipill = {
    open: rv => setOpen(rv, true), close: rv => setOpen(rv, false),
    init() {
      if (inited) return; inited = true;
      addEventListener('resize', () => { if (openOne) fit(parts(openOne)); });
      document.addEventListener('click', e => {
        const btn = e.target.closest('.at-ipill__btn'), cp = e.target.closest('.at-ipill__copy');
        if (btn) { const rv = btn.closest('.at-ipill'); setOpen(rv, !rv.classList.contains('is-open')); return; }
        if (cp) { copy(cp); return; }
        if (openOne && !openOne.contains(e.target)) setOpen(openOne, false);
      });
      document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || !openOne) return;
        const rv = openOne; setOpen(rv, false); rv.querySelector('.at-ipill__btn').focus();
      });
    }
  };
})(typeof self !== 'undefined' ? self : this);
