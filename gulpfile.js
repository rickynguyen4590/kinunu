const {series, parallel, watch, src, dest} = require('gulp');
const pump = require('pump');

// gulp plugins and utils
const browserify = require('browserify');
const livereload = require('gulp-livereload');
const postcss = require('gulp-postcss');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const beeper = require('beeper');
const zip = require('gulp-zip');
const sassx = require('gulp-sass')(require('sass'));
const babel = require('gulp-babel')
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const babelify = require("babelify");

// postcss plugins
const easyimport = require('postcss-easy-import');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

function serve(done) {
  livereload.listen();
  done();
}

function handleError(done) {
  return function (err) {
    if (err) {
      beeper();
    }
    return done(err);
  };
}

function hbs(done) {
  pump([
    src(['*.hbs', 'partials/**/*.hbs']),
    livereload()
  ], handleError(done));
}

function css(done) {
  pump([
    src('assets/css/screen.scss', {sourcemaps: true}),
    sassx().on('error', sassx.logError),
    postcss([
      easyimport,
      autoprefixer(),
      cssnano()
    ]),
    dest('assets/built/', {sourcemaps: '.'}),
    livereload()
  ], handleError(done));
}

function js(done) {
  pump([
    browserify({
      entries: 'assets/js/main.js',
      debug: true
    }).transform(babelify.configure({
      presets: ["@babel/preset-env"]
    })).bundle(),
    source('ghost.js'),
    buffer(),
    src([
      'node_modules/@tryghost/shared-theme-assets/assets/js/v1/lib/**/*.js',
      'node_modules/@tryghost/shared-theme-assets/assets/js/v1/main.js',
    ], {sourcemaps: true}),
    concat('main.min.js'),
    uglify(),
    dest('assets/built/', {sourcemaps: '.'}),
    livereload()
  ], handleError(done));
}

function zipper(done) {
  const filename = require('./package.json').name + '.zip';

  pump([
    src([
      '**',
      '!node_modules', '!node_modules/**',
      '!dist', '!dist/**',
      '!yarn-error.log'
    ]),
    zip(filename),
    dest('dist/')
  ], handleError(done));
}

const hbsWatcher = () => watch(['*.hbs', 'partials/**/*.hbs'], hbs);
const cssWatcher = () => watch('assets/css/**/*.scss', css);
const jsWatcher = () => watch('assets/js/**/*.js', js);
const watcher = parallel(hbsWatcher, cssWatcher, jsWatcher);
const build = series(css, js);

exports.build = build;
exports.zip = series(build, zipper);
exports.default = series(build, serve, watcher);
