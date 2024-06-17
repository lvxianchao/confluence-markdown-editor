import $ from 'jquery';
import axios from "axios";
import Editor from "@toast-ui/editor";
import * as cme from "./helpers";
import "@toast-ui/editor/dist/i18n/zh-cn";
import 'prismjs/themes/prism.css';
import '@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight.css';
import codeSyntaxHighlight
    from '@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight-all.js';
import {bindSaveEventAndShortcut, checkUpgrade} from "./helpers";

/**
 * 跨标签通信时的消息身份 ID
 *
 * @type {string}
 */
const id = 'chrome-extension-confluence-markdown-editor';

// (async function () {
//     window.opener.postMessage('init', '*');
//     window.addEventListener('message', function (e) {
//         if (e.data instanceof Object && e.data.id && e.data.id === id) {
//             window.cme = e.data;
//
//             cme.setCookie(window.cme.host, work);
//         }
//     })
// })();

(function () {
    const params = new URLSearchParams(location.search);
    const space = params.get('space');
    const type = params.get('type');
    const id = params.get('id');

    console.log("type, id: ", type, id)
    work(space, type, id);
})();

/**
 * 初始化编辑器及其他工作
 */
function work(space, type, id) {
    window.Editor = new Editor({
        el: document.querySelector('#editor'),
        height: $('form').height() - 56 + 'px',
        initialEditType: 'markdown',
        previewStyle: 'vertical',
        usageStatistics: false,
        hideModeSwitch: true,
        language: 'zh-CN',
        hooks: {addImageBlobHook: cme.addImageBlobHook},
        plugins: [codeSyntaxHighlight],
    });

    // 向页面渲染用户信息
    // cme.user();

    // 文章详细信息（标题 + 版本号）
    cme.content(space, type, id);

    // 文章 Markdown 原文
    cme.markdown(id);

    // 保存事件和其快捷键
    bindSaveEventAndShortcut(save);

    // 检查更新
    checkUpgrade();
}

/**
 * 保存
 */
function save() {
    console.log("saved");
    window.saveContentLayerIndex = layui.layer.load(1);

    // 读取主题
    axios.get(window.cme.theme ? window.cme.theme : '../themes/purple.css').then(res => {
        console.log('读取主题成功', res.data);
        updateContent(res.data);
    }).catch(error => {
        cme.log('读取主题失败', error);
        cme.msg("读取主题失败");
    }).finally(() => {
        layui.layer.close(window.saveContentLayerIndex);
    });
}

/**
 * 更新文章
 */
function updateContent(css) {
    let html = cme.getHTML(css);

    let body = getBody(html);

    axios.put(window.cme.api + `/rest/api/content/${window.cme.contentId}`, body).then(res => {
        $('#version').val(res.data.version.number);

        cme.updateMarkdown(window.cme.contentId).then(() => {
            cme.msg('保存成功', true);
        });

        layui.layer.close(window.saveContentLayerIndex);
    }).catch(error => {
        cme.log('保存文章失败', error.response.message)

        return cme.msg(error.response.message);
    });
}

/**
 * 生成请求 body
 *
 * @param html
 */
function getBody(html) {
    return {
        version: {
            number: parseInt($('#version').val()) + 1,
        },
        title: $('#title').val(),
        type: 'page',
        body: {
            storage: {
                representation: "storage",
                value: html,
            }
        }
    };
}