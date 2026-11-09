# 组件 kit（assets/）

原生 JS + CSS，零依赖，全部挂在 `window.Atelier` 上。每个 JS 文件开头的注释写着完整的 markup 和 API，用之前先读那几行。

## 1. 接入

把 `assets/` 复制进项目（比如 `public/atelier/`），按这个顺序加载：

```html
<link rel="stylesheet" href="atelier/tokens.css">    <!-- 所有设计决定都在这里 -->
<link rel="stylesheet" href="atelier/base.css">      <!-- 重置、默认样式、可访问性 -->
<link rel="stylesheet" href="atelier/core.css">      <!-- toast、迸发、出现动画 -->
<link rel="stylesheet" href="atelier/components/check.css">  <!-- 用到哪个加哪个 -->
<script src="atelier/palette.js"></script>          <!-- 可选：浏览器里实时推导配色，放 <head> -->
<script src="atelier/core.js" defer></script>       <!-- 必须第一个加载的 JS -->
<script src="atelier/components/check.js" defer></script>
<script>addEventListener('DOMContentLoaded', () => Atelier.checks(document.querySelector('#todo')));</script>  <!-- defer 的脚本都在 DOMContentLoaded 之前跑完 -->
```

- **主题**：只覆盖 token（`--c-* --r-* --s-* --e-* --d-*`），不改组件 CSS。配色用 `node scripts/palette.mjs` 生成后粘进 tokens.css，或运行时 `AtelierPalette.apply(el, opts)`。
- **深色模式**：在 `<html>` 上设 `data-mode="dark"`。
- **范例**：examples/showcase/index.html 把下面所有组件都用了一遍，并实时读出状态，是最好的接入参考。

## 2. 清单

| 文件 | 是什么 | API |
|---|---|---|
| core.js | 共用工具 | `A.fine` 精确指针 + 悬停 · `A.reduce` 减少动态 · `A.spring({ from, k, c, el, onUpdate, onRest })` → `to(t, v)` `set(v)` `stop()` · `A.loop(el, frame)` → `wake()` `stop()` · `A.copy(text)` → Promise · `A.toast(msg, tone)` · `A.burst(host, x, y, { count, distance, colors, ring })` · `A.reveal(sel)` · `A.transition(update, x, y)` · `A.haptic(ms)` · `A.clamp / lerp / css / num` |
| scrollbar.js | 隐形滚动条（第 3 节） | `A.scrollbar(host)` → `update()` `destroy()` · `A.scrollbar.all('.at-scroll')` |
| palette.js | OKLCH 配色推导 | `AtelierPalette.derive(o)` / `.apply(el, o)` → `{ tokens, report, warnings }` · `.oklch(hex)` · `.contrast(a, b)` |
| components/segmented.js | 分段控件 + 滑块指示器 | `A.glider(box, el)` → `move(el)` · `A.segmented(root, { onChange, onState })` → `select(i)` |
| components/nav.js | 胶囊导航，选中项展开标签 | `A.nav(nav, { onChange })` → `select(i)` `setMode(m)`，m 为 capsule / icons / rail；需要 segmented.js |
| components/info-pill.js | i 按钮长成胶囊 | `A.ipill.init()` 每页一次；`A.ipill.open(el)` / `.close(el)`；监听 `at-ipill` 事件 |
| components/check.js | 完成勾选 + 迸发 | `A.checks(list, { onChange(done, total, input) })` |
| components/button.js | 状态按钮：按下 → 转圈 → 成功或失败 → 复原 | `A.stateButton(btn, { action: () => Promise, labels, onState })` |
| components/hold.js | 长按盖章确认 | `A.hold(btn, { duration: 900, scope, onProgress, onComplete, onCancel })` → `reset()` |
| components/wheel.js | 惯性滚轮选择器 | `A.wheel(el, { values, index, onChange, onState })` → `go(i)` |
| components/cord.js | 拉绳开关 | `A.cord(el, { threshold: 70, max: 150, onToggle(x, y), onState })` → `tug()` |
| components/peel.js | 揭角贴纸 | `A.peel(el, { onState, onDone })` → `reset()` `peel()` |
| fx/particles.js | 粒子文字 | `A.particles(canvas, { text, font, colors, hot, paint, shape, blend, twinkle, target })` → `setText` `setStyle` `scatter` `destroy` |
| fx/ribbon.js | 指针拖尾 | `A.ribbon(canvas, { color, colors, mode, width, life, target })` → `setStyle` `destroy` |
| fx/pointer.js | 磁吸 / 聚光 / 倾斜 | `A.magnetic(el, { strength, radius })` · `A.spotlight(box, '.tile')` · `A.tilt(el, { max })`，都返回 destroy 函数 |
| fx/text.js | 乱码解码 / 滚动数字 | `A.scramble(el, text, { duration })` → Promise · `A.odometer(el, value, { format })` |

所有组件：处理了 `pointercancel`、键盘操作、读屏文字、减少动态，触屏点击区不小于 44px。对同一个元素重复调用同一个组件函数，拿到的是已有的实例，不会重复绑定事件（热更新、React StrictMode 都安全）。

## 3. 隐形滚动条规格（scrollbar.js + scrollbar.css）

- **原生滚动不动**：滚轮、触摸、键盘、读屏、`scrollIntoView` 都照常。只把原生滚动条藏起来（`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`），叠一条覆盖层细线。
- **JS 标记后才藏**：脚本给宿主加 `.at-sb-on` 之后才隐藏原生滚动条，没有 JS 的页面仍有正常滚动条。
- **平时看不见**；滚动时淡入，停下 900ms 后淡出。
- **靠近才显形**：指针离边缘 `--sb-reach`（56px）以内开始出现，越近越粗（`--sb-w` 4px → `--sb-w-near` 8px）越实，并露出轨道。
- 按住滑块可拖（拖动时变主色）；点轨道跳到对应位置。滑块最短 28px。
- **触屏不接管**：保留系统自己的覆盖式滚动条（可用 `{ force: true }` 强制）。
- 所有实例共用一个指针监听，每帧先统一读位置再统一写样式，不触发布局抖动。
- 滚动条覆盖层是 `aria-hidden` 的装饰；可访问的滚动由原生滚动提供。
- markup：`<div class="at-scroll"><div class="at-scroll__view">内容</div></div>`；整页用 `A.scrollbar(document.documentElement)`。
- **纯 CSS 降级版**（没有 JS 时）：`.box { scrollbar-width: thin; scrollbar-color: transparent transparent } .box:hover { scrollbar-color: var(--sb-c) transparent }`。只能做到「悬停在整个区域上才显示」，做不到靠近边缘才显示。
- 小程序和原生 App 用系统滚动条，不自己做。

## 4. 在框架里用

- 组件函数在挂载后调用（React `useEffect`、Vue `onMounted`、Svelte `onMount`），卸载时调用返回的 `destroy()`。
- 只在浏览器里运行：Next.js 里放在 `'use client'` 组件中，或用动态导入关掉 SSR。
- 详细写法见 stacks.md。

## 5. 往 kit 里加新组件

1. 用 concepts.md 的六步写规格。
2. 一个 `name.js` + 一个 `name.css`；JS 文件开头写 markup 和 API。
3. 只读语义 token；动效用 `--e-move / --e-pop / --e-fade`；拖拽松手用 `A.spring({ el })`。
4. 处理：键盘、`pointercancel`、读屏（`aria-*` + 状态播报）、`A.reduce`、触屏 44px 点击区、悬停样式包在 `@media (hover: hover)`。
5. 放进 showcase 页，用 qa.py 跑一遍。
