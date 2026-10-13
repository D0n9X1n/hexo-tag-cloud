# 故障排查

[English](Troubleshooting) · **简体中文**

## 画布空白

页面上出现了画布框，但里面没有旋转的标签。

1. **站点没有安装插件。** `package.json` 中必须包含
   `hexo-tag-cloud`（`npm install hexo-tag-cloud --save`）。否则不会生成
   `public/js/tagcloud.js`。缺少插件时，`npx hexo-tag-cloud install`
   会打印一条警告。
2. **画布里没有渲染任何内容。** TagCanvas 读取的是 `<canvas id="resCanvas">`
   *内部*的 `<a>` 链接。手写的代码片段需要在画布内放入
   `<%- tagcloud() %>`（EJS）、`{{ tagcloud() | safe }}`（Nunjucks）或
   `!= tagcloud()`（Pug）。从 v3.1 起，安装器写入的代码块已包含这一行；
   v3.0 写入的代码块没有，请重新运行
   `npx hexo-tag-cloud install --apply --force`。
3. **站点没有任何标签。** 只有当 `site.tags.length > 0` 时才会渲染该代码块。
   请在文章的 front-matter 中添加 `tags:`。
4. **构建产物过期。** 运行 `npx hexo clean && npx hexo generate`。

## 站点部署在子路径下时脚本返回 404

如果 `_config.yml` 中设置了 `root: /blog/`，脚本必须通过
`url_for('/js/tagcloud.js')` 加载，而不能硬编码为 `/js/tagcloud.js`。
受管代码块和注入模式会自动处理这一点；如果有手写的代码片段，请自行检查。

## 注入模式：标签云位置不对或没有出现

标签云会挂载到第一个匹配 `tag_cloud.mount` 的元素上。打开
DevTools，找到你想要的容器，然后设置它的选择器：

```yaml
tag_cloud:
  inject: true
  mount: '.my-sidebar'
```

如果没有任何元素匹配该选择器，就不会挂载。如果页面中已经存在由受管代码块生成的
`#resCanvas`，则不会再做任何处理。

## 中日韩 / 西里尔字母 / 非 ASCII 标签显示为方框

画布使用 `textFont` 字体栈绘制文字。如果 `textFont` 只指定了一个字体族，
会自动追加一组 CJK 回退字体（参见[自定义](Customization-zh-CN)）。
如果访客的设备上一个都没有安装，请自行托管一款字体并显式指定：

```yaml
tag_cloud:
  textFont: "'Noto Sans CJK SC', sans-serif"
```

标签链接由 Hexo 自带的 `tagcloud()` helper 生成（路径 A 和 B），
或由插件进行百分号编码（注入模式）。两种情况下，`/tags/中文/`
这类链接都能正确解析。

## 画布上出现 `&#43;` 或其他实体编码

原版 Hexo 输出的链接文本是经过实体编码的，浏览器会先解码，再交给
TagCanvas 读取。如果画布上出现了字面的实体编码，说明有构建插件重新序列化了
HTML，导致内容被转义了两次。常见原因是那些用 cheerio 处理每个页面的资源或
HTML 后处理插件。逐个禁用这些插件，即可找出问题所在。

## 安装器退出码

| 退出码 | 含义 | 解决方法 |
|---|---|---|
| 1 | 无法识别主题、没有内置配方，或模板引擎不受支持（`.jsx`） | 运行 `npx hexo-tag-cloud inspect`，然后传入 `--target <file>`，或使用 `tag_cloud.inject: true` |
| 2 | 受管代码块被手动修改过 | 保留你的修改，或运行 `--apply --force` |
| 3 | 存在没有标记的手写标签云 | 删除后重新运行，或保留它 |
| 4 | 目标模板不存在或无法写入 | 对照 `inspect` 的输出检查 `--theme-dir` / `--target` |

`_config.yml` 中嵌套形式的 `theme:` 映射无法被自动识别，请改为传入
`--theme <name>`。

## 仍未解决？

先搜索已有的 [issues](https://github.com/D0n9X1n/hexo-tag-cloud/issues)，然后
新建一个 issue，并附上：

- `npx hexo version` 的输出，以及你的主题名称和版本
- 你的 `tag_cloud:` 配置块
- `npx hexo-tag-cloud inspect` 的输出
- 一张截图
