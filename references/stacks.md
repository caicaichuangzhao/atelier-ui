# 落到各个技术栈

先问项目用什么栈，再决定怎么落地。项目已有设计系统时，**往它的 token 体系里映射**，不另起一套。

## 1. Tailwind CSS v4

tokens.css 照常加载，再用 `@theme inline` 把它映射成工具类，深浅色切换时工具类跟着变：

```css
@import "tailwindcss";
@import "./atelier/tokens.css";
@custom-variant dark (&:where([data-mode=dark], [data-mode=dark] *));

@theme inline {
  --color-bg: var(--c-bg);  --color-surface: var(--c-surface);  --color-line: var(--c-line);
  --color-ink: var(--c-text);  --color-ink-2: var(--c-text-2);  --color-ink-3: var(--c-text-3);
  --color-accent: var(--c-accent);  --color-accent-ink: var(--c-accent-ink);  --color-accent-strong: var(--c-accent-strong);
  --radius-control: var(--r-control);  --radius-card: var(--r-card);  --radius-panel: var(--r-panel);
  --shadow-1: var(--sh-1);  --shadow-2: var(--sh-2);  --shadow-3: var(--sh-3);
  --ease-move: var(--e-move);  --ease-pop: var(--e-pop);  --ease-out: var(--e-out);
  --font-sans: var(--f-sans);  --font-display: var(--f-display);  --font-mono: var(--f-mono);
}
```

用法：`bg-surface text-ink rounded-card shadow-2 ease-move duration-300`。Tailwind 自带重置样式，可以不加载 base.css，但要把里面减少动态和焦点环的规则搬过来。

## 2. React / Next.js

kit 是浏览器脚本，挂在 `window.Atelier` 上。在副作用里按需加载，服务端渲染时不会执行：

```jsx
'use client';                                   // Next.js App Router 需要
import { useEffect, useRef } from 'react';

export function useAtelier(load, make) {        // load 只在浏览器里执行；make(el, Atelier) => 实例
  const ref = useRef(null);
  useEffect(() => {
    let inst, gone = false;
    load().then(() => { if (!gone) inst = make(ref.current, window.Atelier); });
    return () => { gone = true; typeof inst === 'function' ? inst() : inst?.destroy?.(); };
  }, []);
  return ref;
}
// const ref = useAtelier(
//   () => import('@/atelier/core.js').then(() => import('@/atelier/components/wheel.js')),
//   (el, A) => A.wheel(el, { values, onChange }));
```

- 同一个元素重复初始化会拿到同一个实例（StrictMode 开发模式下 effect 会跑两次，不会重复绑定）。
- **Next.js**：不要在文件顶层 `import` kit，顶层代码在服务端也会执行，而 core.js 需要 `window`。用上面的动态导入，或者 `next/dynamic` 加 `{ ssr: false }`，或者 `<Script strategy="afterInteractive">`。
- 想用 motion（framer-motion）时：把 spring.mjs 输出的 k / c 填进 `transition={{ type: 'spring', stiffness: 385, damping: 33, mass: 1 }}`，手感和 CSS 版一致。

## 3. Vue 3

```js
import { onMounted, onBeforeUnmount, ref } from 'vue';
export function useAtelier(make) {
  const el = ref(null); let inst;
  onMounted(() => { inst = make(el.value); });
  onBeforeUnmount(() => (typeof inst === 'function' ? inst() : inst?.destroy?.()));
  return el;
}
```

Nuxt 里同样只在客户端加载（`.client.js` 插件或 `<ClientOnly>`）。

## 4. Svelte

```js
export function atelier(node, make) {
  const inst = make(node);
  return { destroy: () => (typeof inst === 'function' ? inst() : inst?.destroy?.()) };
}
// <div use:atelier={el => Atelier.wheel(el, { values })}></div>
```

## 5. 小程序

没有 DOM，kit 的 JS 不能用，只搬 token 和参数：
- 颜色：`node scripts/palette.mjs ... --json` 的 hex 写进 WXSS 的 `page { --c-bg: #...; }`，深色模式用 `@media (prefers-color-scheme: dark)`（app.json 里设 `"darkmode": true`）。
- 尺寸：px × 2 = rpx（按 375 宽设计稿）；1px 细线保持 1px。
- 动效：CSS `transition` 用 tokens 里的 cubic-bezier；按下用 `hover-class`；平台差异见 platforms.md 第 6 节。

## 6. SwiftUI

- 动画：`.animation(.spring(duration: 0.32, bounce: 0.15), value: x)`，参数和 spring.mjs 的 `--duration --bounce` 一一对应；也可以用 `Spring(mass: 1, stiffness: 385, damping: 33)`。
- 颜色：palette.mjs 输出的浅色 / 深色 hex 写进 Asset Catalog 的颜色集（Any / Dark 两套）。
- 图标用 SF Symbols；读 `@Environment(\.accessibilityReduceMotion)`；轻震用 `.sensoryFeedback(.selection, trigger:)`（iOS 17+）或 `UIImpactFeedbackGenerator`。

## 7. Jetpack Compose

- 动画：`spring(dampingRatio = 0.85f, stiffness = 385f)`。阻尼比 = c ÷ (2√k)：snappy 0.85、bouncy 0.62、gentle 0.90、calm 1.0（也就是 `1 − bounce`）。
- 颜色：hex 写进 `lightColorScheme(...)` / `darkColorScheme(...)`。
- 轻震：`LocalHapticFeedback.current.performHapticFeedback(HapticFeedbackType.LongPress)`；系统关了动画（开发者选项里的动画缩放为 0）时跳过装饰动画。

## 8. Flutter

- 动画：`SpringDescription(mass: 1, stiffness: 385, damping: 33)` 配 `SpringSimulation`。
- 颜色：`ThemeData(colorScheme: ColorScheme(...))`，浅色深色各一套。
- `MediaQuery.of(context).disableAnimations` 为 true 时去掉运动；轻震 `HapticFeedback.selectionClick()`。

## 9. 已有设计系统

| 系统 | 怎么映射 |
|---|---|
| Ant Design | `ConfigProvider theme={{ token: { colorPrimary, borderRadius, fontFamily, motionEaseOut } }}`；深色用 `theme.darkAlgorithm` |
| Element Plus | 覆盖 `--el-color-primary`、`--el-border-radius-base`、`--el-font-family` 等 CSS 变量 |
| MUI | `createTheme({ palette, shape: { borderRadius }, typography, transitions })` |
| shadcn/ui | 改 `globals.css` 里的 `--background --foreground --primary --border --ring --radius`，可以直接写 `oklch()` |
| Arco / TDesign / Vant | 都是 CSS 变量或 Less 变量，按同样的角色对应 |

原则：组件库的组件照用；atelier 加的是**推导出来的 token**、**反馈四拍**和**少量招牌组件**。不要把整套组件换掉，也不要在同一页混两套视觉。
