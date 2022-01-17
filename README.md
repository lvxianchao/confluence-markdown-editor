# Confluence Markdown Editor

> [Confluence Markdown Editor](https://github.com/lvxianchao/confluence-markdown-editor) 是一个 Chrome 浏览器的扩展，为 Confluence Wiki 页面提供一个 Markdown 编辑器。

## 注意

1. **因开发环境有限，此插件不保证在任何版本的 wiki 上都可以正确工作。**
2. **目前的版本仅做 Markdown 基础语法支持，和附件上传支持**
3. **尚不支持 Markdown 扩展语法，如：数学公式等。**
4. 支持图片上传、附件上传。
5. 关于 **更新**，只支持读取此插件编辑过的内容，不支持从 wiki 的编辑页面编辑过的内容。

## 安装

1. 在线安装：[Google Chrome Web Store](https://chrome.google.com/webstore/detail/confluence-markdown-edito/jldbgellbepcpbggjfpmjafpggpkbgca?hl=zh-CN&authuser=0) 。
2. 本地安装：在 [Release](https://github.com/lvxianchao/confluence-markdown-editor/releases) 页面直接下载最新版本的 `.crx`，把后缀改名为 `.zip` 解压后拖放到浏览器的扩展管理页面里进行安装。

**强烈推荐使用在线安装方式安装，可以得到即时的版本更新，获得更好的体验。**

## 配置

> 插件在安装完成后，会自动打开配置页面，输入相关配置后点击保存按钮保存配置信息。

![options](https://user-images.githubusercontent.com/22412818/149041564-c3d3f692-4abe-4653-9f99-0ffdf5577151.png)

### 作用域

在这里可以配置此插件的作用域，即在哪些 **Host** 生效，及对应的 **API**

* Host: 插件将会在对应的域名下生效，如：https://wiki.example.com。
* API: 对应 Host 域名的接口请求地址，如：https://wiki.example.com。

如果你同时使用多个 wiki，可以点击添加按钮来添加其它站点的配置。

### 附件

#### 显示方式

这里可以选择附件的显示方式。

#### 容器

这里可以配置附件是否使用容器包裹等信息。

所谓容器，其实是以 wiki 自带的 **信息宏** 和 **提示宏**，将附件放在容器内显示，可能会达到一定的美化效果。

### Markdown 渲染主题

Markdown 渲染主题其实就是你所写的 Markdown 渲染到 wiki 页面上展示时所使用的主题。

此插件自带了一套 Markdown 渲染主题，并通过此功能支持你自己的自定义主题。

**主题地址** 必须是有效的 URL，**如果值为空，则使用默认主题进行渲染。**

#### 自定义主题

如果你想自定义主题，你的所有样式则 **必须** 在 **.confluence-markdown-editor-content** 之下，如：

```css
.confluence-markdown-editor-content {
    font-size: 20px;
    color: red;
}
```

推荐使用 Github 来作为主题承载的仓库，可以新建一个公有仓库，创建你的 CSS 样式文件，然后复制这个文件的原始地址，填写在配置里。

![image](https://user-images.githubusercontent.com/22412818/148865915-b09b5faa-c3b9-4696-91f6-86844190548c.png)

## 使用

找到你要编辑的文章，点击右上侧编辑工具栏出现的 `Markdown` 字样的按钮（如果没有请刷新页面）则会在新的标签中打开一个编辑器，在这个编辑器里输入你的 Markdown 内容。

输入完成后点击右上方`保存`按钮，回到 wiki 的页面上刷新可以查看效果。

![image](https://user-images.githubusercontent.com/22412818/148865165-8dec60d4-5e4a-4cff-83f3-da2ec6c06a52.png)

> 注意:
>
> 如果你打算 **新建一篇文章**，则需要点击创建以后，在新的文章页面点击保存，通常浏览器会自动跳转回你的新文章的预览界面，此时再点击此插件提供的 `Markdown` 按钮才能正常工作。

## 参与开发

此插件在以下环境中编写及测试，建议使用相应版本或更高的版本。

* Node.js: v16.13.1
* npm: v8.1.2

```shell
git clone https://github.com/lvxianchao/confluence-markdown-editor.git

npm install

npx mix watch
```
