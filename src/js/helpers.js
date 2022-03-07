import axios from "axios";
import $ from "jquery";
import juice from "juice";
import {v4 as uuid} from "uuid";

function setCookie(host, callback) {
    chrome.runtime.sendMessage({event: "getCookie", url: host}, response => {
            let cookie = response.cookie;
            delete cookie.hostOnly;
            delete cookie.session;
            cookie.url = host;
            chrome.cookies.set(cookie);
            callback();
        }
    );
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

    axios.post(`${window.cme.api}/rest/api/content/${window.cme.contentId}/child/attachment`, form, {
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
 * 用户信息
 */
function user() {
    axios.get(`${window.cme.api}/rest/api/user/current`).then(res => {
        let avatar = window.cme.host + res.data.profilePicture.path;
        $('#avatar').attr('src', avatar);
        $('#username').text(res.data.username);
    });
}

/**
 * 获取文章信息
 */
function content(isPage = false) {
    axios.get(`${window.cme.api}/rest/api/content/${window.cme.contentId}`, {
        params: {
            expand: 'body.storage,version',
        }
    }).then(res => {
        window.cme.content = res.data;

        if (isPage) {
            $('#title').val(res.data.title);
        }
    });
}

/**
 * 获取 markdown 属性
 */
function markdown(contentId) {
    if (!contentId) {
        return;
    }

    axios.get(`${window.cme.api}/rest/api/content/${contentId}/property/markdown`)
        .then(res => {
            window.Editor.setMarkdown(res.data.value);
        })
        .catch(error => {
            if (error.response.status === 404) {
                return null;
            }
        });
}

/**
 * 向编辑器内插入传的图片 markdown 文本
 *
 * @param filename 图片文件名称
 */
function insertImageMarkdownToEditor(filename) {
    let url = `${window.cme.host}/download/attachments/${window.cme.contentId}/${filename}`;

    let markdown = `\n![${filename}](${url})\n`;

    window.Editor.insertText(markdown);
}

/**
 * 更新属性：markdown
 */
function updateMarkdown(contentId) {
    return new Promise(resolve => {

        let markdown = window.Editor.getMarkdown();

        let property = null;

        // 读取文章 Markdown 属性
        axios.get(`${window.cme.api}/rest/api/content/${contentId}/property/markdown`)
            .then(res => {
                property = res.data;
            })
            // 如果文章属性不存在 markdown 属性，则创建一个
            .catch(async error => {
                if (error.response.status !== 404) {
                    log("保存 Markdown 遇到未知错误", error.response);
                }

                await axios.post(`${window.cme.api}/rest/api/content/${contentId}/property`, {
                    key: 'markdown',
                    value: markdown,
                }).then(res => {
                    property = res.data;
                }).catch(error => {
                    log('保存 Markdown 失败', error.response);
                });
            })
            // 更新文章属性 markdown
            .finally(async () => {
                if (property === null) {
                    return false;
                }

                await axios.put(`${window.cme.api}/rest/api/content/${contentId}/property/markdown`, {
                    value: markdown,
                    version: {
                        number: property.version.number + 1,
                    }
                }).catch(error => {
                    log('更新 Markdown 失败', error.response);
                });

                resolve(contentId);
            });
    });
}

/**
 *　获取并处理 HTML
 *
 * @returns {any}
 */
function getHTML(css) {
    let html = window.Editor.getHTML();

    html = html.replaceAll('<img class="ProseMirror-separator">', '');
    html = html.replaceAll('<br class="ProseMirror-trailingBreak">', '');
    html = `<div class="confluence-markdown-editor-content">${html}</div>`;
    html += `<style>${css}</style>`;
    html = juice(html, {removeStyleTags: true, preserveImportant: true});
    html = convertHTMLTags(html)

    return html;
}

/**
 * 将编辑获取到的 HTML 转换成 Wiki 标签
 *
 * @param styledHtml
 * @returns {*}
 */
function convertHTMLTags(styledHtml) {
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

export {
    setCookie,
    user,
    markdown,
    addImageBlobHook,
    updateMarkdown,
    msg,
    log,
    content,
    getHTML,
}
