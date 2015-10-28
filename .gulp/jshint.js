module.exports = function (gulp, plugins, projectName) {
    var jshint = plugins.jshint;
    return function () {
        return gulp.src(['./*.js', './apps/' + projectName + '/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter('fail'));
    };
};