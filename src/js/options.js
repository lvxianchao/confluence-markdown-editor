import $ from 'jquery';

$(function () {
    const form = layui.form;

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

    // 删除
    dom.find('.delete-btn').on('click', function () {
        $(this).parents('tr').remove();
    })

    // 添加
    $('.create-btn').on('click', function () {
        $('tbody').append(dom.clone(true));
    })

    // 页面初始化，读取已保存的配置信息渲染
    chrome.storage.sync.get(['config'], function (result) {
        if (!result.config || result.config.length === 0) {
            $('tbody').append(dom.clone(true));

            return false;
        } else {

            result.config.forEach(function (config) {
                let clone = dom.clone(true);

                clone.find('input').eq(0).val(config.host);
                clone.find('input').eq(1).val(config.api);

                $('tbody').append(clone);
            });
        }
    });

    // 保存配置
    form.on('submit', function () {
        let config = [];

        $('#config-table > tbody > tr').each(function () {
            config.push({
                host: $(this).find('input:eq(0)').val(),
                api: $(this).find('input:eq(1)').val(),
            });
        });

        chrome.storage.sync.set({config});

        layui.layer.msg('保存成功', {icon: 6, time: 2000});

        return false;
    });
});