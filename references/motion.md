# 动效规范

动效只做三件事：**反馈**（我按到了）、**连续**（东西从哪来、到哪去）、**状态**（现在怎样了）。说不出属于哪一种的动画就删掉。

## 1. Token（tokens.css）

| Token | 值 | 用在 |
|---|---|---|
| `--d-instant` / `--e-press` | 90ms / `cubic-bezier(.2,0,0,1)` | 按下 |
| `--d-fast` | 160ms | 颜色、透明度、悬停 |
| `--d-base` | 240ms | 小位移、展开 |
| `--d-slow` | 420ms | 大面板、页面级 |
| `--e-out` / `--e-in-out` / `--e-in` | 进入落定 / 屏内移动 / 离开 | 非弹簧的场合 |
| `--e-move` + `--d-move` | 主题指定的弹簧 | 位置和尺寸：滑块、胶囊、抽屉 |
| `--e-pop` + `--d-pop` | 主题指定的弹簧 | 弹出缩放：对勾、徽标、标签 |
| `--e-fade` + `--d-fade` | `--e-out` + 160ms | 透明度和颜色 |
| `--spring-k` / `--spring-c` | 刚度 / 阻尼（质量 1） | JS 拖拽松手后的弹簧；`Atelier.spring({ el })` 每次 `to()` 都重新读，换主题手感跟着换 |

组件只用 `--e-move / --e-pop / --e-fade` 这三对语义 token。主题把它们映射到具体弹簧（见 examples/showcase/css/theme.css）。

## 2. 弹簧预设（scripts/spring.mjs）

| 预设 | 感知时长 · 回弹 | 完整落定 | k / c | 适合 |
|---|---|---|---|---|
| press | 0.18s · 0 | 303ms | 1218 / 70 | 按下与松开 |
| calm | 0.45s · 0 | 647ms | 195 / 28 | 编辑、金融、奢品：不回弹 |
| gentle | 0.5s · 0.1 | 548ms | 158 / 22.6 | 空间感、硬件：几乎看不出回弹 |
| snappy | 0.32s · 0.15 | 468ms | 385 / 33 | 工具、开发者：快，轻微回弹 |
| bouncy | 0.5s · 0.38 | 862ms | 158 / 15.6 | 年轻、打卡：明显回弹 |

```bash
node scripts/spring.mjs --presets
node scripts/spring.mjs --duration 0.4 --bounce 0.2 --name brand
node scripts/spring.mjs --stiffness 300 --damping 26
```

输出 CSS 的 `linear()` 曲线 + 时长 + JS 用的 k/c。CSS 里时长要写**完整落定时长**（`--d-snappy` 是 468ms），弹簧的大部分位移在前 40% 就完成了，所以看起来比数字快；时长写短了，尾巴会被截掉，最后「咯噔」一下停住。

**动势旋钮 → 预设**：1 calm · 2 calm 或 gentle · 3 gentle 或 snappy · 4 snappy · 5 bouncy（只用在弹出 `--e-pop`，位移 `--e-move` 仍用 snappy，团子主题就是这样配的）。

**信任例外**：付款确认、删除、提交表单这类操作不回弹，动势调到 5 也一样。

不支持 `linear()` 的旧引擎（Safari 17.2 以前）由 tokens.css 里的 `@supports` 块退回近似的 cubic-bezier。

## 3. 时长

| 场景 | 时长 |
|---|---|
| 按下反馈 | 出现 <100ms（80–100ms），松开回弹 200–300ms |
| 悬停颜色和阴影 | 120–180ms |
| 提示气泡 | 悬停 300–500ms 后出现，消失 100ms |
| 小位移、展开、开关 | 200–300ms，或 snappy 弹簧 |
| 抽屉、弹层、底部面板 | 进入 300–450ms，退出约为进入的 60–70% |
| 页面切换 | 250–400ms，必须能被下一次点击打断 |
| 主题圆形扩散 | 640ms（`Atelier.transition`） |
| 列表错开 | 每项 30–50ms，总长封顶 300–400ms，超过的项不再加延迟 |
| 随距离变化的移动 | 时长随距离增长并封顶。滑块：260ms + 0.3ms/px，最多 520ms（`Atelier.glider`） |

## 4. 硬规则

1. **可打断**：动画中途有新输入，就从**当前位置和速度**接着走，不跳回起点、不排队等。
2. **只动合成层属性**：`transform`、`opacity`、`filter`、`clip-path`。尺寸变化用 FLIP 或 `scale`，不直接动 `width / height / top / left`（除非是很小的元素）。
3. **不写 `transition: all`**，逐个列出属性。
4. **退出比进入快**；动画进行时不挡输入（危险操作的确认除外）。
5. **曲线**：进入用 ease-out 或弹簧；屏内移动用 ease-in-out 或弹簧；离开用 ease-in 且更短；松手后的惯性用带初速度的弹簧；`linear` 只给进度条和加载转圈。

## 5. 跟手（拖拽、滑动、长按）

- **按住时 1:1 跟手**，越界加橡皮筋阻力：`超出显示量 = (1 − 1 / (超出 × 0.55 / 尺寸 + 1)) × 尺寸`。
- **速度**取最后约 100ms 的指针采样。
- **松手判定**：走过总行程 1/3，或速度超过约 0.5 px/ms，就提交；否则弹回。
- **惯性落点**：预测落点 = 当前位置 + 速度 × 系数（滚轮用 0.22），再吸附到最近一格。手指停住再松开，速度为 0，不甩。
- **速度交接**：松手时把速度传给弹簧当初速度（`spring.to(target, velocity)`），跟手和惯性之间才没有断点。
- **点按和拖拽**：移动不到 6–8px 算点按。
- **收尾**：拖拽元素调用 `setPointerCapture`；`pointercancel` 和 `lostpointercapture` 都要按「松手」处理；只监听 `pointerup` 的话，系统手势抢走触摸时组件会卡在半路。
- **`touch-action`**：横向拖拽的组件写 `touch-action: pan-y`，纵向页面滚动还能用；完全自定义手势的区域写 `none`。
- **轻震**：越过阈值时 `Atelier.haptic(8)` 一次。只有支持 `navigator.vibrate` 的安卓浏览器有效，iOS Safari 没有，所以必须同时有视觉反馈。

## 6. 编排

- **一个主角**：先动的是用户操作的那个元素，配角晚 30–60ms 跟上，幅度更小。
- 同一个原因引起的变化一起动；不同原因的分开动。
- **从触发点长出来**：弹层的 `transform-origin` 设在锚点；主题切换从点击位置扩散；新加的列表项从「添加」按钮的方向进来。
- **共享元素**：列表项展开成详情，用 View Transitions 或 FLIP 保持是同一个东西；前进从右进，返回从左出。
- **滚动出现**：每个元素只出现一次（`Atelier.reveal`），一起进入的错开 30–50ms。不是每个区块都要淡入上移，只给值得强调的。`animation-timeline: view()` 只当渐进增强用。

## 7. 减少动态

`prefers-reduced-motion: reduce` 不等于全关，而是换成不需要运动的版本：
- 位移、缩放、视差、粒子、拖尾、自动播放：关掉，或换成淡入淡出。
- 必要反馈保留：按下变色、对勾直接出现、进度条照常走、错误照常提示。
- 自动轮播停住，改成手动。
- kit 已经处理：`Atelier.spring` 直接跳到终点；`Atelier.burst` 不出粒子；`Atelier.reveal` 直接显示；`magnetic / spotlight / tilt` 不启用。

## 8. 性能

- `will-change` 只在动画进行中加，结束就去掉；常驻会占显存。
- 帧循环用 `Atelier.loop(el, frame)`：元素离开视口或标签页隐藏时自动停，`frame` 返回 false 就休眠，有输入再 `wake()`。
- canvas 像素比封顶 2；粒子数按屏宽减半（3200 → 1500）。
- 动画中途不读布局（`getBoundingClientRect`、`offsetWidth`），先集中读、再集中写。scrollbar.js 就是这么做的。
- 低端设备（`navigator.hardwareConcurrency <= 4` 或 `navigator.deviceMemory <= 4`）可以默认关掉环境特效，只留招牌特效。

## 9. 按设备开关

- 跟随指针的特效（磁吸、聚光、倾斜、拖尾）：只在 `(hover: hover) and (pointer: fine)` 下启用（`Atelier.fine`）。
- 触屏：悬停反馈换成按下反馈；只靠悬停才能看到的信息，改成点按或常显。
- 陀螺仪倾斜：iOS 要先请求权限，而且必须由用户点击触发；不是核心功能就不做。

## 10. 动效说明表（交付时附上）

| 元素 | 触发 | 属性 | 时长 | 延迟 | 曲线 | 减少动态时 |
|---|---|---|---|---|---|---|
| 主按钮 | 按下 | scale 1 → 0.96 | 90ms | 0 | `--e-press` | 只变色 |
| 主按钮 | 加载 | 收窄成圆，转圈 | 至少 500ms | 0 | `--e-move` | 静态圈 + 「处理中」 |
| 成功对勾 | 结果 | 描边 0 → 1 | 240ms | 0 | `--e-pop` | 直接出现 |
| 卡片列表 | 进入视口 | opacity + translateY 16px → 0 | 420ms | 每项 40ms，封顶 320ms | `--e-out` | 直接显示 |
