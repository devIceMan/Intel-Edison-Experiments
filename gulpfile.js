/// <binding BeforeBuild='jshint' AfterBuild='deploy, kill-processes, set-startup' />

var r = require,
    gulp = r('gulp'),
    config = r('./config'),
    ssh2Client = r('ssh2').Client,
    sf = r('string-format'),
    conn;

sf.extend(String.prototype);

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
        .src([
        './' + config.projectName + '/*.{js,json}', 
        './' + config.projectName + '/readme.md', 
        './common/*.{js,json}', 
        '!gulpfile.js'])
        .pipe(scp({
            host: config.host,
            username: config.user,
            password: config.password,
            dest: config.projectName
        }))
        .on('error', function(err) {
            console.log('ERR: ' + err);
        });
});

// run npm install on the remote machine to assure all packages
gulp.task('restore-packages', function () {
    var run = r('gulp-run'),
        cmd = 'ssh {user}@{host} cd ~/{projectName}; npm install --production'
            .format(config);
    
    run(cmd)
        .exec()
        .pipe(gulp.dest('output'));
});

// kill all running processes for this app
gulp.task('kill-processes', function() {
    var cmd = 'kill -9 `ps | grep "/home/{user}/{projectName}/app.js" | grep -v grep | awk \' { print $1 }\'`'.format(config),
        ssh = new ssh2Client();

    ssh.on('ready', function() {
            ssh.exec(cmd, sshCallback.bind(this, ssh));
        })
        .connect({
            host: config.host,
            port: config.sshPort,
            username: config.user,
            password: config.password
        });
});

//set startup
gulp.task('set-startup', function () {
    var appFolder = '/home/{0}/{1}'.format(config.user, config.projectName),
        starter = '/usr/bin/node ' + (config.isDebug ? '{0}/RemoteDebug.js {0}/app.js' : '{0}/app.js').format(appFolder),
        ssh = new ssh2Client(),
        serviceText =
            "[Unit]\n" +
                "    Description = Node startup app service for starting a node process\n" +
                "    After = mdns.service\n" +
                "[Service]\n" +
                "    ExecStart = " + starter + "\n" +
                "    Restart = on-failure\n" +
                "    RestartSec = 2s\n" +
                "    Environment=NODE_PATH=/usr/lib/node_modules\n" +
                "[Install]\n" +
                "    WantedBy=default.target\n";

    ssh.on('ready', function() {
            ssh.exec('systemctl stop nodeup.service;' +
                'echo "' + serviceText + '" > /etc/systemd/system/nodeup.service;' +
                'systemctl daemon-reload;' +
                'systemctl enable nodeup.service;' +
                'systemctl start nodeup.service', sshCallback.bind(this, ssh));
        })
        .connect({
            host: config.host,
            port: config.sshPort,
            username: config.user,
            password: config.password
        });
});

function sshCallback(ssh, err, stream) {
    if (err) throw err;
    stream
        .on('close', function(code, signal) {
            console.log('Stream closed with code ' + code + ' and signal ' + signal);
            ssh.end();
        })
        .on('data', function(data) {
            console.log(data);
        })
        .stderr.on('data', function(err) {
            console.log('Error: ' + err);
        });
}