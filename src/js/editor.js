import $ from 'jquery';
import Vditor from "../lib/vditor/dist/index.min";
import {v4 as uuid} from 'uuid';
import juice from "juice";

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
 * 附件配置信息
 */
let attachmentConfig;

/**
 * 主题地址
 */
let theme;

// 发送初始化函数，获取插件配置信息
$(function () {

    window.initLayerIndex = layui.layer.load(1);
    window.opener.postMessage('init', '*');
    window.addEventListener('message', function (e) {
        if (e.data instanceof Object && e.data.id && e.data.id === id) {
            contentId = e.data.contentId;
            config = e.data.config;
            attachmentConfig = e.data.attachment;
            theme = e.data.theme;

            work();
        }
    })
});

/**
 * 初始化编辑器及其他工作
 */
function work() {
    window.vditor = new Vditor('vditor', {
        cdn: '../lib/vditor',
        mode: 'wysiwyg',
        cache: {
            enable: false,
        },
        upload: {
            url: `${config.api}/rest/api/content/${contentId}/child/attachment`,
            filedName: 'file',
            headers: {
                'X-Atlassian-Token': 'nocheck',
            },
            handler: function (files) {
                window.uploadLayerIndex = layui.layer.load(1);
                for (const file in files) {
                    uploadAttachment(Object.assign(config, {contentId}), files[file]);
                }
            },
        },
    });

    // 为编辑器内容初始化值的时候，会自动调用此函数，导致异常，做置空处理。
    window.vditor.clearCache = function () {
    };

    window.addEventListener('message', function (e) {
        try {
            if (e.origin !== config.host) {
                return false;
            }

            const params = JSON.parse(e.data);

            if (!params.id || params.id !== id) {
                return false;
            }

            const version = $('#version');
            switch (params.event) {
                case 'user':
                    $('#username').text(params.data.username);
                    $('#avatar').attr('src', params.data.avatar);
                    break;
                case 'getContentDetail':
                    $('#title').val(params.data.title);
                    version.val(params.data.version.number + 1);
                    window.content = params.data;
                    window.vditor.setValue(params.data.markdown ? params.data.markdown : '', true);
                    layui.layer.close(window.initLayerIndex);
                    break;
                case 'updateContent':
                    if (params.data.status !== 200) {
                        console.log(params.data.data.message);
                        return layui.layer.msg(params.data.data.message, {icon: 5});
                    }

                    layui.layer.msg('保存成功', {icon: 6});
                    version.val(params.data.data.version.number + 1);
                    layui.layer.close(window.saveContentLayerIndex);
                    break;
                case 'uploadAttachment':
                    layer.close(window.uploadLayerIndex);

                    // 处理附件重复上传
                    let messageStartsWith = "Cannot add a new attachment with same file name as an existing attachment: ";
                    if (params.data.status !== 200) {
                        if (params.data.status === 400 && params.data.data.message.startsWith(messageStartsWith)) {
                            let base64 = params.data.data.fileBase64;
                            let fileBase64 = base64.startsWith('data:image') ? base64 : fileIconBase64();
                            let title = params.data.data.message.replace(messageStartsWith, '');
                            window.vditor.insertValue(`\n![${title}](${fileBase64})\n`, true);
                        } else {
                            return layui.layer.msg(params.data.data.message, {icon: 5});
                        }
                    } else {
                        // 如果是图片，插入图片，并渲染；
                        // 如果是文件，按图片渲染，在提交的时候处理文件格式；
                        let file = params.data.data.results[0];
                        let fileBase64 = file.extensions.mediaType.startsWith('image') ? file.fileBase64 : fileIconBase64();
                        window.vditor.insertValue(`\n![${file.title}](${fileBase64})\n`, true);
                    }
                    break;
                default:
                    break;
            }
        } catch (e) {
            layui.layer.msg('未知错误', {icon: 5});
            console.log(e);
        }
    });

    // 保存
    $('#save').on('click', function () {
        window.saveContentLayerIndex = layui.layer.load(1);

        let url = theme ? theme : '../themes/purple.css';

        $.ajax({
            url: url,
            error: function () {
                layui.layer.close(window.saveContentLayerIndex);
                layui.layer.msg("读取主题失败", {icon: 5});
            },
            success: function (css, status) {
                if (status !== 'success') {
                    return layer.msg('读取主题发生错误');
                }

                let markdown = window.vditor.getValue();

                let html = `<div class="confluence-markdown-editor-content">${window.vditor.getHTML()}</div>`;
                html += `<style>${css}</style>`;
                html = juice(html, {removeStyleTags: true, preserveImportant: true});
                html = convertHTMLTags(html, attachmentConfig)

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
                    },
                };

                window.opener.postMessage(message('updateContent', config, {
                    contentId,
                    body,
                    markdown
                }), config.host);
            }
        });
    });

    // 用户信息
    user(config);

    // 文章信息
    getContentDetail(config, contentId);
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
        if (src.startsWith('http') || src.startsWith('https')) {
            // 网络图片
            confluenceImageHTML = convertImgToConfluenceHTML(src, '', true);
        } else if (src.startsWith('data:image/')) {
            if (src === fileIconBase64()) {
                // 本地上传文件
                confluenceImageHTML = convertFileToConfluenceHTML(alt, attachmentConfig);
            } else {
                // 本地上传图片
                confluenceImageHTML = convertImgToConfluenceHTML(src, alt, false);
            }
        }

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
    html = html.replaceAll(/<br (.*?)>/g, '<br $1 />');

    return html;
}

/**
 * 用户信息
 *
 * @param config
 */
function user(config) {
    window.opener.postMessage(message('user', config), config.host);
}

/**
 * 获取文章详情
 *
 * @param config
 * @param contentId
 */
function getContentDetail(config, contentId) {
    window.opener.postMessage(message('getContentDetail', config, {contentId}), config.host);
}

/**
 * 跨标签通信
 *
 * @param event 事件名称
 * @param config 当前域名配置信息
 * @param data 通信数据
 *
 * @returns {string}
 */
function message(event, config, data = null) {
    return JSON.stringify({id, event, config, data});
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
 * @param isImageUrl 是否是网络图片
 * @returns {string}
 */
function convertImgToConfluenceHTML(src, alt, isImageUrl) {
    return isImageUrl
        ? `<ac:image><ri:url ri:value="${isImageUrl ? src : alt}"/></ac:image>`
        : `<ac:image><ri:attachment ri:filename="${alt}"/></ac:image>`;
}

/**
 * 转换文件
 *
 * @param alt 文件名称
 * @param attachmentConfig
 * @returns {string}
 */
function convertFileToConfluenceHTML(alt, attachmentConfig) {
    let attachment = '';

    // 根据配置定义基本的附件 DOM。
    if (attachmentConfig.type === 'thumbnail') {
        attachment = `
            <ac:structured-macro ac:macro-id="${uuid()}" ac:name="view-file" ac:schema-version="1">
                <ac:parameter ac:name="name">
                    <ri:attachment ri:filename="${alt}"/>
                </ac:parameter>
            </ac:structured-macro>
        `;
    } else if (attachmentConfig.type === 'link') {
        attachment = `
            <ac:link>
                <ri:attachment ri:filename="${alt}"/>
            </ac:link>
        `;
    }

    // 如果使用容器，需要将附件 DOM 置入到容器 DOM 内。
    if (attachmentConfig.container.enable) {
        attachment = `
            <ac:structured-macro ac:macro-id="${uuid()}" ac:name="${attachmentConfig.container.type}" ac:schema-version="1">
              <ac:parameter ac:name="icon">${attachmentConfig.container.enable}</ac:parameter>
              <ac:parameter ac:name="title">${attachmentConfig.container.title}</ac:parameter>
              <ac:rich-text-body><p>${attachment}</p></ac:rich-text-body>
            </ac:structured-macro>
        `;
    }

    return attachment;
}

/**
 * 上传附件
 *
 * @param config 当前域名配置信息
 * @param file 文件对象
 */
function uploadAttachment(config, file) {
    const reader = new FileReader();

    reader.onload = (ev) => {
        let url = config.api + `/rest/api/content/${config.contentId}/child/attachment`;
        let fileBase64 = ev.target.result;
        let filenames = file.name.split('.');
        let filename = filenames[0] + '.' + filenames[1];

        window.opener.postMessage(message('uploadAttachment', config, {
            url,
            filename,
            fileBase64
        }), '*');
    };

    reader.readAsDataURL(file);
}

/**
 * 用以代替文件图标的图片（Base64 格式）
 *
 * @returns {string}
 */
function fileIconBase64() {
    // images/file.png
    return 'data:image/png;base64,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';
}