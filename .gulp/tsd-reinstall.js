module.exports = function (gulp, plugins) {
    return function (callback) {
        return plugins.tsd({
            command: 'reinstall',
            config: './tsd.json',
            opts: {
                saveBundle: true,
                overwriteFiles: true,
                resolveDependencies: true
            }
        }, callback);
    };
};