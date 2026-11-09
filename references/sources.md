# 来源与授权

核对日期 2026-11-09。授权会变，正式商用前打开原站再看一遍。

## 1. 四个组件网站

| 网站 | 是什么 | 授权要点 | 怎么取用 |
|---|---|---|---|
| uiverse.io | 社区上传的 UI 元素：按钮、卡片、加载、开关、输入框、提示等，大多是 HTML + CSS，几乎不用 JS | MIT，署名是鼓励不是要求 | 每个文件开头有 `<!-- From Uiverse.io by 作者 -->`，复制时保留这行 |
| ui.aceternity.com | React + Tailwind + motion 的动效组件：背景、卡片、文字、导航、3D | 免费部分：个人和商用都可以，不能把组件当成竞品组件库转售或再分发（来自定价页 FAQ，没有单独的授权文件）。付费部分是专有授权 | `npx shadcn@latest add @aceternity/<名字>`；索引 `https://ui.aceternity.com/registry.json` |
| reactbits.dev | 约 218 个 React 动效组件：文字动画、背景、微交互，有 Vue / Svelte 移植 | MIT + Commons Clause：做进自己的应用和网站可以商用；不能出售、转授权或再分发组件本身（单独、打包或移植都不行） | `npx shadcn@latest add @react-bits/SplitText-TS-TW`；索引 `https://reactbits.dev/r/registry.json` |
| motionsites.ai | 付费的「网站设计提示词」库，没有代码 | 专有：可以用提示词做网站并出售网站；不能转售、转载或抓取提示词原文 | MCP：`https://motionsites.ai/api/mcp`（OAuth 登录） |

### 蒸馏的规则

- **学技术和参数范围，自己实现**。本技能 kit 里的组件都是原创代码；特效家族和取值范围参考了这些网站的常见做法。
- 要直接用代码时：先确认授权允许；保留作者注释；在交付里按第 4 节的模板记录出处。
- motionsites 的提示词只学结构（按意图命名的缓动 token、逐元素的动效表、按设备开关、负面约束），不复制原文。本技能 image-prompts.md 和 motion.md 的模板是自己写的。
- 不要把这些网站的组件整理成一个新的组件库再发布，Aceternity 和 React Bits 的授权都不允许。

### 去哪个网站找什么

| 想要 | 先看 |
|---|---|
| 纯 CSS 的按钮、开关、加载、复选框 | uiverse.io（按 tag 搜：animated、glassmorphism、neumorphism、3d、gradient） |
| 首屏背景、聚光卡片、3D 卡片、滚动叙事 | ui.aceternity.com |
| 文字动画、WebGL 背景、弹性微交互（长按、滑动提交、果冻单选） | reactbits.dev（Text Animations、Backgrounds、Micro 分类） |
| 整页的视觉方向、首屏结构、动效节奏描述 | motionsites.ai |

## 2. 西瓜同学

设计主张「尽量让用户操作时每一步都有反馈」来自博主西瓜同学（抖音），是 feedback.md 四拍结构的出发点。本技能没有复制他的任何作品；示例页的组件是按这条主张原创的。引用这条主张时注明出处。

## 3. 其他素材

- **图标、Logo**：icons-logos.md（Lucide ISC，Tabler / Phosphor / Heroicons MIT，Material Symbols Apache-2.0；LobeHub Icons MIT；Simple Icons CC0；iconfont 按上传者条款，不能二次上传、转售、用于训练）。不管文件是什么授权，Logo 的商标权都属于品牌方。
- **字体**：typography.md 第 3 节（OFL 可放心嵌入；厂商免费字体读条款；商业字库要买）。
- **照片和插画**：用户自己的、明确可商用的图库，或者生成的图。不要把别人作品集里的图放进交付物。

## 4. 出处记录模板

用到任何外部代码、图标或字体时，在交付说明里写一条：

```
来源网址：
具体素材：组件名 / 图标名 / 字体名
作者：
授权或档位：MIT / OFL / 免费档 / 付费档……
核对日期：
依赖：motion、gsap、three……
复制了哪些文件或哪几行：
改动了什么：
署名方式：
品牌或字体的额外说明：
```

## 5. 没有核实的

- 中国大陆的访问情况没有实测（unpkg、jsDelivr、GitHub、Google Fonts）。npmmirror 是阿里运营的镜像，国内一般可用。
- Aceternity Labs、React Bits Pro、Uiverse Design 的付费授权条款没有逐条读过。
- motionsites 的付费提示词没有看过；它的 MCP 页写「500+」个提示词，公开接口返回 742 条。
- 西瓜同学的主页链接没有逐个视频看过，只依据用户提供的截图和这条主张。
