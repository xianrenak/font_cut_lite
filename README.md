# FontCutLite

FontCutLite 是一个本地运行的 HTML5 位图字体切图工具，可将固定网格的字体图片转换为 AngelCode `.fnt` 或 XML 描述文件，适合 Godot 等游戏引擎中的位图字体工作流。

[![GitHub license](https://img.shields.io/github/license/xianrenak/font_cut_lite)](https://github.com/xianrenak/font_cut_lite/blob/main/LICENSE)

![FontCutLite 截图](docs/images/font-cut-lite-screenshot.png)

## 适用场景

在游戏开发中，TTF 矢量字体不一定适合所有 UI 风格，尤其是图标字体、装饰字、像素字和 AI 生成的特殊字符素材。FontCutLite 解决的是从“已有位图字体图片”到“引擎可读取字体描述文件”的转换问题。

你可以先用 AI 绘图工具、像素编辑器或设计软件生成一张规则网格的字符图片，再用 FontCutLite 配置字符尺寸、内边距和字符列表，最后导出 `.fnt` 或 XML 文件。

## 核心功能

- 支持从本地浏览器直接运行，无需上传素材。
- 支持导入固定网格的位图字体图片。
- 支持自定义字符宽度、字符高度和四向内边距。
- 支持填写自定义字符列表，包括中文、Emoji 和图标字符。
- 支持预览单个字符切片效果。
- 支持文本预览，便于检查整体排版。
- 支持导出 AngelCode `.fnt` 文本格式。
- 支持导出 XML 格式。
- 自动保存编辑状态，刷新页面后可继续调整。

## 本地运行

本项目没有构建步骤，可以直接打开 `index.html`：

```sh
open index.html
```

如果浏览器的本地文件策略影响图片加载，可以启动一个本地静态服务器：

```sh
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000/
```

也可以通过 URL 参数自动加载指定图片：

```text
http://localhost:8000/?image=tests/assets/comic_font_img.png
```

如果需要在加载测试图片前清空浏览器中保存的编辑状态，可以追加 `reset=1`：

```text
http://localhost:8000/?reset=1&image=tests/assets/comic_font_img.png
```

## 使用流程

1. 准备一张按固定网格排列的位图字体图片。
2. 打开 FontCutLite，点击 `Open an image` 导入图片。
3. 在 `Font Settings` 中设置字符宽度、字符高度和内边距。
4. 在 `List of glyphs` 中填写图片对应的字符列表。
5. 切换到 `Preview` 检查每个字符的切片效果。
6. 使用右侧文本预览面板检查实际排版。
7. 切换到 `Output`，复制生成的 `.fnt` 或 XML 内容。

## Godot 集成建议

1. 在 Godot 项目中创建一个 `.fnt` 文件。
2. 将 FontCutLite 生成的 `.fnt` 内容复制到该文件中。
3. 将字体图片与 `.fnt` 文件放在同一目录。
4. 保持图片文件名与 `.fnt` 文件中 `page file` 字段一致。
5. 如果更新了图片或字体描述文件，请在 Godot 中执行重新导入。

## 图片素材建议

- 字符应按固定宽高网格排列。
- 每个网格中只放一个字符或图标。
- 如果需要描边、阴影、发光或加粗效果，建议直接预渲染到图片中。
- 如果目标引擎对彩色位图字体支持有限，建议先用少量字符测试渲染效果。
- 图片背景可以使用透明背景；如果使用纯色背景，请确认目标引擎的导入设置符合预期。

## 自动字距

FontCutLite 会根据当前字符的平均 `xadvance` 生成保守的 kerning pairs。计算规则如下：

```text
strong = -round(avg_xadvance * 0.14)
medium = -round(avg_xadvance * 0.10)
light  = -round(avg_xadvance * 0.06)
```

只有当前字符列表中存在的字符组合才会被写入导出结果。

## 测试素材

仓库中包含一张示例位图字体图片：

```text
tests/assets/comic_font_img.png
```

建议使用以下设置：

```text
Char Width: 160
Char Height: 196
```

可以将以下内容粘贴到 `List of glyphs` 中进行测试，最后一行数字后包含一个空格字符：

```text
ABCDEFGHIJKLM
NOPQRSTUVWXYZ
abcdefghijklm
nopqrstuvwxyz
0123456789 
!@#$%^&*()?
+-=_|/\<>~
[]{};:'"`,.
⚔️🗡️🏹🛡️🪄🎯💥💀▲▼◀▶↑↓←→
```

## 已知限制

- 不会动态生成加粗、斜体、描边或阴影效果。
- 不会自动识别非规则网格中的字符边界。
- `.fnt` 格式本身对复杂字体排版能力有限，不适合替代完整的文本排版系统。
- 多色图片在部分引擎中可能受到字体材质或透明度处理影响，需要按目标引擎测试。

## 项目结构

```text
.
├── index.html          # 应用入口
├── js/fontcutter.js    # 主要逻辑、预览和导出功能
├── css/custom.css      # 本地样式
├── js/                 # 第三方浏览器库
├── css/                # Bootstrap 样式
└── fonts/              # Bootstrap 字体资源
```

## 来源与链接

- 原始项目：基于 FontCutter 改造
- Godot 官网：<https://godotengine.org/>

由 [xianrenak](https://github.com/xianrenak) 开发。
欢迎在 [X（Twitter）](https://x.com/xianrenak) 关注 Godot 开发与 AI 工作流相关内容。
