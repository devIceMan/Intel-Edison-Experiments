/// <binding BeforeBuild='jshint' AfterBuild='deploy, kill-processes, set-startup' />
/// <reference path=".typings/tsd.d.ts" />

var gulp = require('gulp'),
    plugins = require('gulp-load-plugins')(),
    ext = require('./.gulp/ext-plugins.js'),
    config = require('./config'),
    merge = require('merge2'),
    edison = require('./.gulp/edison.js'),
    runSequence = require('run-sequence'),
    exec = require('child_process').exec,
    run = require('gulp-run'),
    gutil = require('gulp-util'),
    path = require('path');

gulp.task('Restore Packages', plugins.shell.task('npm install', {
    interactive: true
}));
gulp.task('TypeScript Compiler', function () {
    return gulp
        .src('./common/edison-utils/*.ts')
        .pipe(plugins.typescript({
            module: 'commonjs',
            target: 'ES5',
            noEmitOnError: true,
            moduleResolution: 'node',
            sortOutput: true
        }))
        .pipe(plugins.concat('edison-utils.js'))
        .pipe(gulp.dest('./common/'));
});

gulp.task('TSD Reinstall', require('./.gulp/tsd-reinstall.js')(gulp, plugins));
gulp.task('JsHint', require('./.gulp/jshint.js')(gulp, plugins, config.projectName));

gulp.task('Edison.Deploy Code', edison.deployToDevice(gulp, plugins, config));
gulp.task('Edison.Kill Processes', edison.killProcesses(gulp, ext, config));
gulp.task('Edison.Restore Packages', edison.restorePackages(gulp, ext, config));
gulp.task('Edison.Restart', edison.setStartup(gulp, ext, config));
gulp.task('Edison.Connect', edison.connect(gulp, ext, config));

gulp.task('Edison.Build and Deploy', function (callback) {
    runSequence(
        'JsHint',
        'Edison.Deploy Code',
        'Edison.Kill Processes',
        'Edison.Restore Packages',
        'Edison.Restart',
        callback);
});