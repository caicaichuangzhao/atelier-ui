# 字体与排版

## 1. 角色：最多两个字体家族 + 一个等宽

| 角色 | 用在 | 中文怎么办 |
|---|---|---|
| 展示 display | 大标题、数字大字、品牌口号 | 可以用中文 webfont，但只子集化标题用到的字 |
| 正文 text | 段落、表单、按钮、导航 | **永远用系统字体栈**，中文全量 webfont 动辄 5–20MB |
| 等宽 mono | 代码、密钥、金额表格、标签 | 等宽字体没有中文字形，中文会回退到正文字体 |

系统字体栈（tokens.css 的 `--f-sans`）：
`system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif`

## 2. 搭配方向（按定位选，不是固定组合）

| 方向 | 标题 | 正文 | 数字 / 代码 | 适合 |
|---|---|---|---|---|
| 编辑长文 | Newsreader、Source Serif 4、Literata；中文思源宋体 / Noto Serif SC | 系统黑体 | — | 出版、品牌故事 |
| 精密工具 | Geist、IBM Plex Sans、Onest | 系统字体 | Geist Mono、JetBrains Mono、IBM Plex Mono | 开发者、数据产品 |
| 圆润亲和 | Fredoka、Nunito、Baloo 2；中文站酷快乐体 | 系统字体 | — | 社区、儿童、打卡 |
| 硬件 / 系统感 | 系统字体（SF Pro、Segoe UI Variable、苹方、雅黑） | 同左 | `ui-monospace` | 硬件、系统级应用 |
| 文艺手作 | 霞鹜文楷；展示用得意黑 | 系统黑体 | — | 阅读、手作、小众品牌 |
| 奢品 | Cormorant、Playfair Display（大字号、细字重、字距放开） | 系统字体或 Manrope | — | 奢品、酒店 |
| 潮流 / 游戏 | Unbounded、Syne、Bricolage Grotesque；中文得意黑、站酷庆科黄油体 | 系统字体 | Martian Mono | 活动页、游戏 |

这几款被 AI 生成的页面用滥了：Inter、Space Grotesk、Instrument Serif、Fraunces。可以用，但要说得出理由（比如需要 Fraunces 的光学尺寸轴做超大标题），不能当默认。

## 3. 授权（必须核对）

- **SIL OFL 1.1，可放心网页嵌入和商用**：Noto Sans/Serif SC、思源黑体/宋体、霞鹜文楷、得意黑、站酷快乐体、站酷小薇、站酷庆科黄油体、马善政楷书，以及上表所有拉丁字体。
- **免费商用但是厂商自有协议**：阿里巴巴普惠体、HarmonyOS Sans、MiSans、OPPO Sans。用之前读一遍条款，交付时注明。
- **需要购买授权**：方正、汉仪、造字工房等商业字库。系统自带的微软雅黑、苹方只能通过 `font-family` 调用用户本机的字体，不能打包成 webfont 分发。
- 不确定授权的字体，不要写进交付代码。

## 4. 加载

- 国内用户多时不要直接链接 Google Fonts（大陆访问不稳定）。自托管：`npm i @fontsource/noto-serif-sc`（npmmirror 可用），这类包按 `unicode-range` 切片，浏览器只下载用到的片。
- 中文展示字体做子集：`pyftsubset Font.ttf --text-file=used.txt --flavor=woff2`（需要 `pip install fonttools brotli`）。
- `font-display: swap`；只 preload 首屏那一个字重。
- 回退字体用 `size-adjust` / `ascent-override` 对齐度量，减少字体换上时的跳动。
- 要按文字形状绘制（粒子、canvas）时，先 `await document.fonts.load('900 48px "Noto Serif SC"', text)` 再测量。fx/particles.js 已经这么做，最多等 2 秒。

## 5. 字号

- **产品界面**：12 / 14 / 16 / 18 / 20 / 24 / 30。桌面密集界面正文 14，其余 16。
- **营销页**：比例 1.25–1.333，大标题用 `clamp()`。tokens.css：`--fs-hero: clamp(2.8rem, 1.4rem + 6.5vw, 7rem)`。
- **手机**：正文 15–16px；输入框至少 16px，否则 iOS 聚焦时会自动放大页面。
- 最小字号 12px（qa.py 把小于 11px 的可见文字报出来）。

## 6. 行高、字距、行长

| | 中文 | 拉丁 |
|---|---|---|
| 正文行高 | 1.7–1.8 | 1.5–1.6 |
| 标题行高 | 1.25–1.35 | 1.05–1.2（全大写 ≥1.0） |
| 字距 | 0 | 大标题 −0.02 到 −0.04em；全大写小标签 +0.08 到 +0.16em |
| 行长 | 每行 28–40 字（`max-width: 40em`） | 60–75 字符（`max-width: 68ch`） |

- 字重最多三档：400 / 500 / 600–700。微软雅黑只有细、常规、粗三档，500 落到常规、600 直接变粗体，小字号下笔画发粘，所以正文别靠粗体堆层级。
- 数字：表格、价格、计时、计数一律 `font-variant-numeric: tabular-nums`，滚动数字才不会左右晃；密钥和验证码加 `slashed-zero`。
- 中英文混排：中文和英文、数字之间留一个空格。`text-autospace: normal` 在新浏览器里会自动加间隙，旧浏览器忽略这条属性，所以内容里仍建议手动加空格。
- 标点：中文用全角标点，引号全篇统一用「」或 “”。`text-spacing-trim` 可以挤压行首行尾标点，属于渐进增强。
- 换行：标题加 `text-wrap: balance`，段落加 `text-wrap: pretty`；网址、密钥加 `overflow-wrap: anywhere`。中文不要用 `word-break: keep-all`，它会禁止汉字之间换行，长句直接撑破容器。

## 7. 常见错误

| 错误 | 改成 |
|---|---|
| 一页用了四五种字体 | 一个展示 + 系统正文 + 一个等宽 |
| 中文正文用 webfont 全量加载 | 系统字体；webfont 只给标题，并子集化 |
| 层级全靠把字调淡 | 用字号、字重、留白；次要文字也要 ≥4.5:1 |
| 拉丁字距规则套在中文上 | 中文字距保持 0 |
| 价格、计数用比例数字，跳动时左右晃 | `tabular-nums` |
| 全大写长句 | 全大写只用于 1–3 个单词的标签 |
