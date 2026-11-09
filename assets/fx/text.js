/* Text effects. Needs core.js; odometer styles live in text.css.
   Atelier.scramble(el, text?, { duration: 700 })  characters cycle through glyphs and lock left to right.
     Use on short mono or Latin labels; CJK body text should fade instead. Returns a Promise.
   Atelier.odometer(el, 1234.5, { format })        digits roll to the new value; screen readers get the plain value. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};

  A.scramble = function (el, text, o) {
    o = o || {};
    const final = text == null ? (el.dataset.text || el.textContent) : String(text);
    el.dataset.text = final;
    cancelAnimationFrame(el._atScramble || 0);
    if (A.reduce.matches) { el.textContent = final; return Promise.resolve(); }
    const glyphs = o.glyphs || 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=/<>', dur = o.duration || 700, t0 = performance.now(), n = final.length;
    return new Promise(done => {
      const step = t => {
        const p = Math.min(1, (t - t0) / dur);
        let out = '';
        for (let i = 0; i < n; i++) {
          const ch = final[i];
          out += ch === ' ' || p >= 0.3 + (0.7 * i) / n ? ch : glyphs[(Math.random() * glyphs.length) | 0];
        }
        el.textContent = out;
        if (p < 1) el._atScramble = requestAnimationFrame(step); else done();
      };
      el._atScramble = requestAnimationFrame(step);
    });
  };

  A.odometer = function (el, value, o) {
    o = o || {};
    const str = typeof value === 'number' ? (o.format ? o.format(value) : value.toLocaleString('en-US')) : String(value);
    let sr = el.querySelector(':scope > .at-sr'), vis = el.querySelector(':scope > .at-odo__vis');
    if (!vis) {
      el.textContent = ''; el.classList.add('at-odo');
      sr = document.createElement('span'); sr.className = 'at-sr';
      vis = document.createElement('span'); vis.className = 'at-odo__vis'; vis.setAttribute('aria-hidden', 'true');
      el.append(sr, vis);
    }
    sr.textContent = str;
    const shape = str.replace(/\d/g, '0');
    if (vis.dataset.shape !== shape) { // the layout changed (more digits, new separators): rebuild columns, start from 0
      vis.dataset.shape = shape; vis.textContent = '';
      for (const ch of str) {
        const s = document.createElement('span');
        if (/\d/.test(ch)) { s.className = 'at-odo__col'; const strip = document.createElement('span'); strip.className = 'at-odo__strip'; strip.textContent = '0\n1\n2\n3\n4\n5\n6\n7\n8\n9'; s.appendChild(strip); }
        else { s.className = 'at-odo__sep'; s.textContent = ch; }
        vis.appendChild(s);
      }
      void vis.offsetWidth;
    }
    const strips = vis.querySelectorAll('.at-odo__strip'), stagger = o.stagger == null ? 45 : o.stagger;
    let k = 0;
    for (const ch of str) if (/\d/.test(ch)) {
      const s = strips[k];
      s.style.transitionDelay = (strips.length - 1 - k) * stagger + 'ms'; // the ones digit moves first
      s.style.transform = 'translateY(' + -Number(ch) * 10 + '%)';
      k++;
    }
  };
})(typeof self !== 'undefined' ? self : this);
