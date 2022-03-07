const id = 'chrome-extension-confluence-markdown-editor';
const host = `${location.protocol}//${location.hostname}`;

(function () {
    window.addEventListener('message', function (e) {
        try {
            if (e.data === 'init') {
                init(e);
                return false;
            }
        } catch (e) {
            console.log(e);
        }
    }, false);

    // 如果当前域名在配置里，则注入编辑器按钮
    chrome.storage.sync.get(['config'], (result) => {
        if (!result.config) {
            return false;
        }

        let hasCreatedButton = false;
        result.config.forEach(config => {
            if (config.host !== host) {
                return false;
            }

            if (!hasCreatedButton) {
                // 注入编写文章按钮
                createContentEditorButton();
                // 注入顶级评论和
                createCommentEditorButton();
                // 注入评论的编辑和回复按钮
                injectEditAndCommentButton();

                hasCreatedButton = true;
            }


        });
    });
})();

/**
 * 获取 content id
 *
 * @returns {string|number}
 */
function getContentId() {
    const meta = document.querySelector('meta[name="ajs-page-id"]');

    if (!meta) {
        return 0;
    }

    return meta.getAttribute('content');
}

/**
 * 编辑器初始化时获取必要的参数和配置信息
 *
 * @param e
 */
function init(e) {
    chrome.storage.sync.get(['config', 'theme'], result => {
        if (!result.config) {
            return false;
        }

        result.config.forEach(config => {
            if (config.host === host) {
                let data = {
                    id: id,
                    contentId: getContentId(),
                    config: config,
                    host: config.host,
                    api: config.api,
                    theme: result.theme,
                };

                e.source.postMessage(data, '*');
            }
        });
    });
}


/**
 * 注入编辑器按钮
 *
 * @returns {boolean}
 */
function createContentEditorButton() {
    const buttonId = 'kkjofhv-confluence-markdown-editor-content';
    const container = document.querySelector('div#navigation > ul.ajs-menu-bar');
    const a = `<div class="aui-button aui-button-primary" id="${buttonId}" style="color: #FFF;">正文</div>`;
    const li = document.createElement('li');
    li.setAttribute('class', 'ajs-button normal');
    li.innerHTML = a;
    container.insertBefore(li, document.querySelector('#navigation li'));

    let extensionContentPageUrl = chrome.runtime.getURL('pages/content.html');

    // 绑定点击事件，在新窗口中打开编辑器页面
    const button = document.querySelector(`#${buttonId}`);
    button.addEventListener('click', function () {
        window.open(extensionContentPageUrl);
    }, false);


}

/**
 * 创建顶级评论按钮
 *
 * @param parentCommentId
 */
function createCommentEditorButton(parentCommentId = 0) {
    const buttonId = 'kkjofhv-confluence-markdown-editor-comment';
    const container = document.querySelector('div#navigation > ul.ajs-menu-bar');
    const a = `<div class="aui-button aui-button-primary" id="${buttonId}" style="color: #FFF;">评论</div>`;
    const li = document.createElement('li');
    li.setAttribute('class', 'ajs-button normal');
    li.innerHTML = a;
    container.insertBefore(li, document.querySelector('#editPageLink').parentElement);

    let extensionCommentPageUrl = chrome.runtime.getURL(`pages/comment.html?pid=${parentCommentId}`);

    // 绑定点击事件，在新窗口中打开编辑器页面
    const button = document.querySelector(`#${buttonId}`);
    button.addEventListener('click', function () {
        window.open(extensionCommentPageUrl);
    }, false);
}

/**
 * 创建评论的编辑和回复按钮
 */
function injectEditAndCommentButton() {
    document.querySelectorAll('.comment-thread').forEach(element => {
        let commentId = element.getAttribute('id').replace('comment-thread-', '');

        // 回复按钮
        let commentPageUrl = chrome.runtime.getURL(`pages/comment.html?pid=${commentId}&cid=0`);
        let a = `<a href="javascript: window.open('${commentPageUrl}');">【回复】</a>`;
        let li = document.createElement('li');
        li.innerHTML = a;
        element.querySelector('.comment-actions-primary').append(li);

        // 编辑按钮
        commentPageUrl = chrome.runtime.getURL(`pages/comment.html?pid=0&cid=${commentId}`);
        a = `<a href="javascript: window.open('${commentPageUrl}');">【编辑】</a>`
        li = document.createElement('li');
        li.innerHTML = a;
        element.querySelector('.comment-actions-primary').append(li);
    });
}