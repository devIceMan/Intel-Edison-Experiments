/// <binding BeforeBuild='jshint' AfterBuild='deploy, kill-processes, set-startup' />
/// <reference path=".typings/tsd.d.ts" />

var gulp = require('gulp'),
    plugins = require('gulp-load-plugins')(),
    ext = require('./.gulp/ext-plugins.js'),
    config = require('./config'),
    // Ssh2Client = ext.ssh2.Client,
    merge = require('merge2'),
    edison = require('./.gulp/edison.js'),
    runSequence = require('run-sequence');

gulp.task('TSD Reinstall', require('./.gulp/tsd-reinstall.js')(gulp, plugins));
gulp.task('JsHint', require('./.gulp/jshint.js')(gulp, plugins, config.projectName));

gulp.task('Edison.Deploy Code', edison.deployToDevice(gulp, plugins, config));
gulp.task('Edison.Kill Processes', edison.killProcesses(gulp, ext, config));
gulp.task('Edison.Restore Packages', edison.restorePackages(gulp, ext, config));
gulp.task('Edison.Restart', edison.setStartup(gulp, ext, config));

gulp.task('Edison.Build and Deploy', function(callback){
    runSequence(
        'Edison.Deploy Code',
        'Edison.Kill Processes',
        'Edison.Restore Packages',
        'Edison.Restart',
        callback);
});

// deploy all js files on root level to the device
// gulp.task('deploy', function () {
//     return gulp
//         .src([
//             './apps/' + config.projectName + '/*.{js,json}',
//             './apps/' + config.projectName + '/readme.md',
//             './common/*.{js,json}',
//             '!gulpfile.js'])
//         .pipe(plugins.scp2({
//             host: config.host,
//             username: config.user,
//             password: config.password,
//             dest: config.projectName
//         }))
//         .on('error', function (err) {
//             console.log('ERR: ' + err);
//         });
// });

// run npm install on the remote machine to assure all packages
// gulp.task('restore-packages', function () {
//     var cmd = 'ssh {user}@{host} cd ~/{projectName}; npm install --production'.format(config);
//
//     plugins.run(cmd)
//         .exec()
//         .pipe(gulp.dest('output'));
// });

// kill all running processes for this app
// gulp.task('kill-processes', function () {
//     var cmd = 'kill -9 `ps | grep "/home/{user}/{projectName}/app.js" | grep -v grep | awk \' { print $1 }\'`'.format(config),
//         ssh = new Ssh2Client();
//
//     ssh.on('ready', function () {
//         ssh.exec(cmd, sshCallback.bind(this, ssh));
//     })
//         .connect({
//             host: config.host,
//             port: config.sshPort,
//             username: config.user,
//             password: config.password
//         });
// });

//set startup
// gulp.task('set-startup', function () {
//     var appFolder = '/home/{0}/{1}'.format(config.user, config.projectName),
//         starter = '/usr/bin/node ' + (config.isDebug ? '{0}/RemoteDebug.js {0}/app.js' : '{0}/app.js').format(appFolder),
//         ssh = new Ssh2Client(),
//         serviceText =
//             "[Unit]\n" +
//             "    Description = Node startup app service for starting a node process\n" +
//             "    After = mdns.service\n" +
//             "[Service]\n" +
//             "    ExecStart = " + starter + "\n" +
//             "    Restart = on-failure\n" +
//             "    RestartSec = 2s\n" +
//             "    Environment=NODE_PATH=/usr/lib/node_modules\n" +
//             "[Install]\n" +
//             "    WantedBy=default.target\n";
//
//     ssh.on('ready', function () {
//         ssh.exec('systemctl stop nodeup.service;' +
//             'echo "' + serviceText + '" > /etc/systemd/system/nodeup.service;' +
//             'systemctl daemon-reload;' +
//             'systemctl enable nodeup.service;' +
//             'systemctl start nodeup.service', sshCallback.bind(this, ssh));
//     })
//         .connect({
//             host: config.host,
//             port: config.sshPort,
//             username: config.user,
//             password: config.password
//         });
// });

// function sshCallback(ssh, err, stream) {
//     if (err) throw err;
//     stream
//         .on('close', function (code, signal) {
//             console.log('Stream closed with code ' + code + ' and signal ' + signal);
//             ssh.end();
//         })
//         .on('data', function (data) {
//             console.log(data);
//         })
//         .stderr.on('data', function (err) {
//             console.log('Error: ' + err);
//         });
// }