# 图标与品牌 Logo

## 1. 界面图标：一个产品只用一套

| 库 | 授权 | 风格 | 适合 |
|---|---|---|---|
| Lucide | ISC | 线性，2px 描边，圆头 | 默认首选，通用产品 |
| Tabler Icons | MIT | 线性，描边可调，另有填充版 | 后台、数据产品 |
| Phosphor | MIT | 6 种字重（thin 到 fill，含 duotone） | 需要跟字重匹配、需要双色 |
| Heroicons | MIT | outline / solid / mini，数量较少 | Tailwind 项目 |
| Material Symbols | Apache-2.0 | 可变字体：粗细、填充、圆角、光学尺寸 | Android 风格、Compose |
| Remix Icon | 4.x 起是自有协议，不能当 Logo 用、不能转售图标包 | 线性 + 填充成对 | 读完协议再用 |

规则：
1. **尺寸跟文字走**：14px 文字配 16px 图标，16px 配 20px，标题配 24px。一个界面最多三档尺寸。
2. **描边跟字重走**：正文 400 配 1.5–2px 描边；细字体配细描边。Phosphor 和 Tabler 能调，其他库挑最接近的那套。
3. **选中态换成同库的填充版**，不只是换颜色；形状不能变。
4. **可访问**：纯图标按钮要有 `aria-label`；装饰图标加 `aria-hidden="true"`；内联 SVG 加 `focusable="false"`，颜色用 `currentColor`。
5. **不拿 emoji 当界面图标**：各平台长得不一样，颜色和描边也控制不了。
6. **图标动效只用在状态变化**：菜单 ↔ 关闭、播放 ↔ 暂停、复制 → 对勾、刷新转一圈，300ms 以内。除了加载转圈，图标不做常驻动画。

## 2. 品牌 Logo：绝不凭记忆画

不画、不用几何图形「近似」、不改比例和颜色。拿不到真文件时，放一个写着品牌名的占位方块，并告诉用户这里缺 Logo。

### AI 模型和厂商：LobeHub Icons（icons.lobehub.com）

```
https://unpkg.com/@lobehub/icons-static-svg@latest/icons/<slug>.svg
https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/<slug>.svg   国内镜像
https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@latest/icons/<slug>.svg
```

- **变体后缀**：无后缀 = 单色（`fill="currentColor"`）；`-color` 彩色；`-text` 文字标；`-text-cn` 中文文字标；`-brand` / `-brand-color` 图标 + 文字组合。不是每个品牌都有全部变体，比如 OpenAI 没有 `-color`（`openai-color.svg` 返回 404）。
- **单色版放进 `<img>` 会是黑色**。要跟随主题变色，就内联 SVG，或者用 PNG/WebP 包：`@lobehub/icons-static-png` 的 `light/<slug>.png`（黑色图形，放浅色底）和 `dark/<slug>.png`（白色图形，放深色底），640×640。
- **查 slug**：`https://cdn.jsdelivr.net/gh/lobehub/lobe-icons@master/src/toc.json`。文件名 = `id` 转小写（`DeepSeek` → `deepseek`）；`param.hasColor` 等字段说明有哪些变体；`color` 是品牌主色。文档页的 slug 可能不同（`open-ai`、`deep-seek`）。
- **React**：`@lobehub/icons` 提供 `<Claude.Color />`、`<ModelIcon model="gpt-4o" />`、`<ProviderIcon />`。
- 正式上线把 `@latest` 换成固定版本号，或者把文件下载下来自托管。

### 其他品牌：Simple Icons

- 约 3500 个品牌（2026 年 11 月为 3470 个），图形数据是 CC0（商标权仍属品牌方）。
- `https://cdn.simpleicons.org/<slug>` 品牌色；`/<slug>/<hex>` 自定义颜色；`/<slug>/<浅色>/<深色>` 跟随系统深浅色。
- 不带填充色的原文件：`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/<slug>.svg`；slug 列表在 `.../data/simple-icons.json`。
- AI 相关已收录 anthropic、claude、deepseek、googlegemini、mistralai、ollama、huggingface、qwen 等；没有 openai。

### 补缺：Iconify

- `https://api.iconify.design/logos/openai-icon.svg`；搜索 `https://api.iconify.design/search?query=deepseek`。
- `logos` 集是彩色品牌图标。国内构建时从 npmmirror 取集合数据：`https://registry.npmmirror.com/@iconify-json/logos/latest/files/icons.json`。
- 每个集合授权不同，用之前看集合的 license 字段。

### iconfont.cn

- 适合：插画、多色图标、Lottie 动效、国内品牌的非官方图标，还有项目内的彩色字体。
- 用法优先 Symbol 方式（`<svg><use href="#icon-xxx">`），支持多色。项目每次更新链接 hash 都会变，正式上线下载下来自托管。
- 注意：品牌 Logo 大多是用户上传，没有品牌方授权。平台协议禁止二次上传、转售和用于模型训练，还要遵守每个上传者自己的条款。

## 3. 商标规则（不管文件是什么授权）

- 只用来指代这个品牌（「支持 Claude」「用微信登录」），不暗示合作或背书。
- 保持比例和留白，不加描边、阴影、渐变，不旋转，不改颜色。只用官方提供的单色或反白版本。
- 有官方 press kit 时优先用官方文件。
- 模型选择器、厂商列表这类场景：统一用单色版或 avatar 版，放进同尺寸方框（20–24px），视觉重量才一致；彩色版留给单独展示品牌的位置。
