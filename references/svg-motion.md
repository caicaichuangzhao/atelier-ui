# SVG 动画：设计与搭建

SVG 是「会动的矢量图」：每个元素都是 DOM，可以单独上色、描边、变形、绑事件，放大不糊、文件小。本文的技术归纳来自对 svganimate.ai 首页 15 个分类案例的内联 SVG 结构分析（2026-11-10 用 REA 抓取 DOM，统计了各案例用到的元素和动画手法），模板和代码是我们自己写的。

## 1. 什么时候用 SVG

| 用 SVG | 用别的 |
|---|---|
| 图标、Logo、插画、线条图、图表、流程图、地图路线、加载动画、小型示意图 | 照片和写实画面 → 图片 / 视频 |
| 需要随主题变色（`currentColor`、CSS 变量） | 几千个粒子 → Canvas 2D |
| 需要点击某一部分（热点、图解、可交互图表） | 真 3D、流体、光照 → WebGL |
| 需要清晰缩放（视网膜屏、大屏、打印） | 一整页的复杂背景动画 → CSS 渐变或视频 |

经验线：同屏动画元素 <300 个、滤镜面积不大时 SVG 很流畅；超过就换 Canvas。

## 2. 五种驱动方式，按顺序考虑

1. **CSS 动画 / 过渡**（首选）：`transform`、`opacity`、`stroke-dashoffset`、`fill`、`stroke`。好处：能用 token、能被 `prefers-reduced-motion` 关掉、能暂停（`animation-play-state`）。
   - 变形前必须写 `transform-box: fill-box; transform-origin: center`（或 `0 50%` 等），否则 SVG 元素绕画布左上角转。
2. **SMIL**（`<animate>`、`<animateTransform>`、`<animateMotion>`）：适合**沿路径运动**（`<animateMotion rotate="auto"><mpath href="#route"/></animateMotion>`）、**改几何属性**（`d` 变形、`r`、`x2`）、导出成**独立 .svg 文件**也能动（放进 `<img>` 也会播）。
   - 用 `keyTimes` + `values` 排一条时间线；`calcMode="spline"` + `keySplines="0.4 0 0.2 1"` 给每段加缓动。
   - 缺点：CSS 媒体查询关不掉它，要用 JS：`svg.pauseAnimations()` / `svg.unpauseAnimations()`。
3. **CSS `offset-path`**：HTML 元素也能沿路径走：`offset-path: path('M…'); offset-distance: 0% → 100%`。适合在页面里让一个徽标沿曲线飞。
4. **JS 驱动**（rAF + 弹簧）：跟手、拖拽、物理、和数据绑定时用。只写 `transform` / 属性，一帧一次。
5. **Web Animations API**（`el.animate()`）：需要随时暂停、倒放、跳到某一帧的时间线（产品演示、教学步骤）。

## 3. 核心技法

| 技法 | 怎么做 | 用在 |
|---|---|---|
| **描线** | 路径加 `pathLength="1"`，`stroke-dasharray: 1 1`，`stroke-dashoffset` 从 1 动到 0。从 0 动到 −1 就是「擦掉」 | 线条绘制、签名、图表折线、流程连线、地图路线 |
| **文字描边再填色** | 同一个 `<text>` 叠两层：上层只有描边，先描出轮廓；下层是填色，描完再淡入 | Logo 字标、标题 |
| **路径运动** | `<animateMotion>` + `<mpath>`，`rotate="auto"` 让箭头 / 飞机顺着切线转 | 地图航线、数据包在流程图里流动、电子绕核 |
| **数据流** | 虚线 `stroke-dasharray: 6 10` + `stroke-dashoffset` 线性循环，像传送带 | 架构图、管道、网络连接 |
| **生长** | 柱子 `scaleY(0→1)`，`transform-origin: 50% 100%`；环形进度改 `stroke-dashoffset` | 数据可视化、进度、仪表 |
| **变形** | 两条**点数和命令一致**的 `d` 之间插值（SMIL `values="d1;d2"` 或 JS）；点数不同就先统一 | 图标切换（播放 ↔ 暂停）、形状过渡 |
| **手绘感** | `feTurbulence`（低频 0.02–0.04）+ `feDisplacementMap`（scale 2–4）让线条微微抖；高频噪点 + `feColorMatrix` 做纸纹 | 手绘动画、草图风格、教学板书 |
| **辉光** | `feGaussianBlur` + `feMerge`（模糊层 + 原图） | 霓虹线、地图节点、暗色 Logo |
| **揭开** | `<clipPath>` / `<mask>` 里的矩形宽度从 0 动到满，像笔写过去 | 手写字、逐行出现的图解 |
| **循环背景** | 两份相同的图层并排，`translateX(-宽度)` 线性无限循环；远景慢、近景快 | 小游戏卷轴、视差场景 |
| **骨骼动画** | 手臂、腿各自是 `<g>`，绕关节 `rotate`；同一周期、相位用负的 `begin` 错开 | 火柴人、角色、机械臂 |
| **数值曲线** | 用 JS 先算好一组值（比如 `sin`），写进 `values` | 理工科示意（波形、单位圆、钟摆） |
| **假光标演示** | 一个光标图形按时间线移动，到达按钮时缩小（按下），按钮同步按下，结果出现 | 产品演示、新手引导、功能讲解 |

## 4. 一条循环时间线怎么排

一个 6–9 秒的演示循环，按「进 → 停 → 出 → 空」排：

```
0%  ─ 6%    空白（上一轮刚结束，给眼睛休息）
6%  ─ 25%   主角入场（描线、生长、移入）
25% ─ 85%   停留 + 次要细节（数据跳动、小闪光、流动）
85% ─ 95%   整体淡出或擦除
95% ─ 100%  空白，回到起点
```

- 所有元素共用同一个周期（比如都是 `8s`），各自在不同的百分比段里动，整套才像一个镜头。
- 多个元素依次出现：同一个 `@keyframes` 配不同的 `animation-delay`，或 SMIL 里用 `begin="0.4s"`、`begin="other.end+0.2s"` 链起来。
- 结尾要和开头接得上：最后一帧 = 第一帧，否则循环会「跳一下」。

## 5. 可交互的 SVG

- **热点**：可点的部分放进 `<g role="button" tabindex="0" aria-label="…">`，CSS 写 `cursor: pointer` 和悬停 / 聚焦样式；点击区太小就叠一个透明的大圆（`fill="transparent"` 也能点到；`fill="none"` 点不到）。
- **状态切换**：给 `<svg>` 或某个 `<g>` 加 class（`.is-on`），CSS 里写好各状态的样子和过渡。逻辑在 JS，样子在 CSS。
- **滑块驱动**：`<input type="range">` 的值写进 CSS 变量（`--t`），SVG 里用 `calc()` 或 JS 重新计算几何（函数曲线、齿轮转角）。
- **拖拽**：用 `getScreenCTM().inverse()` 把指针坐标换算成 SVG 坐标；`setPointerCapture` 保证拖出边界也不断。
- **步进演示**（「单步执行」）：一个 `step` 变量 + 每一步的状态表，点一次走一步；当前模块高亮、数据沿路径移动到下一个模块。
- **读屏**：整张示意图给 `role="img"` + `<title>` / `aria-labelledby`；可交互的部分各自有名字；状态变化用 `aria-live` 播报一句话。

## 6. 工程规则

1. **固定画布**：`viewBox="0 0 640 360"`（16:9）或 `0 0 360 640`（竖屏）；容器决定大小。铺满用 `preserveAspectRatio="xMidYMid slice"`，完整显示用 `meet`。
2. **ID 加前缀**：同页多个 SVG 时，`<defs>` 里的渐变、滤镜、clipPath 的 id 都要唯一（比如 `svg-hero-glow`），否则后一个 SVG 会拿到前一个的滤镜。
3. **离屏暂停**：IntersectionObserver 观察容器，不可见时给容器加暂停类（`.is-paused * { animation-play-state: paused }`）**并且**调用 `svg.pauseAnimations()`。两个都要：前者停 CSS 动画，后者停 SMIL。kit：`A.svgPlay`（fx/svg.js）。
4. **减少动态**：CSS 动画写在 `@media (prefers-reduced-motion: no-preference)` 里；SMIL 用 JS 在初始化时 `pauseAnimations()` 并 `setCurrentTime(结束时刻)`，停在完整的那一帧。
5. **颜色走 token**：`fill="currentColor"` 或 `style="fill: var(--c-accent)"`；内联 SVG 才能读页面的 CSS 变量，`<img src="x.svg">` 读不到。
6. **字体**：SVG 里的 `<text>` 用页面字体栈；要导出独立文件或者对形状要求严格时，把字转成路径（并保留一份 `<title>` 写原文）。
7. **滤镜很贵**：`feTurbulence`、`feGaussianBlur` 每帧都要重新计算。只给小面积、少数元素；动画元素不要带滤镜，把滤镜放在静止的图层上。
8. **文件体积**：路径数据保留 1 位小数，删掉编辑器留下的元数据；SVGO 压缩时关掉会改 id 和 viewBox 的选项。
9. **导出**：独立 .svg 只能用 SMIL 和 `<style>` 里的 CSS（没有 JS）；要交互就内联到页面或放 `<object>`。GIF / 视频导出时动画必须是确定的（不能依赖随机数和指针）。

## 7. 按分类的起手式

| 分类 | 骨架 | 时长 | 别做 |
|---|---|---|---|
| 加载 | 3 个圆点错开弹跳，或环形描边绕圈 | 0.8–1.6s 一圈 | 超过 3 种元素一起动 |
| Logo | 描边画出 → 填色淡入 → 一个小光点扫过 | 首次 1.5–2.5s，之后静止 | 无限循环的 Logo |
| 标题文字 | 字距从宽收紧 + 淡入；关键字描边后填色 | 0.8–1.2s | 每个字乱飞 |
| 线条绘制 | 一笔一笔按顺序描，前一笔快结束时下一笔开始 | 每笔 0.4–0.8s | 所有线同时描 |
| 手绘 | 描线 + 轻微抖动滤镜 + 纸纹底 | 跟板书节奏 | 抖动幅度 > 4 |
| 流程图 | 节点依次出现，连线描过去，箭头在连线到达时出现，数据点沿线流动 | 6–9s 一轮 | 同时点亮所有节点 |
| 地图 | 底图静止，航线依次描出，节点脉冲，飞行物沿线走 | 6–10s | 底图也在动 |
| 数据可视化 | 坐标轴先出现，柱子 / 折线生长，数字滚动，结论标签最后出现 | 1.5–2.5s 入场 | 每次刷新都从零重画 |
| 产品演示 | 假光标移动 → 按下 → 界面响应 → 结果出现，循环 | 6–9s | 光标走得比真人快 |
| 科普示意 | 主体静止，变化量随时间或滑块变化，公式和标签同步 | 按物理真实速度 | 为了好看改变物理规律 |
| 角色 / 火柴人 | 身体轻微上下，四肢绕关节转，前景背景不同速度卷动 | 一个步态 0.6–0.8s | 关节转角超出人体范围 |
| 小游戏 | 循环背景 + 主角动作 + 碰撞判定 + 分数；键盘和点按都能玩 | — | 没有暂停和重开 |

## 8. kit 里的帮手（fx/svg.js）

- `A.svgPlay(container, { margin })`：离屏时同时暂停 CSS 动画和 SMIL；减少动态时停在最后一帧。返回 destroy。
- `A.drawPaths(svg, { stagger, duration, order })`：给所有 `[data-draw]` 路径自动加 `pathLength="1"`，按顺序描出，返回 Promise。
- `A.pathMotion(el, path, { duration, rotate })`：让任意元素沿一条 SVG 路径走（内部用 `getPointAtLength`），可以暂停、倒放、跳到进度 p。
- `A.svgPoint(svg, event)`：把指针坐标换算成 SVG 坐标，拖拽和热点用。
- 演示页：`examples/motion/` 的 SVG 区块。
