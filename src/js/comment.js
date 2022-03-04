import $ from 'jquery';
import {v4 as uuid} from 'uuid';
import juice from "juice";
import axios from "axios";
import Editor from "@toast-ui/editor";
import * as cme from "./helpers";
// import {
//     addImageBlobHook,
//     user,
//     markdown,
//     updateContent,
//     updateMarkdown,
//     msg,
//     log,
//     content,
//     getHTML
// } from "./helpers"

/**
 * 跨标签通信时的消息身份 ID
 *
 * @type {string}
 */
const id = 'chrome-extension-confluence-markdown-editor';

(async function () {
    let query = new URLSearchParams(location.search);
    let parentCommentId = query.get('pid') === null ? 0 : parseInt(query.get('pid'), 10);
    let commentId = query.get('cid') === null ? 0 : query.get('cid');

    window.opener.postMessage('init', '*');
    window.addEventListener('message', function (e) {
        if (e.data instanceof Object && e.data.id && e.data.id === id) {
            window.cme = e.data;
            window.cme.commentId = commentId;
            window.cme.parentCommentId = parentCommentId;

            chrome.runtime.sendMessage({event: "getCookie", url: window.cme.host}, response => {
                let cookie = response.cookie;
                delete cookie.hostOnly;
                delete cookie.session;
                cookie.url = window.cme.host;
                chrome.cookies.set(cookie);
                work();
            });
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
        hooks: {addImageBlobHook: cme.addImageBlobHook},
    });

    // 获取内容详细信息
    cme.content();

    // 获取并向页面渲染用户信息
    cme.user();

    // 获取 Markdown 原文
    cme.markdown(window.cme.commentId);

    // 保存
    $('#save').on('click', function () {
        window.saveContentLayerIndex = layui.layer.load(1);

        // 读取主题
        axios.get(window.cme.theme ? window.cme.theme : '../themes/purple.css').then(res => {
            // updateContent(res.data);
            createComment(res.data);
        }).then()
            .catch(error => {
                cme.log('读取主题失败', error);
                cme.msg("读取主题失败");
            }).finally(() => {
            layui.layer.close(window.saveContentLayerIndex);
        });
    });
}

/**
 * 创建评论
 *
 * @param css
 */
function createComment(css) {
    let html = cme.getHTML(css);

    let body = getBody(html);

    // 保存评论
    axios.post(window.cme.api + `/rest/api/content`, body)
        .then(res => {
            window.cme.commentId = res.data.id;
            cme.msg('保存评论成功', true);
            layui.layer.close(window.saveContentLayerIndex);
        })
        .then(() => {
            cme.updateMarkdown(window.cme.commentId).then(() => {
                let url = location.href.split('?')[0];
                let query = new URLSearchParams(location.search);
                query.set('cid', window.cme.commentId);
                location.href = url + '?' + query.toString();
            });
        })
        // .then(() => {
        //
        // })
        .catch(error => {
            cme.log('保存评论失败', error.response.message)

            return cme.msg("保存评论失败");
        });

    new URLSearchParams()
}

/**
 * 获取请求体
 *
 * @return
 */
function getBody(html) {
    let body = {
        type: "comment", container: {
            id: window.cme.contentId, type: window.cme.parentCommentId ? "comment" : "page",
        }, body: {
            storage: {
                representation: "storage", value: html,
            }
        }
    };

    if (window.cme.parentCommentId) {
        body.ancestors = {id: window.cme.parentCommentId};
    }

    return body;
}

