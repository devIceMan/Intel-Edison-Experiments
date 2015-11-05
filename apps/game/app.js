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
    groveRotary = new upm_grove.GroveRotary(3),
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
            pin: 2,
            connection: "edison"
        },
        button: {
            driver: "button",
            pin: 3,
            connection: "edison"
        }
    },

    initAccel: function () {
        // Instantiate an MMA7660 on I2C bus 0
        this.accel = new digitalAccelerometer.MMA7660(
            digitalAccelerometer.MMA7660_I2C_BUS,
            digitalAccelerometer.MMA7660_DEFAULT_I2C_ADDR);
        // place device in standby mode so we can write registers
        this.accel.setModeStandby();
        // enable 64 samples per second
        this.accel.setSampleRate(digitalAccelerometer.MMA7660.AUTOSLEEP_64);
        // place device into active mode
        this.accel.setModeActive();

        this.x = digitalAccelerometer.new_intp();
        this.y = digitalAccelerometer.new_intp();
        this.z = digitalAccelerometer.new_intp();

        this.ax = digitalAccelerometer.new_floatp();
        this.ay = digitalAccelerometer.new_floatp();
        this.az = digitalAccelerometer.new_floatp();

        this.lastX = 0;
        this.lastY = 0;
        this.lastZ = 0;
    },

    releaseAccel: function(){
        digitalAccelerometer.delete_intp(this.x);
        digitalAccelerometer.delete_intp(this.y);
        digitalAccelerometer.delete_intp(this.z);

        digitalAccelerometer.delete_floatp(this.ax);
        digitalAccelerometer.delete_floatp(this.ay);
        digitalAccelerometer.delete_floatp(this.az);

        this.accel.setModeStandby();
    },

    roundNum: function (num, decimalPlaces) {
        // round off output to match C example, which has 6 decimal places
        var extraNum = (1 / (Math.pow(10, decimalPlaces) * 1000));
        return (Math.round((num + extraNum) * (Math.pow(10, decimalPlaces))) / Math.pow(10, decimalPlaces));
    },

    getAcceleration: function () {
        this.accel.getAcceleration(this.ax, this.ay, this.az);
        return {
            x: this.roundNum(digitalAccelerometer.floatp_value(this.ax), 6),
            y: this.roundNum(digitalAccelerometer.floatp_value(this.ay), 6),
            z: this.roundNum(digitalAccelerometer.floatp_value(this.az), 6)
        };
    },

    getCoords: function (f) {
        f = f || 1;
        this.accel.getRawValues(this.x, this.y, this.z);

        var m = 1;
        if (this.getBackFront() == 'BACK') m = -1;

        var dx = digitalAccelerometer.intp_value(this.x) * m,
            dy = digitalAccelerometer.intp_value(this.y),
            dz = digitalAccelerometer.intp_value(this.z);

        if (true || Math.abs(this.lastX - dx) > f) {
            this.lastX = dx;
        }

        if (true || Math.abs(this.lastY - dy) > f) {
            this.lastY = dy;
        }

        if (true || Math.abs(this.lastZ - dz) > f) {
            this.lastZ = dz;
        }

        return {
            x: this.lastX,
            y: this.lastY,
            z: this.lastZ
        };
    },

    getTaped: function(){
        return this.accel.tiltTap();
    },

    getRotation: function () {
        this.lastRotation = this.lastRotation || 0;
        return groveRotary.rel_deg();
    },

    getBackFront: function () {
        var tbf = this.accel.tiltBackFront();
        switch (tbf) {
            case 0x00: return 'UNKNOWN';
            case 0x01: return 'FRONT';
            case 0x02: return 'BACK';
            default: return 'UNKNOWN';
        }
    },

    getLP: function(){
        var lp = this.accel.tiltLandscapePortrait();
            switch (lp) {
                case 0x01: return 'LEFT';
                case 0x02: return 'RIGHT';
                case 0x05: return 'UP';
                case 0x06: return 'DOWN';
                case 0x00: return 'UNKNONW';
                default: return 'UNKNONW';
            }
    },

    printData: function(){
        var c = this.getCoords(1),
            bf = this.getBackFront(),
            lp = this.getLP(),
            r = this.getRotation();

        lcdWriter([ "x=" + c.x + " y=" + c.y + " z=" + c.z,
        bf+'-'+lp+ ' R:' + r.toFixed(0) ]);

        console.log([ "x=" + c.x + " y=" + c.y + " z=" + c.z,
        bf+'-'+lp+ ' R:' + r.toFixed(0) ]);
    },

    work: function () {
        var me = this;

        me.initAccel();
        console.log('start');
        var lastDeg = 0;
        var myInterval = setInterval(function () {
            var c = me.getCoords();
            me.printData();

            var rotation = me.getRotation();

            if (Math.abs(lastDeg - rotation) > 1) {
                io.sockets.emit('turn', {
                    dx: (lastDeg - rotation) * 10
                });
                lastDeg = rotation;
            }

            // if (me.getTaped()){
            //     io.sockets.emit('shot', {
            //         force: 10
            //     });
            // }
        }, 150);

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
        });
    }
}).start();
