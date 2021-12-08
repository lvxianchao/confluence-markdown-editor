import axios from "axios";

(function () {
    const host = `${location.protocol}//${location.hostname}`;

    window.addEventListener('message', function (e) {
        try {
            const params = JSON.parse(e.data);

            console.log(params);

            if (!params.config.host || params.config.host !== host) {
                return false
            }

            switch (params.event) {
                case 'user':
                    axios.get(params.config.api + `/rest/api/user/current`).then(res => {
                        e.source.postMessage(message('user', params.config, res.data), '*');
                    });
                    break;
                case 'getContentDetail':
                    axios.get(params.config.api + `/rest/api/content/${params.data.contentId}`, {
                        params: {
                            expand: 'body.storage,version',
                        },
                        headers: {
                            Authorization: 'Bearer ' + params.config.token,
                        },
                    }).then(res => {
                        e.source.postMessage(message('getContentDetail', params.config, res.data), '*');
                    });
                    break;
                case 'updateContent':
                    axios.put(params.config.api + `/rest/api/content/${params.data.contentId}`, params.data.body, {
                        headers: {
                            Authorization: 'Bearer ' + params.config.token,
                        }
                    }).then(res => {
                        e.source.postMessage(message('updateContent', params.config, res.data), '*');
                    });
                    break;
                default:
                    break;
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
        result.config.forEach(function (config) {
            if (!hasCreatedButton) {
                if (config.host === host) {
                    hasCreatedButton = createMarkdownEditorButton(config);
                }
            }
        });
    });
})();


/**
 * 注入编辑器按钮
 *
 * @returns {boolean}
 */
function createMarkdownEditorButton(config) {
    const meta = document.querySelector('meta[name="ajs-page-id"]');

    if (!meta) {
        return false;
    }

    // Content ID
    const pageId = meta.getAttribute('content');

    // 注入按钮
    const container = document.querySelector('div#navigation > ul.ajs-menu-bar');
    const a = `<div class="aui-button aui-button-primary" id="kkjofhv-confluence-markdown-editor" style="color: #FFF;">Markdown</div>`;
    const li = document.createElement('li');
    li.setAttribute('class', 'ajs-button normal');
    li.innerHTML = a;
    container.insertBefore(li, document.querySelector('#navigation li'));

    // Markdown 编辑器页面
    let extensionEditorPageUrl = chrome.runtime.getURL('pages/editor.html')
        + `?page_id=${pageId}&config=` + encodeURIComponent(JSON.stringify(config));

    // 绑定点击事件，在新窗口中打开编辑器页面
    const button = document.querySelector('#kkjofhv-confluence-markdown-editor');
    button.addEventListener('click', function (e) {
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
 * @returns {string}
 */
function message(event, config, data = null) {
    return JSON.stringify({id: "chrome-extension-confluence-markdown-editor", event, config, data,});
}