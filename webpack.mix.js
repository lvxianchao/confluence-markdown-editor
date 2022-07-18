let mix = require('laravel-mix');

mix.setPublicPath('dist');

mix.copy('src/manifest.json', 'dist')
    .copy('src/pages', 'dist/pages')
    .copy('src/images', 'dist/images')
    .copy('src/lib', 'dist/lib')
    .copy('src/js/background.js', 'dist/js')
    .sass('src/css/content.scss', 'dist/css/')
    .sass('src/css/comment.scss', 'dist/css/')
    .sass('src/css/options.scss', 'dist/css/')
    .sass('src/themes/purple.scss', 'dist/themes')
    .js('src/js/content.js', 'dist/js')
    .js('src/js/comment.js', 'dist/js')
    .js('src/js/options.js', 'dist/js')
    .js('src/js/inject.js', 'dist/js')
;
