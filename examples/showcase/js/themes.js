/* Four product positionings and the style each one derives. The colors are not stored: palette.js derives them
   from hue and chroma, so the hue slider can re-derive a whole theme live.
   Load in <head> after palette.js so the first paint already has the right colors. */
(function (root) {
  'use strict';
  const A = root.Atelier = root.Atelier || {};
  const T = {
    ink: {
      glyph: '墨', name: '墨 · Ink', role: '编辑出版 / 品牌长文', natural: 'light',
      brief: '安静、有分量，像一页排好的纸。少装饰，靠字和留白说话。',
      dials: { 温度: 4, 能量: 2, 密度: 3, 圆润: 1, 景深: 1, 动势: 2, 装饰: 2 },
      spec: { 字体: 'Fraunces + 思源宋体 · 正文系统黑体', 圆角: '3 / 6 / 8px，近乎直角', 景深: '细线分层，几乎没有阴影', 动效: 'calm 弹簧，无回弹', 特效: '墨点粒子 + 笔锋拖尾' },
      palette: { light: { neutralHue: 70, tint: 0.014, accentHue: 32, chroma: 0.17, spiceHue: 262, spiceChroma: 0.08 },
                 dark: { neutralHue: 60, tint: 0.012, accentHue: 32, chroma: 0.16, spiceHue: 262, spiceChroma: 0.08 } },
      particles: { font: '900 {size}px Fraunces, "Noto Serif SC", "Songti SC", "SimSun", serif', paint: 'ink', shape: 'square', twinkle: 0 },
      ribbon: { light: 'brush', dark: 'brush', width: 16 }
    },
    night: {
      glyph: '夜', name: '夜航 · Night', role: '开发者平台 / API 控制台', natural: 'dark',
      brief: '冷静、精确、信息密。暗底上只让关键数据发光。',
      dials: { 温度: 1, 能量: 4, 密度: 5, 圆润: 2, 景深: 3, 动势: 4, 装饰: 3 },
      spec: { 字体: 'Geist + Geist Mono · 中文系统黑体', 圆角: '6 / 12 / 16px', 景深: '暗面靠亮边和辉光分层', 动效: 'snappy 弹簧，轻微回弹', 特效: '辉光粒子 + 光迹拖尾' },
      palette: { dark: { neutralHue: 255, tint: 0.012, accentHue: 125, chroma: 0.19, spiceHue: 295, spiceChroma: 0.14 },
                 light: { neutralHue: 255, tint: 0.006, accentHue: 135, chroma: 0.16, accentL: 0.58, spiceHue: 295, spiceChroma: 0.12 } },
      particles: { font: '800 {size}px Geist, "PingFang SC", "Microsoft YaHei", sans-serif', paint: 'gradient', shape: 'square', twinkle: 6 },
      ribbon: { light: 'brush', dark: 'glow', width: 10 }
    },
    dango: {
      glyph: '团', name: '团子 · Dango', role: '习惯打卡 / 年轻社区', natural: 'light',
      brief: '圆、软、会弹。每次完成都值得一点小庆祝。',
      dials: { 温度: 5, 能量: 5, 密度: 2, 圆润: 5, 景深: 2, 动势: 5, 装饰: 4 },
      spec: { 字体: 'Fredoka + 站酷快乐体 · 正文系统黑体', 圆角: '胶囊按钮 · 卡片 24 / 面板 30px', 景深: '粗描边 + 实色投影，按下即贴平', 动效: 'bouncy 弹簧，明显回弹', 特效: '彩纸粒子 + 团子串拖尾' },
      palette: { light: { neutralHue: 80, tint: 0.02, accentHue: 355, chroma: 0.15, accentL: 0.74, spiceHue: 140, spiceChroma: 0.11 },
                 dark: { neutralHue: 300, tint: 0.02, accentHue: 355, chroma: 0.15, accentL: 0.76, spiceHue: 140, spiceChroma: 0.11 } },
      particles: { font: '400 {size}px "ZCOOL KuaiLe", Fredoka, "PingFang SC", sans-serif', paint: 'confetti', shape: 'round', twinkle: 0 },
      ribbon: { light: 'beads', dark: 'beads', width: 18 }
    },
    porcelain: {
      glyph: '瓷', name: '瓷 · Porcelain', role: '智能硬件 / 空间应用', natural: 'light',
      brief: '通透、克制、精密。玻璃一样的层次，动得轻但很准。',
      dials: { 温度: 2, 能量: 2, 密度: 2, 圆润: 4, 景深: 4, 动势: 3, 装饰: 1 },
      spec: { 字体: '系统字体（SF / Segoe / 苹方 / 雅黑）', 圆角: '12 / 22 / 28px，同心圆角', 景深: '磨砂玻璃 + 高光描边', 动效: 'gentle 弹簧，几乎无回弹', 特效: '渐变粒子 + 柔光拖尾' },
      palette: { light: { neutralHue: 250, tint: 0.006, accentHue: 262, chroma: 0.17, spiceHue: 178, spiceChroma: 0.07 },
                 dark: { neutralHue: 250, tint: 0.008, accentHue: 262, chroma: 0.16, spiceHue: 178, spiceChroma: 0.08 } },
      particles: { font: '700 {size}px system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif', paint: 'gradient', shape: 'round', twinkle: 0 },
      ribbon: { light: 'brush', dark: 'glow', width: 12 }
    }
  };

  const state = { theme: 'ink', mode: null, hue: null };
  try { Object.assign(state, JSON.parse(localStorage.getItem('atelier-showcase') || '{}')); } catch (e) { /* private mode */ }
  if (!T[state.theme]) state.theme = 'ink';

  function opts(name, mode, hue) {
    const t = T[name], m = mode || t.natural, o = Object.assign({ mode: m }, t.palette[m]);
    if (hue != null) o.accentHue = hue;
    return o;
  }
  /* Apply a theme: data attributes switch type, shape and motion in CSS; palette.js writes the colors inline. */
  function apply(next) {
    Object.assign(state, next || {});
    const t = T[state.theme], mode = state.mode || t.natural, el = document.documentElement;
    el.dataset.theme = state.theme; el.dataset.mode = mode;
    const r = root.AtelierPalette.apply(el, opts(state.theme, mode, state.hue));
    try { localStorage.setItem('atelier-showcase', JSON.stringify(state)); } catch (e) { /* ignored */ }
    document.dispatchEvent(new CustomEvent('atelier-theme', { detail: { theme: state.theme, mode, spec: t, report: r.report, tokens: r.tokens } }));
    return r;
  }
  A.themes = { T, state, apply, opts, mode: () => state.mode || T[state.theme].natural };
  apply();
})(typeof self !== 'undefined' ? self : this);
