import $ from 'jquery';
import Vditor from "../lib/vditor/dist/index.min";
import {v4 as uuid} from 'uuid';

$(function () {
    window.vditor = new Vditor('vditor', {
        cdn: '../lib/vditor',
    });

    const params = new URLSearchParams(location.search);
    const contentId = params.get('page_id');
    let config = params.get('config');

    if (!config || !contentId) {
        return layui.layer.msg('Error: Parameter missing.', {icon: 5, time: 2000});
    }

    config = JSON.parse(config);

    window.addEventListener('message', function (e) {
        try {
            if (e.origin !== config.host) {
                return false;
            }

            const params = JSON.parse(e.data);

            if (!params.id || params.id !== 'chrome-extension-confluence-markdown-editor') {
                return false;
            }

            const version = $('#version');
            switch (params.event) {
                case 'user':
                    $('#username').text(params.data.username);
                    $('#avatar').attr('src', config.host + params.data.profilePicture.path);
                    break;
                case 'getContentDetail':
                    $('#title').val(params.data.title);
                    version.val(params.data.version.number + 1);
                    window.content = params.data;
                    break;
                case 'updateContent':
                    layui.layer.msg('Succeeded.', {icon: 6});
                    version.val(params.data.version.number + 1);
                    break;
                default:
                    break;
            }
        } catch (e) {
            layui.layer.msg('Something was wrong.', {icon: 5});
            console.log(e);
        }
    });

    // 保存
    $('#save').on('click', function () {
        let html = window.vditor.getHTML();
        let dom = $(`<div>${html}</div>`);

        // 处理代码块
        dom.find('code').each(function () {
            let language = $(this).attr('class').replace('language-', '');
            let code = $(this).text();
            $(this).parent().replaceWith(MarkdownCodeToConfluenceHTML(language, code));
        });

        html = dom.html();

        html = html.replace('<ac:plain-text-body><!--[CDATA[', '<ac:plain-text-body><![CDATA[');
        html = html.replace(']]--></ac:plain-text-body>', ']]></ac:plain-text-body>');

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

        window.opener.postMessage(message('updateContent', config, {contentId, body}), config.host);
    });

    // 用户信息
    user(config);

    // 文章信息
    getContentDetail(config, contentId);
});

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

function message(event, config, data = null) {
    return JSON.stringify({id: "chrome-extension-confluence-markdown-editor", event, config, data,});
}

function MarkdownCodeToConfluenceHTML(language, code) {
    return `<ac:structured-macro ac:macro-id="${uuid()}" ac:name="code" ac:schema-version="1">
                <ac:parameter ac:name="language">${language}</ac:parameter>
                <ac:parameter ac:name="theme">RDark</ac:parameter>
                <ac:parameter ac:name="borderStyle">solid</ac:parameter>
                <ac:parameter ac:name="linenumbers">true</ac:parameter>
                <ac:parameter ac:name="collapse">false</ac:parameter>
                <ac:plain-text-body><![CDATA[${code}]]></ac:plain-text-body>
            </ac:structured-macro>`;
}