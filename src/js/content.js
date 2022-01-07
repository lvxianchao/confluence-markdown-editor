import axios from "axios";

const id = 'chrome-extension-confluence-markdown-editor';
const host = `${location.protocol}//${location.hostname}`;

(function () {
    window.addEventListener('message', function (e) {
        try {
            if (e.data === 'init') {
                init(e);
                return;
            }

            const params = JSON.parse(e.data);

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
                        }
                    }).then(res => {
                        e.source.postMessage(message('getContentDetail', params.config, res.data), '*');
                    });
                    break;
                case 'updateContent':
                    axios.put(params.config.api + `/rest/api/content/${params.data.contentId}`, params.data.body)
                        .then(res => {
                            console.log(res)
                            e.source.postMessage(message('updateContent', params.config, res), '*');

                        }).catch(error => {
                        console.log(error);
                        e.source.postMessage(message('updateContent', params.config, error.response), '*');
                    });
                    break;
                case 'uploadAttachment':
                    let formdata = new FormData();
                    let file = base64ToFile(params.data.filename, params.data.fileBase64)
                    formdata.append('file', file);

                    axios.post(params.data.url, formdata, {
                        headers: {
                            'X-Atlassian-Token': 'nocheck',
                        },
                    }).then(res => {
                        res.data.results[0].fileBase64 = params.data.fileBase64;
                        e.source.postMessage(message('uploadAttachment', params.config, res), '*');
                    }).catch(error => {
                        e.source.postMessage(message('uploadAttachment', params.config, error.response), '*');
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
    chrome.storage.sync.get(['config', 'attachment'], (result) => {
        if (!result.config) {
            return false;
        }

        let attachment = result.attachment;

        let hasCreatedButton = false;
        result.config.forEach(config => {
            if (!hasCreatedButton) {
                if (config.host === host) {
                    hasCreatedButton = createMarkdownEditorButton({config, attachment});
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
    chrome.storage.sync.get(['config', 'attachment'], result => {
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
function createMarkdownEditorButton({config, attachment}) {
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
        + `?page_id=${pageId}&config=` + encodeURIComponent(JSON.stringify(config))
        + `&attachment=` + encodeURIComponent(JSON.stringify(attachment))
    ;

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
    console.log('message', data);
    return JSON.stringify({id, event, config, data});
}

/**
 * base64 转文件对象
 *
 * @param filename 文件名称
 * @param urlData base64
 *
 * @returns {File}
 */
function base64ToFile(filename, urlData) {
    let arr = urlData.split(',')
    let type = arr[0].match(/:(.*?);/)[1]
    let bstr = atob(arr[1])
    let n = bstr.length
    let u8arr = new Uint8Array(n)

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, {type});
}