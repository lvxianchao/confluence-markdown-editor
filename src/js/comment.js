import $ from 'jquery';
import {v4 as uuid} from 'uuid';
import juice from "juice";
import axios from "axios";
import Editor from "@toast-ui/editor";
import {
    addImageBlobHook,
    user,
    markdown,
    updateContent,
    updateMarkdown,
    msg,
    log,
    content,
} from "./helpers"

/**
 * 跨标签通信时的消息身份 ID
 *
 * @type {string}
 */
const id = 'chrome-extension-confluence-markdown-editor';

(async function () {

    window.opener.postMessage('init', '*');
    window.addEventListener('message', function (e) {
        if (e.data instanceof Object && e.data.id && e.data.id === id) {
            window.cme = e.data;

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
        height: '100%',
        initialEditType: 'markdown',
        previewStyle: 'vertical',
        usageStatistics: false,
        hideModeSwitch: true,
        hooks: {addImageBlobHook},
    });

    // 获取内容详细信息
    content();

    // 获取并向页面渲染用户信息
    user();

    // Markdown 原文
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

