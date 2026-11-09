# 生图提示词：先出预览图再写代码

**只在用户明确要求时用**：「先给我生图提示词」「我自己用 MJ / 即梦出个预览」。用户没提就不主动给，也不替用户去调用生图工具。

## 1. 先知道生图模型的短板

- **文字**：小字、长句、中文最容易乱码。只写短标题（中文 ≤8 个字），用引号括起来；正文一律写成「灰色文字行」。
- **密度**：区域太多会糊成一团。一张图 6–8 个区域就够。
- **字体名**：模型不认识大多数字体名。写字形特征：「高对比衬线」「几何无衬线」「圆润粗体」。
- **数字和图表**：会画出不合逻辑的数据。写「简单的柱状图」，不写具体数值。
- **Logo**：会编造假 Logo。写「左上角一个简单的方形标志」或者干脆不要。

## 2. 结构（按顺序写）

1. **主体**：什么界面 + 什么设备 + 画幅
2. **定位**：一句话 + 3 个形容词（来自 positioning.md 的简报）
3. **布局**：从上到下、从左到右，6–8 个区域
4. **文字**：只给要出现的短标题，用引号
5. **Token**：颜色 hex + 角色、圆角、阴影、字形特征（来自 palette.mjs 的真实输出）
6. **一个交互瞬间**：一个悬停、一个 toast、一个展开的胶囊，让画面看起来是「活的」
7. **呈现**：平面截图（正面、无透视）还是设备样机（场景、光线）
8. **质量词**：对齐网格、留白充足、清晰
9. **负面词**
10. **参数**：画幅、风格强度等（按工具写）

做设计参考时优先**平面正面截图**，看得清布局和比例；给别人展示时才用样机。

## 3. 中文模板

```
【主体】一张{产品类型}的{页面名}界面设计图，{桌面浏览器 16:10 / 手机竖屏 9:19.5}，正面平视，平面 UI 截图
【定位】{一句话定位}，气质：{形容词 1}、{形容词 2}、{形容词 3}
【布局】顶部{…}；左侧{…}；主区域{…}；右侧{…}；底部{…}
【文字】只出现这些文字：「{标题}」「{按钮}」；其余文字用灰色横线代替
【配色】背景 {#hex}，卡片 {#hex}，主文字 {#hex}，次要文字 {#hex}，强调色 {#hex} 只用在{主按钮和选中态}，点缀色 {#hex}
【形状】{圆角描述}；{阴影或描边描述}；{字形描述}
【细节】{一个交互瞬间}
【质量】对齐网格，留白充足，层级清晰，高清
【不要】乱码文字，lorem ipsum，假 Logo，水印，紫蓝渐变光晕，浏览器边框，透视变形，杂乱的装饰
```

## 4. English template

```
UI design screenshot of a {product type} {screen name}, {desktop browser 16:10 / phone portrait 9:19.5}, flat front view.
Positioning: {one line}. Mood: {adjective}, {adjective}, {adjective}.
Layout: top {…}; left {…}; main area {…}; right {…}; bottom {…}.
Text: only these words appear: "{title}", "{button}"; all other text is shown as gray placeholder lines.
Colors: background {#hex}, cards {#hex}, primary text {#hex}, secondary text {#hex}, accent {#hex} used only on {the primary button and selected state}, highlight {#hex}.
Shape: {radius}; {shadow or hairline}; {type character, e.g. geometric sans with a monospace for numbers}.
Detail: {one interaction moment}.
Crisp, grid-aligned, generous whitespace, clear hierarchy.
Negative: garbled text, lorem ipsum, fake logos, watermark, purple-blue gradient glow, browser chrome, perspective distortion, clutter.
```

## 5. 各工具的写法

- **Midjourney**：画幅 `--ar 16:10` / `--ar 9:19`；负面词用 `--no garbled text, watermark, logo`；英文提示通常更稳。
- **Stable Diffusion / Flux 一类**：负面词放进单独的 negative prompt 框；分辨率直接设宽高。
- **GPT 生图 / Gemini 一类**：整段自然语言描述，负面要求写成一句「不要出现……」；尺寸在界面或参数里选。
- **即梦、豆包、通义万相等国内模型**：中文提示可以直接用；它们渲染中文短标题通常比英文模型好，但仍要先试一张。
- 不确定某个工具的参数时，只给通用的段落式提示 + 画幅，并让用户在工具界面里选尺寸。

## 6. 一组三张

需要一套参考时给三张，**每张都重复同一行配色和形状**，风格才一致：
1. 首屏 / 营销页（看气质和招牌特效）
2. 核心功能页的一个关键状态（看信息层级）
3. 手机版同一功能（看多端适配）

## 7. 示例：开发者 API 控制台（夜航，深色）

配色来自 `node scripts/palette.mjs --neutral 255 --tint 0.012 --accent 125 --chroma 0.19 --spice 295 --spice-chroma 0.14 --mode dark`。

```
【主体】一张开发者 API 控制台的「用量」页面界面设计图，桌面浏览器 16:10，正面平视，平面 UI 截图
【定位】给开发者看调用量和账单的控制台，冷静、精确、信息密
【布局】左侧窄图标栏；顶部一行面包屑和时间范围切换；主区域上方三张数据卡（调用次数、费用、错误率），
       中间一张折线图，下方一张紧凑的请求日志表；右上角一个复制 API 密钥的胶囊按钮
【文字】只出现这些文字：「用量」「复制密钥」；其余文字用灰色横线代替
【配色】背景 #0c1015，卡片 #161a1f，分割线 #262b31，主文字 #eaeff5，次要文字 #b5bbc2，
       强调色荧光绿 #c1f354 只用在折线和选中的时间范围，点缀紫 #8a6fcd 只用在一个标签上
【形状】小圆角 6–12px；卡片用 1px 细线和顶部一道很淡的亮边分层，没有投影；几何无衬线字体，数字用等宽字体
【细节】复制密钥的胶囊刚展开，末端显示一个对勾
【质量】对齐网格，留白克制，层级清晰，高清
【不要】乱码文字，lorem ipsum，假 Logo，水印，紫蓝渐变光晕，浏览器边框，透视变形，霓虹过曝
```

## 8. 拿到图之后

- **看什么**：布局层级、颜色比例、留白、有没有一处记得住的细节。
- **忽略什么**：乱码、错误的数字、不一致的小图标。这些是生图模型的毛病，不是设计问题。
- **不要用吸管取色**：图里的颜色被压缩过，对比度也不保证。读出色相方向，再用 `scripts/palette.mjs` 重新推导。
- **改图**：每次只改一个变量（比如只把圆角调大，或只把强调色从绿换成琥珀），否则分不清是哪一处让它变好或变差。
- 图只是参考。真正的规范以 tokens、组件和 qa.py 的结果为准。
