---
name: atelier-ui
description: "设计有高级感、带动效、每一步操作都有反馈的界面：从产品定位推导整套风格（配色、字体、图标、圆角、间距、景深、动效、隐形滚动条），在用户的粗略概念上做出原创组件，按设备和输入方式适配桌面、平板、手机 H5、小程序和客户端，克制地搭配悬停、指针跟随、粒子文字等特效；用户明确要求时给出生图模型用的界面预览提示词。适用于设计或改版界面、页面、组件、落地页、后台、移动端或小程序界面、设计系统和风格规范，或者用户提到高级感、动效、交互反馈、鼠标特效、粒子文字、配色、隐形滚动条、UI 生图提示词。Design premium, animated UI with feedback at every step: derive the style system from product positioning, amplify rough component ideas, adapt to every device, budget effects, and write image-generation prompts for UI previews on request."
---

# atelier-ui

风格从产品里长出来，交互每一步都有回应。本技能提供方法（references/）、可直接复制的组件 kit（assets/）和检查工具（scripts/），不依赖特定模型或框架。

文中的 `references/`、`assets/`、`scripts/`、`examples/` 都在本文件所在的技能文件夹里。在用户的项目目录里运行脚本时写完整路径，例如 `node <技能文件夹>/scripts/palette.mjs …`。

## 底线（每次都遵守）

1. **先定位，后风格**。每个设计决定都能说出「因为产品是 X，所以 Y」。说不出理由的选择就是模板。
2. **配色靠推导，不挑模板**。用 `scripts/palette.mjs` 从旋钮推出整套颜色，对比度报告全过才用。
3. **每个交互四拍**：按下（<100ms）→ 过程 → 结果 → 归位。鼠标设备前面多一拍「靠近」。
4. **一套尺度**：组件只读语义 token（`--c-* --r-* --s-* --e-* --d-*`），换主题只换 token。
5. **动效有物理感、可打断**；减少动态时有不靠运动的替代。
6. **特效有预算**：每页 1 个招牌 + 最多 2 个环境特效；同一区域只叠 1 个指针特效；付款、设置这类信任页面不放特效。
7. **交互看输入能力，布局看宽度**：悬停只是加分；触屏点击区 ≥44px；贴底元素让开安全区。
8. **内容是真的**：不凭记忆画 Logo，不编数据，不用 lorem。
9. **可访问**：正文 ≥7:1，次要文字 ≥4.5:1；键盘能操作；结果有读屏播报；焦点可见。
10. **忠于用户的概念**：在用户说的组件上做加法，不换成你自己的点子。
11. **验证后交付，如实报告**：跑 `scripts/qa.py`、看截图；没跑的检查写「没跑」。

## 按任务大小走

- **一个组件**（按钮、卡片、开关……）：沿用项目已有 token，走第 3、4、6、7、8 步。
- **一个页面或一个产品**：走全部步骤。
- **改已有项目**：先读它的 tokens、组件库和技术栈，往里面映射（stacks.md 第 9 节），不另起一套。
- **只要规范或提示词**：交付文档，不写代码。

## 流程

**0. 看清现场**。项目用什么技术栈，有没有设计系统或组件库，目标设备有哪些。用户只给一句话时不连环追问：最多问一轮、1–2 个关键问题（通常是「涉不涉及钱和隐私」「主要在什么设备上用」），其余写成假设放在方案开头。

**1. 定位 → 旋钮**（references/positioning.md）。写简报，换算成 7 个旋钮，写一句推导理由。用户没定方向时给 3 个明显不同的方向让用户挑。

**2. 推导 token**。
- 颜色：`node scripts/palette.mjs --accent <色相> --neutral <色相> --tint <0–0.02> --chroma <0.08–0.22>`；已有品牌色用 `--brand "#hex"`（color.md）。
- 字体（typography.md）、图标和 Logo（icons-logos.md）、圆角间距景深（shape-space-depth.md）、弹簧和时长（motion.md，`node scripts/spring.mjs --presets`）。
- 写进 `assets/tokens.css` 的副本，或者映射进项目已有的 token 体系。

**3. 放大组件概念**（concepts.md）。用户描述的每个原创组件，按六步写规格：意图、隐喻、步骤、约束、一个惊喜、规格表。

**4. 设计反馈**（feedback.md）。每个可交互元素写出四拍和状态矩阵；触屏重排步骤。常见组件按 recipes.md 的要点做。

**5. 多端**（platforms.md）。分开判断输入能力和可用宽度；列出哪些组件在哪个宽度、哪种输入下换形态。

**6. 特效**（effects.md）。按「装饰」旋钮和定位选 1 个招牌 + 最多 2 个环境特效，写出选择理由。

**7. 实现**。用项目的技术栈。能用 kit 就复制 `assets/`（components.md；各框架接入见 stacks.md）。悬停样式包在 `@media (hover: hover)` 里；拖拽处理 `pointercancel`；动效用 `--e-move / --e-pop / --e-fade`。

**8. 检查**（review.md）。`python scripts/qa.py <网址或文件> --widths 375,768,1280`，再加 `--dark`、`--reduce` 各跑一遍；逐张看截图；按打分表自评，不达标就改了再跑。

## 交付格式

1. 风格说明：定位、旋钮值、推导理由（positioning.md 第 7 节的格式）
2. tokens 和对比度报告
3. 代码
4. 每个组件的四拍 + 动效说明表（motion.md 第 10 节）
5. 多端说明
6. qa.py 结果（每个宽度一行）和截图位置
7. 已知限制、没验证的部分
8. 外部代码、图标、字体的出处和授权（sources.md）

## 生图提示词模式

**只有用户明确要求时**才进入（「先给生图提示词」「我自己用 MJ / 即梦出预览」）。读 references/image-prompts.md，先完成第 1–2 步拿到真实的 hex，再按模板给出：中文提示词、英文提示词、负面词、画幅和参数、拿到图之后看什么。不主动调用生图工具。

## 速查

**七旋钮**（1–5）：温度 · 能量 · 密度 · 圆润 · 景深 · 动势 · 装饰。打架时按 **信任 > 频率 > 调性** 让步。

**高级感十条**：色彩克制（主色约 5–10%）· 层级靠字号、字重、留白 · 一套尺度、同心圆角 · 阴影带色相、分两层 · 4pt 网格、等宽数字 · 每个状态都设计 · 动效短而可打断 · 一处记得住的细节 · 内容真实 · 删到删不动。

**数字**：
- 点击区：触屏 44×44（视觉可以更小，用 `::before` 撑大），相邻目标留 8px
- 按下 <100ms；加载 300ms 内不出转圈，出了至少 500ms；超过 2s 加阶段文字
- 对比度：正文 7:1，次要文字 4.5:1，图标和边框 3:1
- 时长：微交互 ≤300ms；弹层进入 300–450ms，退出为进入的 60–70%；列表错开每项 30–50ms，总长封顶 400ms
- 中文正文行高 1.7–1.8，每行 28–40 字；手机输入框字号 ≥16px
- 动势 → 弹簧：1 calm · 2 calm 或 gentle · 3 gentle 或 snappy · 4 snappy · 5 bouncy（只给弹出）；付款、删除不回弹

## 文件

| 路径 | 内容 |
|---|---|
| references/ | 方法：positioning、color、typography、icons-logos、shape-space-depth、motion、feedback、concepts、effects、components、recipes、platforms、image-prompts、review、sources、stacks |
| assets/ | 可复制的 kit：tokens.css、base.css、core.js / core.css、palette.js、scrollbar.js / .css、components/、fx/ |
| scripts/palette.mjs | 旋钮 → 整套颜色 + 对比度报告（Node 18+） |
| scripts/spring.mjs | 弹簧参数 → CSS `linear()` 曲线 + 时长 + JS 用的 k/c |
| scripts/qa.py | 多宽度截图 + 设计审查报告（Python + Playwright） |
| examples/showcase/ | 样板页：四种定位、11 个组件、实时读数、多端适配演示 |

不能运行脚本时（没有 Node 或 Python），按 references 里的规则手工推导，并在交付里写明哪些检查没有自动验证。
