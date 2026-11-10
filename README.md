# atelier-ui

让 AI 模型做出有高级感界面的技能：从产品定位推导整套风格，每一步交互都有反馈，按设备和输入方式适配，特效讲预算，用户要求时给出生图预览提示词。

技能本身只是 Markdown、CSS/JS 和两个小脚本，不绑定模型。用 cc-switch 切换到其他模型供应商之后照样能用；只要客户端支持 Agent Skills（读取 `SKILL.md`）就行。

## 安装

把整个 `atelier-ui` 文件夹复制到客户端的技能目录：

- Claude Code：`~/.claude/skills/atelier-ui/`
- Codex：`~/.codex/skills/atelier-ui/`
- 用 cc-switch 统一管理技能时，也可以在 cc-switch 的技能管理里添加，再勾选要启用的客户端。

## 怎么用

直接描述需求，例如：

- 「给 API 计费控制台设计首页，要有高级感」
- 「做一个 i 按钮，点了按钮本身向右长成胶囊，显示回调地址，可以复制」
- 「这个后台的配色太土了，按我们的品牌色 #0f766e 重新推一套」
- 「先给我生图提示词，我自己用即梦出个预览」

也可以点名：「用 atelier-ui 做……」。想强制启用时，Claude Code 里输入 `/atelier-ui`，Codex 里输入 `$atelier-ui`。新装的技能要新开一个会话才会加载。

## 看样板页

样板页演示四种定位（墨、夜航、团子、瓷）推导出的整套风格，以及 11 个每一步都有反馈的组件（带实时读数）。动效图鉴 `examples/motion/` 演示 18 个动效模板：拆字入场、流式输出、荧光笔、滚动点亮、边框光束、扫光、极光底、点阵涟漪、视差、跑马灯、FLIP 重排、卡片展开、骨架屏、按压涟漪、彩纸、数据描绘、翻面卡、滑动卡堆；还有 5 个招牌场景：轨道球、擦除揭示、SVG 流程、SVG 路线、可交互图解。每个都写明用在哪、别用在哪。

```bash
python -m http.server 8080
```

在 `atelier-ui` 文件夹里运行上面的命令，然后用浏览器打开 `http://localhost:8080/examples/showcase/`（组件样板间）或 `http://localhost:8080/examples/motion/`（动效图鉴）。

样板页从 Google Fonts 加载字体；加载不到时退回系统字体，功能不受影响。

## 脚本

```bash
node scripts/palette.mjs --accent 32 --neutral 70 --tint 0.014 --chroma 0.17
```

```bash
node scripts/palette.mjs --brand "#0f766e" --neutral 190 --preview palette.html
```

```bash
node scripts/spring.mjs --presets
```

```bash
python scripts/qa.py http://localhost:8080/examples/showcase/ --widths 375,768,1280 --wait 4000
```

- `palette.mjs`：从几个旋钮推导整套颜色 token，附对比度报告；`--preview` 生成色板页。`--help` 看全部参数。
- `spring.mjs`：弹簧参数转成 CSS `linear()` 曲线、时长和 JS 用的刚度/阻尼。
- `qa.py`：按多个宽度截图，报告溢出、小点击区、过小文字、无名控件、控制台错误等。

要求：Node 18+；`qa.py` 需要 Python 3.9+ 和 Playwright（`pip install playwright`，再 `python -m playwright install chromium`；本机装了 Chrome 或 Edge 也可以直接用）。

## 目录

| 路径 | 内容 |
|---|---|
| `SKILL.md` | 技能入口：底线、流程、速查 |
| `references/` | 18 份方法文档：定位、配色、字体、图标与 Logo、圆角间距景深、动效、反馈、概念放大、特效、招牌交互场景、SVG 动画、组件、常见组件配方、多端、生图提示词、审查、来源、技术栈 |
| `assets/` | 零依赖的组件 kit：tokens、核心工具、隐形滚动条、配色引擎、11 个交互组件、17 组特效和动效模板（含轨道球、擦除揭示、SVG 工具） |
| `scripts/` | `palette.mjs`、`spring.mjs`、`qa.py` |
| `examples/showcase/` | 样板页：定位推导和交互组件 |
| `examples/motion/` | 动效图鉴：18 个动效模板、5 个招牌场景和选型表 |

## 出处

组件 kit 和样板页是原创代码。参考了 uiverse.io、ui.aceternity.com、reactbits.dev、motionsites.ai 上常见的技术和参数范围，没有搬运它们的代码或提示词原文；各站授权见 `references/sources.md`。「尽量让用户操作时每一步都有反馈」这条主张来自设计博主西瓜同学。
