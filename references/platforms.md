# 多端：同一个产品在每台设备上都好看

## 1. 两个判断分开做

- **交互看输入能力**：有没有悬停、指针精不精确。不要用屏幕宽度猜。
  - `(hover: hover) and (pointer: fine)`：鼠标或触控板，可以做悬停和跟随指针的特效（JS 里是 `Atelier.fine`）。
  - `(pointer: coarse)`：手指，点击区 44px，悬停效果换成按下效果。
  - `(any-pointer: coarse)`：带触屏的笔记本，主输入是鼠标，但用户也可能伸手点，控件别做得太小。
  - 接了妙控键盘的 iPad 会报告支持悬停；只有触屏的二合一电脑会报告不支持。所以「平板 = 触屏」这个假设不成立。
- **布局看可用宽度**：组件用容器查询（`container-type: inline-size` + `@container`），页面骨架用媒体查询。

宽度参考：360（小屏安卓）· 375 / 390（iPhone）· 768（平板竖屏）· 1024（平板横屏、小笔记本）· 1280 · 1440+。qa.py 默认测 375、768、1280。

## 2. 同一个组件，不同形态

| 组件 | 宽桌面 | 窄桌面 / 平板 | 手机 |
|---|---|---|---|
| 主导航 | 侧栏，图标 + 文字 | 图标栏，悬停或聚焦显示文字 | 底部胶囊 / Tab |
| 下拉选择 | 浮层列表 | 浮层列表 | 底部面板，或原生 `<select>` |
| 提示气泡 | 悬停出现 | 悬停或点按 | 点按出现，或直接写在界面上 |
| 表格 | 完整列 | 隐藏次要列 | 卡片列表，或首列固定 + 横向滚动 |
| 对话框 | 居中弹窗 | 居中弹窗 | 全屏页或底部面板 |
| 右键菜单 | 右键 | 右键或长按 | 长按，并在「更多」里也能找到 |
| 详情 | 侧边分栏 | 分栏或抽屉 | 推入新页面 |
| 悬停才显示的操作 | 悬停显示 | 常显（触屏可能没有悬停） | 常显，或左滑出现 |

示例页「多端适配」一节可以拖动窗口宽度：≥600px 侧栏，400–600px 图标栏，<400px 底部胶囊。同一个导航组件，只换 `setMode()`。

## 3. 桌面 Web

- 内容最大宽度 1200–1440px，两侧留白；正文行长按 typography.md 控制。
- 键盘：Tab 顺序合理、焦点可见，常用操作给快捷键并在提示里写出来，`Esc` 关闭浮层。
- 鼠标可以多给信息：悬停预览、聚光、磁吸。但悬停只能加分，不能是唯一入口。
- 高密度界面（后台、工具）用紧凑密度；营销页用宽松密度。

## 4. 平板

- 横屏用列表 + 详情双栏；竖屏退成单栏，或者把列表放进可收起的侧栏。
- 当成触屏设计：点击区 44px，悬停效果只是加分。
- 分屏和台前调度会把窗口压窄，所以要靠容器宽度适配，不要靠设备型号。

## 5. 手机 H5

- **拇指区**：主要操作放在屏幕下半部分；底部 Tab 3–5 项；返回和次要操作放顶部。
- **安全区**：`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`；贴底元素加 `padding-bottom: env(safe-area-inset-bottom)`。
- **高度**：全屏用 `100dvh`（地址栏伸缩时不跳）；不要用 `100vh`。
- **键盘**：弹出时会遮住底部固定元素。用 `visualViewport` 的 resize 事件把底栏抬上去，或者聚焦输入框时隐藏底栏。
- **输入**：字号至少 16px（否则 iOS 会放大页面）；写好 `inputmode`、`enterkeyhint`、`autocomplete`。
- **不要禁止缩放**：不写 `user-scalable=no` 和 `maximum-scale=1`。
- **滚动**：浮层里加 `overscroll-behavior: contain`，滚到头时不带着背后的页面一起滚；横向溢出用 `overflow-x: clip`（包裹元素上写 `hidden` 会让它变成滚动容器，里面的 `position: sticky` 就失效了）。
- **触摸**：`-webkit-tap-highlight-color: transparent` 之后，必须有自己的按下效果（base.css 已去掉默认高亮）。
- **横屏**：手机横屏高度只有 320–430px，底部固定栏和大标题要缩小或收起。

## 6. 小程序（微信为例，支付宝类似）

- **单位**：`rpx`，屏幕宽固定为 750rpx。点击区至少 88rpx（约 44px）；1 物理像素的细线用 1px，不要用 rpx。
- **胶囊按钮**：右上角的胶囊是系统的，自定义导航栏必须避开它：
  `const m = wx.getMenuButtonBoundingClientRect(), s = wx.getWindowInfo().statusBarHeight;`
  导航栏高度 = `(m.top − s) × 2 + m.height`，内容从 `s + 导航栏高度` 开始；标题区右侧让出 `窗口宽度 − m.left`。
- **没有悬停**：按下反馈用 `hover-class="is-pressed"`（配合 `hover-start-time`、`hover-stay-time`）。
- **动效**：WXSS 支持 CSS 变量、`transition`、`@keyframes`；JS 驱动的动画用 `this.animate()` 或 `wx.createAnimation()`。没有 DOM，kit 的 JS 不能直接用，只搬 token 和动效参数。
- **画布**：`<canvas type="2d">`，粒子数比 H5 再减一半；页面隐藏（`onHide`）时停帧。
- **轻震**：`wx.vibrateShort({ type: 'light' })`。
- **体积**：主包和每个分包都有大小上限（以官方文档为准），所以字体和大图不要打进包里，用网络地址并做缓存。
- **滚动条**：用系统的，不做隐形滚动条。

## 7. 桌面客户端（Electron / Tauri）与 PWA

- **标题栏**：自绘标题栏的可拖动区域写 `-webkit-app-region: drag`，里面的按钮写 `no-drag`；macOS 左侧给红绿灯按钮留约 80px，Windows 的窗口按钮在右侧。
- **字体**：跟系统走（`system-ui`：Windows 11 是 Segoe UI Variable，macOS 是 SF Pro）。
- **滚动条**：桌面应用里用户熟悉系统滚动条；隐形滚动条只用在有强烈视觉风格的区域。
- **快捷键**：macOS 用 ⌘，Windows 用 Ctrl，提示文字按系统显示。右键菜单要有。
- **窗口**：设最小尺寸；窗口缩到很窄时按手机布局走。
- **PWA**：`@media (display-mode: standalone)` 时没有浏览器的返回按钮，要自己提供返回；`<meta name="theme-color">` 跟着深浅色变。

## 8. 系统偏好

`prefers-color-scheme`、`prefers-reduced-motion`、`prefers-contrast: more`、`prefers-reduced-transparency`、`forced-colors: active` 都要响应：深浅色、少动效、高对比、去掉玻璃、高对比度模式下保留可见的边框和焦点（用 `outline`，不要只用 `box-shadow`）。

## 9. 特效按设备分档

- 跟随指针的特效只在精确指针设备上启用；触屏只留按下反馈和滚动数字这类不依赖指针的效果。
- 粒子数按屏宽减半，像素比封顶 2；滚出视口或切到后台就停帧。
- 低端设备（CPU 核数和内存 ≤4）默认关掉环境特效。
- 减少动态时只保留淡入淡出（motion.md 第 7 节）。
