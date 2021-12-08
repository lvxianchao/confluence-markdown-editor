let mix = require('laravel-mix');
const {copy, sass} = require("laravel-mix");

mix.setPublicPath('dist');

mix.copy('src/manifest.json', 'dist')
    .copy('src/pages', 'dist/pages')
    .copy('src/images', 'dist/images')
    .copy('src/lib', 'dist/lib')
    .copy('src/js/background.js', 'dist/js')
    .sass('src/css/editor.scss', 'dist/css/')
    .sass('src/css/options.scss', 'dist/css/')
    .js('src/js/editor.js', 'dist/js')
    .js('src/js/options.js', 'dist/js')
    .js('src/js/content.js', 'dist/js')
;
