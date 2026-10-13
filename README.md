# Reading Club 网站

一个可部署到 GitHub Pages 的简单静态网站：下次分享、往期记录、关键词搜索、PPT 下载和 PDF 链接。无需 npm、数据库或构建步骤。

网站地址：<https://Wangshuaiia.github.io/reading-club/>（首次 Pages 发布完成后可访问）。

**正式网站先使用空日程和空往期列表。下面的日期、主题、分享人均为填写示例；请用真实信息替换，没有附带真实 PPT。**

## 文件结构

```text
reading-club/
├── index.html       # 页面结构
├── style.css        # 外观与手机适配
├── app.js           # 展示内容和搜索
├── content.js       # 日常维护时编辑这个文件
├── .nojekyll        # 跳过 Jekyll 处理
├── README.md
└── slides/          # 上传 PPT、PPTX 和 PDF 到这里
```

## 1. 本地预览

直接用浏览器打开 `index.html`，就可以预览。如果希望用本地 HTTP 服务，在此文件夹内运行：

```sh
python3 -m http.server 8000
```

然后打开 <http://localhost:8000>。文件必须保留在同一目录中。

## 2. 第一次发布到 GitHub

1. 在 GitHub 新建一个仓库，例如 `reading-club`。公开仓库可使用 GitHub Free 的 Pages。
2. 将本文件夹内的文件上传到仓库根目录。首页 `index.html` 必须在根目录，不能再套一层 `reading-club/`。保留 `slides/` 文件夹。
3. `.nojekyll` 是隐藏文件，某些上传方式不会显示它。可以在 GitHub 的 **Add file → Create new file** 中创建同名文件，填一行 `# Static website` 后保存；只要文件存在即可。
4. 打开仓库 **Settings → Pages**。
5. 在 **Build and deployment → Source** 选择 **Deploy from a branch**，分支选择 `main`，目录选择 **/ (root)**，点击 **Save**。如果你的默认分支不叫 `main`，选实际上传文件的分支。
6. 等待发布完成，Pages 设置页会显示实际网址。个人账号的项目站点通常为 `https://你的用户名.github.io/reading-club/`。

官方说明：[配置 Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 3. 每两周如何更新

### 发布下一次分享

在 GitHub 打开 `content.js`，点击编辑，将 `next` 改为真实的安排。下面是填写示例，日期与内容需要自己替换：

```js
next: {
  date: "2026-10-27",
  title: "这次的书籍或论文标题",
  speaker: "分享人姓名",
  time: "19:00–20:00（Europe/Stockholm）",
  location: "线上会议链接或线下地点",
  summary: "请提前阅读第 1–3 章。讨论问题：作者的核心论点是什么？",
  readingUrl: "https://example.com/paper",
  slides: "",
  pdf: ""
},
```

`location` 显示为文字，会议网址可以复制打开；`readingUrl` 显示为可点击的阅读材料链接。示例时区不是你们的固定时区，请按实际情况填写。

### 归档已经讲过的内容

1. 将演示文稿上传到 `slides/`，例如 `2026-10-27-topic.pptx`。建议同时导出并上传 PDF，方便在浏览器里阅读。
2. 在 `archive: [` 后面加一条记录。下面这条要放在数组内，保留后面的逗号：

```js
{
  date: "2026-10-27",
  title: "这次的书籍或论文标题",
  speaker: "分享人姓名",
  summary: "这次讨论的重点和收获。",
  tags: ["论文", "方法"],
  readingUrl: "",
  slides: "slides/2026-10-27-topic.pptx",
  pdf: "slides/2026-10-27-topic.pdf"
},
```

3. 同时将 `next` 更新为两周后的新安排；暂时没有安排时可以写 `next: null`。
4. 保持 `demo: false`；只填写已经确认的日程和真实的往期记录。
5. 提交保存。GitHub Pages 会在发布流程完成后更新网站，**不是保存后立即更新**。

网站按日期从新到旧排列往期记录。日期已经过去时会提醒更新下一期，**不会自动移动记录、自动增加 14 天或自动上传文件**。

## 填写注意

- 资料未上传时把链接留为 `""`；页面显示“资料待上传”，不会显示无效的下载按钮。
- 相对路径用 `slides/文件名.pptx`，前面不要加 `/`，否则项目站点可能会找错位置。文件名和大小写必须与上传文件一致。
- 推荐用英文、日期和连字符命名文件，避免空格。
- 文本使用双引号包裹；内容里的双引号要写成 `\"`；换行可写成 `\n`。保留对象和数组之间的逗号。
- `slides`、`pdf` 和 `readingUrl` 也支持完整的 `https://` 链接。跨站 PPT 链接可能打开下载页面，而不是直接下载。
- PPT/PPTX 按下载方式提供；PDF 是否直接预览取决于浏览器设置。
- 网页访客只能阅读。资料更新通过 GitHub 的上传和编辑操作完成，不提供网页上传或登录管理功能。

GitHub 浏览器上传单个文件上限为 25 MiB，普通 Git 推送超过 100 MiB 的单文件会被拒绝。较大的 PPT 可以先压缩，或放在 GitHub Release 中，再填写该文件的完整下载链接。[文件大小官方说明](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)。

这份方案按公开分享设计，发布的网站和资料可被访问。仅把仓库设为私有并不等于 Pages 网站也变为私有；若需要成员专用访问，应另选有身份验证的托管方案。[Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。
