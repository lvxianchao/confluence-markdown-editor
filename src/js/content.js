import $ from 'jquery';
import {v4 as uuid} from 'uuid';
import juice from "juice";
import axios from "axios";
import Editor from "@toast-ui/editor";

/**
 * 跨标签通信时的消息身份 ID
 *
 * @type {string}
 */
const id = 'chrome-extension-confluence-markdown-editor';

/**
 * 编辑文章的 ID
 */
let contentId;

/**
 * 生效域名配置信息
 */
let config;

/**
 * 主题地址
 */
let theme;

(async function () {
    window.opener.postMessage('init', '*');
    window.addEventListener('message', function (e) {
        if (e.data instanceof Object && e.data.id && e.data.id === id) {
            contentId = e.data.contentId;
            config = e.data.config;
            theme = e.data.theme;

            chrome.runtime.sendMessage({event: "getCookie", url: config.host}, response => {
                    let cookie = response.cookie;
                    delete cookie.hostOnly;
                    delete cookie.session;
                    cookie.url = config.host;
                    chrome.cookies.set(cookie);
                    work();
                }
            );
        }
    })
})();

/**
 * 初始化编辑器及其他工作
 */
function work() {
    window.Editor = new Editor({
        el: document.querySelector('#editor'),
        height: $('form').height() - 56 + 'px',
        initialEditType: 'markdown',
        previewStyle: 'vertical',
        usageStatistics: false,
        hideModeSwitch: true,
        hooks: {addImageBlobHook},
    });

    // 向页面渲染用户信息
    user();

    // 文章详细信息（标题 + 版本号）
    content();

    // 文章 Markdown 原文
    markdown();

    // 保存
    $('#save').on('click', function () {
        window.saveContentLayerIndex = layui.layer.load(1);

        // 读取主题
        axios.get(theme ? theme : '../themes/purple.css').then(res => {
            updateContent(res.data);

            updateMarkdown();
        }).catch(error => {
            log('读取主题失败', error);
            msg("读取主题失败");
        }).finally(() => {
            layui.layer.close(window.saveContentLayerIndex);
        });
    });
}

/**
 * 编辑器上传图片 HOOK
 *
 * @param file 文件对象
 */
function addImageBlobHook(file) {
    // 修改图片名称 file.name
    const filename = (new Date()).getTime() + '.' + file.type.replace('image/', '');
    file = new File([file], filename);

    let form = new FormData();
    form.append('file', file);

    axios.post(`${config.api}/rest/api/content/${contentId}/child/attachment`, form, {
        headers: {
            'X-Atlassian-Token': 'nocheck',
        },
    }).then(res => {
        insertImageMarkdownToEditor(filename);
    }).catch(error => {
        // 处理图片重复上传
        let res = error.response;
        let messageStartsWith = "Cannot add a new attachment with same file name as an existing attachment: ";
        if (res.status === 400 && res.data.message.startsWith(messageStartsWith)) {
            insertImageMarkdownToEditor(filename);
        } else {
            log("上传图片发生未知错误", res);
            return msg(res.data.message);
        }
    });
}

/**
 * 向编辑器内插入传的图片 markdown 文本
 * @param filename 图片文件名称
 */
function insertImageMarkdownToEditor(filename) {
    let url = `${config.host}/download/attachments/${contentId}/${filename}`;

    let markdown = `\n![${filename}](${url})\n`;

    window.Editor.insertText(markdown);
}

/**
 * 将编辑获取到的 HTML 转换成 Wiki 标签
 *
 * @param styledHtml
 * @param attachmentConfig
 * @returns {*}
 */
function convertHTMLTags(styledHtml, attachmentConfig) {
    let dom = $(`<div>${styledHtml}</div>`);

    // 处理图片
    dom.find('img').each(function () {
        // 图片和文件
        let confluenceImageHTML = '';
        let src = $(this).attr('src');
        let alt = $(this).attr('alt');

        confluenceImageHTML = convertImgToConfluenceHTML(src, alt);

        $(this).replaceWith(confluenceImageHTML);
    });

    // 处理代码块
    let codes = [];
    dom.find('code').each(function () {
        if ($(this).parent().prop('tagName') === 'PRE') {
            let language = '';
            if ($(this).attr('class')) {
                language = $(this).attr('class').replace('language-', '');
            }
            let code = $(this).text();
            let html = convertCodeToConfluenceHTML(language);
            $(this).parent().replaceWith(html);
            codes.push(code);
        }
    });

    let html = dom.html();

    // 处理代码块
    codes.forEach(function (code) {
        html = html.replace('<ac:plain-text-body></ac:plain-text-body>', `<ac:plain-text-body><![CDATA[${code}]]></ac:plain-text-body>`);
    });

    // 处理水平线
    html = html.replaceAll(/<hr (.*?)>/g, "<hr $1 />");

    // 处理换行标签
    html = html.replaceAll(/<br(.*?)>/g, '<br $1 />');

    return html;
}

/**
 * 用户信息
 */
function user() {
    axios.get(`${config.api}/rest/api/user/current`).then(res => {
        let avatar = config.host + res.data.profilePicture.path;
        $('#avatar').attr('src', avatar);
        $('#username').text(res.data.username);
    });
}

/**
 * 获取文章详情
 */
function content() {
    axios.get(`${config.api}/rest/api/content/${contentId}`, {
        params: {
            expand: 'body.storage,version',
        }
    }).then(res => {
        $('#title').val(res.data.title);
        $('#version').val(res.data.version.number + 1);
        window.content = res.data;
    });
}

/**
 * 获取文章 Markdown
 */
function markdown() {
    axios.get(`${config.api}/rest/api/content/${contentId}/property/markdown`).then(res => {
        window.Editor.setMarkdown(res.data.value);
    }).catch(error => {
        if (error.response.status === 404) {
            return null;
        }
    });
}

/**
 * 更新文章
 */
function updateContent(css) {
    let html = window.Editor.getHTML();
    html = html.replaceAll('<img class="ProseMirror-separator">', '');
    html = html.replaceAll('<br class="ProseMirror-trailingBreak">', '');
    html = `<div class="confluence-markdown-editor-content">${html}</div>`;
    html += `<style>${css}</style>`;
    html = juice(html, {removeStyleTags: true, preserveImportant: true});
    html = convertHTMLTags(html)

    const body = {
        version: {
            number: $('#version').val(),
        },
        title: $('#title').val(),
        type: window.content.type,
        body: {
            storage: {
                representation: window.content.body.storage.representation,
                value: html,
            }
        }
    };

    // 保存文章
    axios.put(config.api + `/rest/api/content/${contentId}`, body)
        .then(res => {
            msg('保存成功', true);
            $('#version').val(res.data.version.number + 1);
            layui.layer.close(window.saveContentLayerIndex);
        })
        .catch(error => {
            log('保存文章失败', error.response.message)

            return msg(error.response.message);
        });
}

/**
 * 更新文章属性：markdown
 */
function updateMarkdown() {
    let markdown = window.Editor.getMarkdown();

    let property = null;

    // 读取文章 Markdown 属性
    axios.get(`${config.api}/rest/api/content/${contentId}/property/markdown`)
        .then(res => {
            property = res.data;
        })
        // 如果文章属性不存在 markdown 属性，则创建一个
        .catch(error => {
            if (error.response.status !== 404) {
                log("创建文章遇到未知错误", error.response);
            }

            axios.post(`${config.api}/rest/api/content/${contentId}/property`, {
                key: 'markdown',
                value: markdown,
            }).then(res => {
                property = res.data;
            }).catch(error => {
                log('创建文章属性失败', error.response);
            });
        })
        // 更新文章属性 markdown
        .finally(() => {
            if (property === null) {
                return false;
            }

            axios.put(`${config.api}/rest/api/content/${contentId}/property/markdown`, {
                value: markdown,
                version: {
                    number: property.version.number + 1,
                }
            }).catch(error => {
                log('更新文章属性失败', error.response);
            });
        });
}

/**
 * 转换代码块
 *
 * @param language 语言
 *
 * @returns {string}
 */
function convertCodeToConfluenceHTML(language) {
    return `
        <ac:structured-macro ac:macro-id="${uuid()}" ac:name="code" ac:schema-version="1">
            <ac:parameter ac:name="language">${language}</ac:parameter>
            <ac:parameter ac:name="theme">RDark</ac:parameter>
            <ac:parameter ac:name="borderStyle">solid</ac:parameter>
            <ac:parameter ac:name="linenumbers">true</ac:parameter>
            <ac:parameter ac:name="collapse">false</ac:parameter>
            <ac:plain-text-body></ac:plain-text-body>
        </ac:structured-macro>
    `;
}

/**
 * 转换图片
 *
 * @param src 网络图片的 URL
 * @param alt 图片的名称（本地上传图片依赖于这个属性）
 * @returns {string}
 */
function convertImgToConfluenceHTML(src, alt) {
    return `<ac:image><ri:url ri:value="${src}"/></ac:image>`
}

/**
 * 向控制台输出日志
 *
 * @param title
 * @param message
 */
function log(title, message) {
    console.log(`=== ${title} ===`, message);
}

/**
 *  Msg 提示
 *
 * @param message 提示信息
 * @param success 是否成功
 */
function msg(message, success = false) {
    layui.layer.msg(message, {icon: success ? 6 : 5});
}