# Confluence Markdown Editor

> A Chrome extension that provides a markdown editor for Confluence.

**Confluence Markdown Editor** 是一个 Chrome 浏览器的扩展，为 Confluence Wiki 页面提供一个 Markdown 编辑器。

## FBI Warning

1. **由于开发环境所限，此插件不保证在任何版本的 wiki 上都可以正确工作。**
2. **目前的版本仅做 Markdown 基础语法支持，和附件上传支持**
3. **尚不支持 Markdown 高级语法，如：数学公式等。**
4. **尚不支持编辑操作，即：读取原有的文章内容且渲染无误。**

## 安装

1. 在线安装：[Google Chrome Web Store]()
2. 本地安装：见**本地安装**部分。

**强烈推荐使用在线安装方式安装，可以得到即时的版本更新，获得更好的体验。**

## 配置

插件在安装完成后，会自动打开配置页面，输入相关配置后点击保存按钮保存配置信息。

在打开的配置页面上填入上 **Host** 和 **API** 两个字段：

* Host: 插件将会在对应的域名下生效，如：https://wiki.example.com。
* API: 对应 Host 域名的接口请求地址，如：https://wiki.example.com。

如果你同时使用多个 wiki，可以点击添加按钮来添加其它站点的配置。

![image](https://user-images.githubusercontent.com/22412818/146127170-36a79e84-c040-43e0-8042-566fd4d2b03c.png)

## 使用 Markdown

找到你要编辑的文章，点击右上侧编辑工具栏出现的 `Markdown` 字样的按钮（如果没有请刷新页面）则会在新的标签中打开一个编辑器，在这个编辑器里输入 Markdown 即可。

输入完成后点击右上方`保存`按钮，回到 wiki 的页面上刷新可以查看效果。

## 注意！！！

1. 如果你打算**新建一篇文章**，则需要点击创建以后，在新的文章页面点击保存，通常浏览器会自动跳转回你的新文章的预览界面，此时再点击此插件提供的 `Markdown` 按钮才能正常工作。

## 参与开发

此插件在以下环境中编写及测试，建议使用相应版本或更高的版本。

* Node.js: v16.13.1
* npm: v8.1.2

```bash
# 1. 克隆或下载压缩包并解压后进入到项目目录下。
git clonehttps://github.com/lvxianchao/confluence-markdown-editor.git

# 2. 执行以下命令
npm install && npx mix watch
```

## 本地安装

两种方式：
1. 以开发者方式执行相关命令后，会在项目目录里生成 `dist` 文件夹，打开 Chrome 扩展的开发者模式，加载这个文件夹。
2. 在 Release 页面直接下载 `.crx`，拖放到浏览器里安装。