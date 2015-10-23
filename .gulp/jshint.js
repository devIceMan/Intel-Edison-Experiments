module.exports = function (gulp, plugins, projectName) {
    return function () {
        return gulp.src(['./*.js', './apps/' + projectName + '/*.js'])
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('default'));
    };
};