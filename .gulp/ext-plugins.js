module.exports = function () {
    var ext = require('gulp-load-plugins')({
        pattern: ['*', '!gulp', '!gulp-*', '!gulp.*', '!@*/gulp{-,.}*'],
        replaceString: /[|&;$%@"<>()+,-]/,
        rename: {
            'string-format': 'format',
            'merge2': 'merge'
        }
    });

    ext.format.extend(String.prototype);

    return ext;
}();