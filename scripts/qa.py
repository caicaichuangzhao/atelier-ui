#!/usr/bin/env python3
"""Page QA for atelier-ui: open a page at several widths, save screenshots, and report what a design review would flag.

  python scripts/qa.py <url-or-file.html> [--widths 375,768,1280] [--out qa-out] [--full] [--dark] [--reduce]
                       [--wait 1200] [--eval "JS to run after load"] [--tag name]

Per width: console errors and page exceptions, failed requests, content pushed past the viewport edge (also when
body clips it), tap targets under 44px on touch layouts (24px with a mouse; hit areas widened with ::before count),
text under 11px, images without alt, controls without a name, fonts that failed to load.
Widths under 1024 run as touch devices (coarse pointer, no hover), so hover-only UI shows up as missing.
Needs Python Playwright: pip install playwright && python -m playwright install chromium (an installed Chrome or Edge
also works). Exit code 1 when errors, failed requests or overflow are found, so it can gate a fix-and-recheck loop.
"""
import argparse, json, pathlib, sys

PROBE = r"""() => {
  const W = innerWidth, touch = matchMedia('(pointer: coarse)').matches, MIN = touch ? 44 : 24, cs = el => getComputedStyle(el);
  const desc = el => {
    const s = el.tagName.toLowerCase() + (el.id ? '#' + el.id : el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
    const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    return t ? s + ' "' + t + '"' : s;
  };
  const visible = el => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    return el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : cs(el).visibility !== 'hidden';
  };
  const shown = el => visible(el) && !el.closest('[aria-hidden="true"],[inert]');
  // content past the viewport edge. Invisible boxes count too (they still widen the scroll area); fixed boxes and
  // anything inside a clipping ancestor do not. Clipping by html/body only hides the bug, so it is not an exemption.
  const exempt = el => {
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const s = cs(a);
      if (s.position === 'fixed' || (a !== el && s.overflowX !== 'visible')) return true;
    }
    return false;
  };
  const over = [];
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect(), d = Math.max(r.right - W, -r.left);
    if (d > 2 && r.width && r.height && !exempt(el)) over.push([Math.round(d), desc(el)]);
  }
  over.sort((a, b) => b[0] - a[0]);
  // tap targets: anything under MIN is hit-tested, so an invisible ::before that widens the target passes
  const SEL = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=radio],[role=checkbox],[role=switch],[role=slider],[role=spinbutton],[tabindex="0"],' +
    'label:has(input[type=checkbox]),label:has(input[type=radio])'; // custom switches hide the input; the label is what gets tapped
  const small = [], y0 = scrollY;
  for (const el of document.querySelectorAll(SEL)) {
    if (!shown(el) || (el.tagName === 'A' && cs(el).display === 'inline')) continue; // links inside running text are exempt
    if (cs(el).pointerEvents === 'none') continue; // ignores the pointer: a tap reaches what is under it, so its size is not the target
    let r = el.getBoundingClientRect();
    if (r.width >= MIN - 0.5 && r.height >= MIN - 0.5) continue;
    const lab = el.matches('input') && el.closest('label'); // a tap anywhere on the wrapping label toggles the input
    if (lab) { const lr = lab.getBoundingClientRect(); if (lr.width >= MIN - 0.5 && lr.height >= MIN - 0.5) continue; }
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    r = el.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= W) continue; // parked off-canvas (skip links, drawers)
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, h = MIN / 2 - 1;
    const ok = [[cx, cy - h], [cx, cy + h], [cx - h, cy], [cx + h, cy]].every(([x, y]) => { const t = document.elementFromPoint(x, y); return t && (t === el || el.contains(t)); });
    if (!ok) small.push(Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + desc(el));
  }
  scrollTo({ top: y0, behavior: 'instant' });
  // text under 11px that is actually shown
  const tiny = new Map(), walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const el = n.parentElement;
    if (!el || tiny.has(el) || !n.data.trim()) continue;
    const fs = parseFloat(cs(el).fontSize);
    if (fs < 11 && visible(el)) tiny.set(el, fs);
  }
  // controls a screen reader would announce without a name
  const unnamed = [];
  for (const el of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=link],[role=radio],[role=slider],[role=switch],[role=checkbox]')) {
    if (el.closest('[aria-hidden="true"]')) continue;
    const by = el.getAttribute('aria-labelledby');
    const name = el.getAttribute('aria-label') || (by ? by.split(/\s+/).map(id => (document.getElementById(id) || {}).textContent || '').join(' ') : '') ||
      el.getAttribute('title') || (el.labels && el.labels.length ? el.labels[0].textContent : '') || el.getAttribute('placeholder') ||
      el.textContent || (el.querySelector('img[alt]') || {}).alt || '';
    if (!name.trim()) unnamed.push(desc(el));
  }
  return {
    width: W, touch, minTarget: MIN, docScrollWidth: document.documentElement.scrollWidth,
    overflowCount: over.length, overflow: over.slice(0, 12).map(([d, s]) => d + 'px ' + s),
    smallTargets: small, tinyCount: tiny.size, tinyText: [...tiny].slice(0, 20).map(([el, fs]) => fs + 'px ' + desc(el)),
    noAlt: [...document.images].filter(i => !i.hasAttribute('alt')).map(desc), unnamed,
    fontErrors: [...document.fonts].filter(f => f.status === 'error').map(f => f.family + ' ' + f.weight)
  };
}"""
HEIGHT = {360: 780, 375: 812, 390: 844, 414: 896, 768: 1024, 820: 1180, 1024: 768, 1280: 800, 1440: 900, 1920: 1080}

def launch(pw):
    err = None
    for kw in ({}, {'channel': 'chrome'}, {'channel': 'msedge'}):
        try:
            return pw.chromium.launch(**kw)
        except Exception as e:  # missing bundled Chromium: try installed browsers
            err = e
    sys.exit('No browser found. Run: python -m playwright install chromium\n' + str(err).splitlines()[0])


def target(s):
    if '://' in s:
        return s
    p = pathlib.Path(s).resolve()
    if not p.exists():
        sys.exit('Not found: ' + s)
    return p.as_uri()


def height(w):
    return HEIGHT.get(w) or (round(w * 2.1) if w < 600 else round(w * 1.3) if w < 1024 else max(720, round(w * 0.6)))


def main():
    ap = argparse.ArgumentParser(description='Screenshot a page at several widths and report layout and accessibility problems.')
    ap.add_argument('url', help='http(s) URL or a local .html file')
    ap.add_argument('--widths', default='375,768,1280', help='comma-separated viewport widths')
    ap.add_argument('--out', default='qa-out', help='folder for screenshots and report.json')
    ap.add_argument('--full', action='store_true', help='full-page screenshots instead of the first screen')
    ap.add_argument('--dark', action='store_true', help='emulate prefers-color-scheme: dark')
    ap.add_argument('--reduce', action='store_true', help='emulate prefers-reduced-motion: reduce')
    ap.add_argument('--wait', type=int, default=1200, help='ms to wait after load for fonts and entrance motion')
    ap.add_argument('--eval', default='', help='JS run after load, e.g. to open a menu or switch a theme')
    ap.add_argument('--tag', default='', help='prefix for screenshot names, to keep several runs apart')
    a = ap.parse_args()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit('Needs Playwright: pip install playwright && python -m playwright install chromium')
    if hasattr(sys.stdout, 'reconfigure'):  # never crash on page text the console cannot print; pipes get UTF-8
        sys.stdout.reconfigure(errors='replace', **({} if sys.stdout.isatty() else {'encoding': 'utf-8'}))
    url, out = target(a.url), pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    widths = [int(w) for w in a.widths.split(',') if w.strip()]
    tag = (a.tag + '-') if a.tag else ''
    report, bad = {'url': url, 'dark': a.dark, 'reduce': a.reduce, 'widths': []}, False
    with sync_playwright() as pw:
        browser = launch(pw)
        suffix = ('-dark' if a.dark else '') + ('-reduce' if a.reduce else '')
        for w in widths:
            touch = w < 1024  # phones and tablets: coarse pointer, no hover
            ctx = browser.new_context(viewport={'width': w, 'height': height(w)}, device_scale_factor=2 if touch else 1,
                                      is_mobile=touch, has_touch=touch, color_scheme='dark' if a.dark else 'light',
                                      reduced_motion='reduce' if a.reduce else 'no-preference')
            page = ctx.new_page()
            logs, failed = [], []
            page.on('console', lambda m: m.type in ('error', 'warning') and not m.text.startswith('Failed to load resource')
                    and logs.append(m.type + ': ' + m.text[:300]))  # load failures are listed with their URL below
            page.on('pageerror', lambda e: logs.append('exception: ' + str(e)[:300]))
            page.on('requestfailed', lambda q: failed.append((q.failure or 'failed') + ' ' + q.url[:200]))
            page.on('response', lambda q: q.status >= 400 and not q.url.endswith('/favicon.ico')
                    and failed.append(str(q.status) + ' ' + q.url[:200]))
            try:
                page.goto(url, wait_until='load', timeout=30000)
            except Exception as e:
                logs.append('exception: navigation ' + str(e).splitlines()[0])
            page.wait_for_timeout(a.wait)
            # scroll through once so scroll-triggered reveals and lazy images settle, then back to the top
            page.evaluate("""async () => {
              const go = y => scrollTo({ top: y, behavior: 'instant' }), step = innerHeight * 0.8;
              for (let y = 0; y < document.documentElement.scrollHeight; y += step) { go(y); await new Promise(r => setTimeout(r, 60)); }
              go(0);
            }""")
            page.wait_for_timeout(700)
            if a.eval:
                try:
                    page.evaluate(a.eval)
                    page.wait_for_timeout(600)
                except Exception as e:
                    logs.append('exception: --eval ' + str(e).splitlines()[0])
            shot = out / f'{tag}{w}{suffix}.png'
            r = page.evaluate(PROBE)  # probe first: a full-page screenshot turns touch emulation off for the rest of the page
            page.screenshot(path=str(shot), full_page=a.full)
            errors = [l for l in logs if not l.startswith('warning')]
            sideways = r['docScrollWidth'] > w
            r.update(screenshot=shot.name, console=logs, failedRequests=failed, pageScrollsSideways=sideways)
            report['widths'].append(r)
            issue = bool(errors or failed or r['overflowCount'] or sideways)
            bad |= issue
            print(f"{w}px {'touch' if touch else 'mouse'}: {'FAIL' if issue else 'ok'} | errors {len(errors)}, "
                  f"failed requests {len(failed)}, overflow {r['overflowCount']}{' (page scrolls sideways)' if sideways else ''}, "
                  f"small targets {len(r['smallTargets'])} (<{r['minTarget']}px), tiny text {r['tinyCount']}, "
                  f"unnamed {len(r['unnamed'])}, images without alt {len(r['noAlt'])}, font errors {len(r['fontErrors'])} -> {shot.name}")
            rows = (('console', logs, len(logs)), ('request', failed, len(failed)), ('overflow', r['overflow'], r['overflowCount']),
                    ('target', r['smallTargets'], len(r['smallTargets'])), ('tiny', r['tinyText'], r['tinyCount']),
                    ('unnamed', r['unnamed'], len(r['unnamed'])), ('alt', r['noAlt'], len(r['noAlt'])),
                    ('font', r['fontErrors'], len(r['fontErrors'])))
            for label, items, total in rows:
                for s in items[:6]:
                    print(f'   {label}: {s}')
                if total > 6:
                    print(f'   {label}: ... +{total - 6} more')
            ctx.close()
        browser.close()
    (out / f'{tag}report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Report:', (out / f'{tag}report.json').resolve())
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
