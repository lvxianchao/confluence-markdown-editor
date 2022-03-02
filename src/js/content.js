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
            if (!hasCreatedButton) {
                if (config.host === host) {
                    hasCreatedButton = createMarkdownEditorButton();
                }
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
    chrome.storage.sync.get(['config', 'attachment', 'theme'], result => {
        if (!result.config) {
            return false;
        }

        result.config.forEach(config => {
            if (config.host === host) {
                let data = {
                    id: id,
                    contentId: getContentId(),
                    config: config,
                    attachment: result.attachment,
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
function createMarkdownEditorButton() {
    // 注入按钮
    const container = document.querySelector('div#navigation > ul.ajs-menu-bar');
    const a = `<div class="aui-button aui-button-primary" id="kkjofhv-confluence-markdown-editor" style="color: #FFF;">Markdown</div>`;
    const li = document.createElement('li');
    li.setAttribute('class', 'ajs-button normal');
    li.innerHTML = a;
    container.insertBefore(li, document.querySelector('#navigation li'));

    let extensionEditorPageUrl = chrome.runtime.getURL('pages/editor.html');

    // 绑定点击事件，在新窗口中打开编辑器页面
    const button = document.querySelector('#kkjofhv-confluence-markdown-editor');
    button.addEventListener('click', function () {
        window.open(extensionEditorPageUrl);
    }, false);

    return true;
}

/**
 * 向 Editor 发送消息
 *
 * @param event 事件名称
 * @param config 当前域名配置信息
 * @param data 发送的数据
 *
 * @returns {string}
 */
function message(event, config, data) {
    return JSON.stringify({id, event, config, data});
}