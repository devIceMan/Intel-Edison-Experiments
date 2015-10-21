/// <binding BeforeBuild='jshint' AfterBuild='deploy, set-startup' />

var r = require,
    gulp = r('gulp'),
    config = r('./config'),
    ssh2Client = r('ssh2').Client,
    sf = r('string-format'),
    conn;

// running JsHint on all js files
gulp.task('jshint', function () {
    var jshint = r('gulp-jshint');
    gulp.src(['./*.js', './' + config.projectName + '/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// deploy all js files on root level to the device
gulp.task('deploy', function () {
    var scp = r('gulp-scp2');
    return gulp
        .src(['./' + config.projectName + '/*.{js,json}', './' + config.projectName + '/readme.md', '!gulpfile.js'])
        .pipe(scp({
        host: config.host,
        username: config.user,
        password: config.password,
        dest: config.projectName
    }))
        .on('error', function (err) {
        console.log('ERR: ' + err);
    });
});

// run npm install on the remote machine to assure all packages
gulp.task('restore-packages', function () {
    var run = r('gulp-run'),
        cmd = 'ssh {0}@{1} cd ~/{2}; npm install --production'
            .format(config.user, config.host, config.projectName);
    
    run(cmd)
        .exec()
        .pipe(gulp.dest('output'));
});

//set startup
gulp.task('set-startup', function() {
    var serviceText =
        "[Unit]\n" +
            "    Description = Node startup app service for starting a node process\n" +
            "    After = mdns.service\n" +
            "[Service]\n" +
            "    ExecStart = /usr/bin/node /home/" + config.user + "/" + config.projectName + "/app.js\n" +
            "    Restart = on-failure\n" +
            "    RestartSec = 2s\n" +
            "    Environment=NODE_PATH=/usr/lib/node_modules\n" +
            "[Install]\n" +
            "    WantedBy=default.target\n";

    conn = new ssh2Client();
    conn.on('ready', function() {
            conn.exec('systemctl stop nodeup.service;' +
                'echo "' + serviceText + '" > /etc/systemd/system/nodeup.service;' +
                'systemctl daemon-reload;' +
                'systemctl enable nodeup.service;' +
                'systemctl start nodeup.service', execCallback);
        })
        .connect({
            host: config.host,
            port: config.sshPort,
            username: config.user,
            password: config.password
        });
});

function execCallback(err, stream) {
    if (err) throw err;
    stream
        .on('close', function (code, signal) { console.log('Stream closed with code ' + code + ' and signal ' + signal); conn.end() })
        .on('data', function (data) { console.log(data); })
        .stderr.on('data', function (err) { console.log('Error: ' + err); });
}