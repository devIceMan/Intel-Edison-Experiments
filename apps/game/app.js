var cylon = require('cylon'),
    request = require('request'),
    express = require('express'),
    socketIo = require('socket.io'),
    path = require('path'),
    webApp = express(),
    LCD_ADDRESS = 0x3E,
    RGB_ADDRESS = 0x62,
    LCD = require('jsupm_i2clcd'),
    myLCD = new LCD.Jhd1313m1(0, 0x3E, 0x62),
    edisonUtils = require('./edison-utils.js'),
    lcdWriter = edisonUtils.getWriter(myLCD),
    logger = edisonUtils.createLogger(__dirname),
    upm_grove = require('jsupm_grove'),
    groveRotary = new upm_grove.GroveRotary(0),
    digitalAccelerometer = require('jsupm_mma7660');

cylon.api({
    host: '0.0.0.0',
    port: '3500',
    ssl: false
});

logger.info('Settings up game app...');

webApp.use(express.static(__dirname));
webApp.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

var server = webApp.listen(4000, function () {
    var host = server.address().address;
    var port = server.address().port;

    logger.info('Game app listening at 4000');

    console.log('Game app listening at http://%s:%s', host, port);
});

var io = socketIo.listen(server);
io.on('connection', function (socket) {
    logger.info('user connected');
    socket.on('disconnect', function () {
        logger.info('user disconnected');
    });

    socket.on('room', function (room) {
        logger.info('user joined room ' + room);
        socket.join(room);
    });
});

logger.info('--------------------------------');
logger.info('Starting Shooting Robot...');

cylon.robot({
    name: 'Shooting Robot',
    observations: [],
    connections: {
        edison: { adaptor: 'intel-iot' }
    },
    devices: {
        blue: {
            driver: "led",
            pin: 4,
            connection: "edison"
        },
        button: {
            driver: "button",
            pin: 3,
            connection: "edison"
        },
        angle: {
            driver: 'analogSensor',
            pin: 0,
            connection: 'edison'
        }
    },

    getVibro: function () {
        var me = this,
            rawData = me.vibro.analogRead();

        if (isNaN(rawData)) return 0;

        return rawData;
    },

    work: function () {
        var me = this;
        me.ready = false;

        // Instantiate an MMA7660 on I2C bus 0
        var myDigitalAccelerometer = new digitalAccelerometer.MMA7660(
            digitalAccelerometer.MMA7660_I2C_BUS,
            digitalAccelerometer.MMA7660_DEFAULT_I2C_ADDR);
        // place device in standby mode so we can write registers
        myDigitalAccelerometer.setModeStandby();
        // enable 64 samples per second
        myDigitalAccelerometer.setSampleRate(digitalAccelerometer.MMA7660.AUTOSLEEP_64);
        // place device into active mode
        myDigitalAccelerometer.setModeActive();

        var x, y, z;
        x = digitalAccelerometer.new_intp();
        y = digitalAccelerometer.new_intp();
        z = digitalAccelerometer.new_intp();

        var ax, ay, az;
        ax = digitalAccelerometer.new_floatp();
        ay = digitalAccelerometer.new_floatp();
        az = digitalAccelerometer.new_floatp();

        var ix = 0, iy = 0, iz = 0;
        var buffer = [];

        var lastDeg = 0;
        var myInterval = setInterval(function () {
            myDigitalAccelerometer.getRawValues(x, y, z);
            var dx = digitalAccelerometer.intp_value(x),
                dy = digitalAccelerometer.intp_value(y),
                dz = digitalAccelerometer.intp_value(z);

            myDigitalAccelerometer.getAcceleration(ax, ay, az);
            var dax = roundNum(digitalAccelerometer.floatp_value(ax), 6),
                day = roundNum(digitalAccelerometer.floatp_value(ay), 6),
                daz = roundNum(digitalAccelerometer.floatp_value(az), 6);

            var str1 = "x=" + dx + " y=" + dy + " z=" + dz;

            myDigitalAccelerometer.getAcceleration(ax, ay, az);
            //var str2 = "x=" + dax + " y=" + day + " z=" + daz;
            var rel_deg = groveRotary.rel_deg();
            var str2 = groveRotary.rel_deg().toFixed(1);
            //var str2 = "x=" + ix + " y=" + iy + " z=" + iz;

            if (Math.abs(lastDeg - rel_deg) > 1){
                io.sockets.emit('turn', {
                    // dx: dx, dy: dy, dz: dz,
                    // dax: dax, day: day, daz: daz
                    dx: (lastDeg - rel_deg) * 10
                });
                lastDeg = rel_deg;
            }

            lcdWriter([str1, str2]);

        }, 150);

        // round off output to match C example, which has 6 decimal places
        function roundNum(num, decimalPlaces) {
            var extraNum = (1 / (Math.pow(10, decimalPlaces) * 1000));
            return (Math.round((num + extraNum) * (Math.pow(10, decimalPlaces))) / Math.pow(10, decimalPlaces));
        }

        // When exiting: clear interval and print message
        process.on('SIGINT', function () {
            clearInterval(myInterval);

            // clean up memory
            digitalAccelerometer.delete_intp(x);
            digitalAccelerometer.delete_intp(y);
            digitalAccelerometer.delete_intp(z);

            digitalAccelerometer.delete_floatp(ax);
            digitalAccelerometer.delete_floatp(ay);
            digitalAccelerometer.delete_floatp(az);

            myDigitalAccelerometer.setModeStandby();

            console.log("Exiting...");
            process.exit(0);
        });

        // me.angle.on('analogRead', function (data) {
        //     lcdWriter([groveRotary.abs_value().toFixed(1) + ',' + groveRotary.rel_value().toFixed(1),
        //         groveRotary.abs_deg().toFixed(1) + ',' + groveRotary.rel_deg().toFixed(1)]);
        // });

        me.button.on('push', function () {
            me.time = Date.now();
            me.blue.turnOn();
        });

        me.button.on('release', function () {
            var time = Date.now() - me.time;
            me.time = 0;
            me.blue.turnOff();

            io.sockets.emit('shot', {
                force: time
            });

            lcdWriter('Shot!', 'green');
            me.timeout = setTimeout(function () {
                lcdWriter('');
                clearTimeout(me.timeout);
            }, 500);
        });
    }
}).start();
