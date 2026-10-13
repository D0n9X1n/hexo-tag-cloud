# 自定义

[English](Customization) · **简体中文**

站点 `_config.yml` 中的 `tag_cloud:` 配置块控制标签云的外观；配合 `inject`，
还能决定标签云如何加入页面。

## 配置项参考

| key | 默认值 | 类型 | 说明 |
|---|---|---|---|
| `textFont` | `"Helvetica"`（v3 会自动追加 CJK 后备字体栈） | 字符串 | 标签文字的字体栈；含空格的字体名需加引号 |
| `textColor` | `"#333"` | CSS 颜色 | 标签文字颜色 |
| `textHeight` | `15` | px | 标签文字大小 |
| `outlineColor` | `"#E2E1C1"` | CSS 颜色 | 当前激活标签的轮廓颜色 |
| `maxSpeed` | `0.03` | 浮点数 | 旋转速度上限（取值 0–1，越小越慢） |
| `pauseOnSelected` | `true` | 布尔值 | 鼠标悬停在标签上时暂停旋转 |
| `inject` | `false` | 布尔值 | 与主题无关的模式：通过 Hexo 的 injector 把标签云加到每个页面，无需修改模板（见 [安装 → 注入模式](Installation-zh-CN)） |
| `mount` | 常见主题的侧边栏选择器 | 字符串 | 仅用于注入模式：以逗号分隔的 CSS 选择器，按顺序尝试，标签云放入第一个匹配的元素 |

非有限的数值（如 `textHeight: 20px`）会回退为默认值，而不会让标签云出错；
布尔值也接受 `"true"` / `"false"` 字符串。其他配置项会被忽略。

```yaml
# 在每个页面中把标签云注入到自定义容器：
tag_cloud:
  inject: true
  mount: '#my-widgets, aside'
```

## CJK 字体后备（v3.0.0）

如果 `textFont` 只填了一个字体名（不含逗号），插件会**自动追加**一组跨平台的
CJK 后备字体栈（`PingFang SC`、`Hiragino Sans GB`、`Microsoft YaHei`、
`Source Han Sans CN`、`Noto Sans CJK SC`、`sans-serif`）。这样，主字体缺少的
非拉丁字符会依次交给后面的字体渲染，而不会显示成 `□`。

如果填的是多个字体（含逗号），则原样使用——想完全自己掌控字体的用户可以借此绕过自动追加。

```yaml
# 单个字体 —— 自动追加 CJK 字体栈：
tag_cloud:
  textFont: "Trebuchet MS"

# 多个字体 —— 原样传递：
tag_cloud:
  textFont: "'Comic Sans MS', sans-serif"
```

## 画布尺寸

使用受管代码块时，画布尺寸写在主题模板里。可在安装时通过 `--canvas-width`、
`--canvas-height` 和 `--canvas-style` 设置（默认分别为 `250`、`250`、
`width: 100%;`）；之后要修改，带上 `--apply --force` 重新运行即可。
注入模式始终使用 250×250 的画布，并拉伸到容器宽度。

## 配置示例

### 纯色深色主题

```yaml
tag_cloud:
  textColor: "#fff"
  outlineColor: "#222"
  textHeight: 18
```

### 慢速平稳

```yaml
tag_cloud:
  maxSpeed: 0.01
  pauseOnSelected: true
```

### 自托管 CJK 字体

```yaml
tag_cloud:
  textFont: "'Noto Sans CJK SC', sans-serif"
```

（需在主题 CSS 中添加 `@font-face` 声明，指向自托管的 Noto Sans CJK woff2
文件。末尾的 `, sans-serif` 会关闭自动追加的后备字体栈。）

## 兼容 ESM 的配置

`tagcloud.js` 是一个普通的副作用脚本（没有 `import/export`），`tagcanvas.js`
则是上游 TagCanvas 的 IIFE。两者都输出到 `public/js/` 下，需要通过
`<script src="...">` 加载（不能用 `import`）。`tag_cloud` 配置块不需要任何额外的
ESM 接入工作。
