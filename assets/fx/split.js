/* Text motion. Needs core.js; styles in split.css.
   Atelier.split(el, { by: 'char' | 'word' | 'line', stagger: 40, cap: 420, when: 'view' | 'manual' })
     Wraps the text of el in pieces. Put data-split="rise | blur | mask | pop" on el to pick the entrance; it plays
     once when el enters the viewport (when: 'view') or on api.play(). Inline markup (<b>, <em>, <a>) survives.
     Delay per piece = min(i × stagger, cap), so long lines never take longer than cap + one piece.
     Screen readers get the plain sentence from a visually hidden copy; the pieces are aria-hidden.
     Returns { play(), reset(), revert(), pieces, total }. by: 'line' measures the lines, then puts the original
     text back after the entrance so it reflows freely on resize (inline markup is flattened only while it plays).
   Atelier.stream(el, text, { cps: 60, chunk: [1, 4], caret: true, onToken(sofar), onDone(full) })
     Types text the way a streaming model reply arrives: uneven chunks, short pauses after punctuation, a caret.
     Returns { done: Promise<boolean finished>, stop() }. stop() keeps what has arrived and ends at once. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  const CJK = /[⺀-鿿豈-﫿＀-￯　-〿]/;
  const wordSeg = root.Intl && Intl.Segmenter ? new Intl.Segmenter('zh', { granularity: 'word' }) : null;

  /* One text run → tokens. Spaces stay as plain text so lines can still wrap there. */
  function tokens(text, by) {
    const out = [];
    text.split(/(\s+)/).forEach(run => {
      if (!run) return;
      if (/^\s+$/.test(run)) { out.push({ space: run }); return; }
      if (!CJK.test(run)) { out.push({ word: run }); return; }
      // CJK: chars for 'char' and 'line'; real words (词) for 'word' when the browser can segment them
      if (by === 'word' && wordSeg) for (const s of wordSeg.segment(run)) out.push({ word: s.segment, cjk: true });
      else for (const ch of run) out.push({ word: ch, cjk: true });
    });
    return out;
  }
  function piece(text) {
    const p = document.createElement('span'), inner = document.createElement('span');
    p.className = 'at-split__p'; inner.className = 'at-split__in'; inner.textContent = text;
    p.appendChild(inner);
    return p;
  }

  A.split = function (el, o) {
    if (el._atSplit) return el._atSplit;
    o = Object.assign({ by: 'char', stagger: 40, cap: 420, when: 'view' }, o);
    const original = Array.from(el.childNodes).map(n => n.cloneNode(true));
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    let pieces = [], io = null, ro = null, played = false, revertT = 0;

    function build() {
      el.textContent = '';
      original.forEach(n => el.appendChild(n.cloneNode(true)));
      pieces = [];
      const walk = node => {
        Array.from(node.childNodes).forEach(child => {
          if (child.nodeType === 1) { walk(child); return; }
          if (child.nodeType !== 3 || !child.data) return;
          const frag = document.createDocumentFragment();
          tokens(child.data, o.by).forEach(t => {
            if (t.space) { frag.appendChild(document.createTextNode(t.space)); return; }
            if (o.by === 'char' && !t.cjk && t.word.length > 1) { // a Latin word: chars inside one unbreakable wrapper
              const w = document.createElement('span');
              w.className = 'at-split__w';
              for (const ch of t.word) { const p = piece(ch); w.appendChild(p); pieces.push(p); }
              frag.appendChild(w);
            } else { const p = piece(t.word); frag.appendChild(p); pieces.push(p); }
          });
          child.replaceWith(frag);
        });
      };
      walk(el);
      if (o.by === 'line') toLines();
      pieces.forEach((p, i) => p.style.setProperty('--at-delay', Math.min(i * o.stagger, o.cap) + 'ms'));
      el.classList.add('at-split');
      Array.from(el.children).forEach(c => c.setAttribute('aria-hidden', 'true'));
      const sr = document.createElement('span'); // aria-label is not allowed on every element; a hidden copy works everywhere
      sr.className = 'at-sr'; sr.textContent = label;
      el.prepend(sr);
    }
    /* group the word pieces by their top edge; each line becomes one clipped piece */
    function toLines() {
      const words = pieces, rows = [];
      let top = null;
      words.forEach(p => {
        const t = Math.round(p.offsetTop);
        if (top === null || Math.abs(t - top) > 2) { rows.push([]); top = t; }
        rows[rows.length - 1].push(p);
      });
      el.textContent = '';
      pieces = rows.map(row => {
        const line = piece('');
        line.classList.add('is-line');
        row.forEach((p, k) => { // keep the spacing between Latin words inside a line
          if (k && !CJK.test(p.textContent) && !CJK.test(row[k - 1].textContent)) line.firstChild.appendChild(document.createTextNode(' '));
          line.firstChild.appendChild(document.createTextNode(p.textContent));
        });
        el.appendChild(line);
        return line;
      });
    }
    function revert() {
      clearTimeout(revertT);
      el.textContent = '';
      original.forEach(n => el.appendChild(n.cloneNode(true)));
      el.classList.remove('at-split');
      pieces = [];
    }
    function total() { return Math.min((pieces.length - 1) * o.stagger, o.cap) + (o.by === 'line' ? 900 : 700); }
    function play() {
      if (!pieces.length) build();
      played = true;
      if (io) { io.disconnect(); io = null; }
      requestAnimationFrame(() => el.classList.add('is-in'));
      if (o.by === 'line') { clearTimeout(revertT); revertT = setTimeout(revert, A.reduce.matches ? 0 : total() + 80); }
    }
    function reset() {
      clearTimeout(revertT);
      el.classList.add('is-reset'); el.classList.remove('is-in');
      build();
      void el.offsetWidth;
      el.classList.remove('is-reset');
      played = false;
    }

    build();
    if (A.reduce.matches) el.classList.add('is-in');
    else if (o.when === 'view' && 'IntersectionObserver' in root) {
      io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) play(); }, { rootMargin: '0px 0px -8% 0px' });
      io.observe(el);
    }
    if (o.by === 'line' && 'ResizeObserver' in root) { // before it plays, a new width means new lines
      let w = el.clientWidth;
      ro = new ResizeObserver(() => { if (!played && Math.abs(el.clientWidth - w) > 1) { w = el.clientWidth; build(); } });
      ro.observe(el);
    }
    return (el._atSplit = { play, reset, revert, get pieces() { return pieces; }, get total() { return total(); } });
  };

  A.stream = function (el, text, o) {
    o = Object.assign({ cps: 60, chunk: [1, 4], caret: true }, o);
    clearTimeout(el._atStreamT);
    if (el._atStream) el._atStream.stop();
    el.classList.add('at-stream');
    el.textContent = '';
    const out = document.createTextNode(''), caret = document.createElement('span');
    caret.className = 'at-caret'; caret.setAttribute('aria-hidden', 'true');
    el.append(out);
    if (o.caret) el.append(caret);
    el.setAttribute('aria-busy', 'true');
    let i = 0, t = 0, finish;
    const done = new Promise(r => { finish = r; });
    function end(full) {
      clearTimeout(t);
      el.setAttribute('aria-busy', 'false');
      caret.classList.add('is-idle');
      el._atStreamT = setTimeout(() => caret.remove(), 1400);
      el._atStream = null;
      if (o.onDone) o.onDone(out.data, full);
      finish(full);
    }
    function step() {
      const [a, b] = o.chunk, n = a + Math.floor(Math.random() * (b - a + 1));
      const next = text.slice(i, i + n);
      i += next.length;
      out.data += next;
      if (o.onToken) o.onToken(out.data);
      if (i >= text.length) { end(true); return; }
      const pause = /[，。！？；：,.!?;:\n]$/.test(next) ? 140 + Math.random() * 120 : 0;
      t = setTimeout(step, (next.length / o.cps) * 1000 * (0.6 + Math.random() * 0.8) + pause);
    }
    const api = { done, stop() { if (el._atStream === api) end(false); } };
    el._atStream = api;
    if (A.reduce.matches) { out.data = text; if (o.onToken) o.onToken(text); end(true); }
    else t = setTimeout(step, 180 + Math.random() * 160); // time to first token: a beat, not instant
    return api;
  };
})(typeof self !== 'undefined' ? self : this);
