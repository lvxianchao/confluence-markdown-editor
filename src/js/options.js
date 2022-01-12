import $ from 'jquery';

// 作用域 DOM
const dom = $(`
        <tr>
            <td>
                <input type="text" class="layui-input" name="hosts[]" lay-verify="required|url">
            </td>
            <td>
                <input type="text" class="layui-input" name="apis[]" lay-verify="required|url">
            </td>
            <td>
                <div class="layui-btn layui-btn-danger w-100 delete-btn">删除</div>
            </td>
        </tr>
    `);

$(function () {
    const form = layui.form;

    // 删除作用域
    dom.find('.delete-btn').on('click', function () {
        $(this).parents('tr').remove();
    })

    // 添加作用域
    $('.create-btn').on('click', function () {
        $('tbody').append(dom.clone(true));
    })

    // 是否使用附件容器
    form.on('switch(attachment_container_enable)', function (data) {
        useAttachmentContainer(data.elem.checked);
    });

    // 保存配置
    form.on('submit', function () {
        let val = form.val('config');

        // 作用域
        let config = [];
        $('#config-table > tbody > tr').each(function () {
            config.push({
                host: $(this).find('input:eq(0)').val().trim('/'),
                api: $(this).find('input:eq(1)').val().trim('/'),
            });
        });

        // 附件
        let attachment = {
            // 显示类型
            type: val.attachment_show_type,
            // 容器
            container: {
                enable: Boolean(val.attachment_container_enable),
                type: val.attachment_container_type,
                icon: Boolean(val.attachment_container_icon),
                title: val.attachment_container_title,
            }
        };

        // 主题
        let theme = val.theme

        chrome.storage.sync.set({config, attachment, theme});

        layui.layer.msg('保存成功', {icon: 6, time: 2000});

        return false;
    });

    // 页面初始化，读取已保存的配置信息渲染
    chrome.storage.sync.get(['config', 'attachment', 'theme'], function (result) {
        // 作用域
        configConfigRender(result.config);
        // 附件
        attachmentConfigRender(result.attachment);
        // 主题
        themeConfigRender(result.theme);
    });
});

String.prototype.trim = function (char, type) {
    if (char) {
        if (type === 'left') {
            return this.replace(new RegExp('^\\'+char+'+', 'g'), '');
        } else if (type === 'right') {
            return this.replace(new RegExp('\\'+char+'+$', 'g'), '');
        }
        return this.replace(new RegExp('^\\'+char+'+|\\'+char+'+$', 'g'), '');
    }
    return this.replace(/^\s+|\s+$/g, '');
};

/**
 * 主题
 *
 * @param theme
 */
function themeConfigRender(theme) {
    $('#theme').val(theme);
}

/**
 * 切换是否使用容器状态
 *
 * @param status
 */
function useAttachmentContainer(status) {
    let cls = 'layui-disabled';

    if (!status) {
        // 容器类型
        $('input[name=attachment_container_type]').each(function () {
            $(this).addClass(cls).prop('disabled', true);
        });
        // 容器图标
        $('#attachment_container_icon').addClass(cls).prop('disabled', true);
        // 容器标题
        $('#attachment_container_title').addClass(cls).prop('disabled', true);
    } else {
        // 容器类型
        $('input[name=attachment_container_type]').each(function () {
            $(this).removeClass(cls).prop('disabled', false);
        });
        // 容器图标
        $('#attachment_container_icon').removeClass(cls).prop('disabled', false);
        // 容器标题
        $('#attachment_container_title').removeClass(cls).prop('disabled', false);
    }

    layui.form.render();
}

/**
 * 作用域渲染
 *
 * @param config
 */
function configConfigRender(config) {
    if (!config || config.length === 0) {
        $('tbody').append(dom.clone(true));
    } else {
        config.forEach(function (config) {
            let clone = dom.clone(true);

            clone.find('input').eq(0).val(config.host);
            clone.find('input').eq(1).val(config.api);

            $('tbody').append(clone);
        });
    }
}

/**
 * 附件配置渲染
 *
 * @param attachment
 */
function attachmentConfigRender(attachment) {
    if (!attachment) {
        return;
    }

    layui.form.val('config', {
        attachment_show_type: attachment.type,
        attachment_container_enable: attachment.container.enable,
        attachment_container_type: attachment.container.type,
        attachment_container_icon: attachment.container.icon,
        attachment_container_title: attachment.container.title,
    });

    useAttachmentContainer(attachment.container.enable);
}