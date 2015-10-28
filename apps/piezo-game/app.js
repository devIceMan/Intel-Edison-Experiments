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
    logger = edisonUtils.createLogger(__dirname);

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
logger.info('Starting Vibration Watcher...');

cylon.robot({
    name: 'Vibration Watcher',
    observations: [],
    connections: {
        edison: { adaptor: 'intel-iot' }
    },
    devices: {
        vibro: {
            driver: 'analogSensor',
            pin: 3,
            connection: 'edison'
        },
        blue: {
            driver: "led",
            pin: 4,
            connection: "edison"
        },
        button: {
            driver: "button",
            pin: 3,
            connection: "edison"
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
        me.hitCount = 0;
        me.maxValue = 0;
        me.ready = false;

        me.samplingTimeout = setTimeout(function(){
            me.ready = true;
            clearTimeout(me.samplingTimeout);
        }, 5000);

        me.vibro.on('analogRead', function (data) {
            if (!me.ready)
                me.maxValue = Math.max(me.maxValue, data);
            var msg = ['Value:' + data + (me.ready ? ' |' + me.maxValue : '')];
            var color = 'white';
            if (me.ready && data > me.maxValue) {
                color = 'green';
                me.hitCount = me.hitCount + 1;
                msg.push('Hit ' + (me.hitCount) + ' ' + data);
                try{
                io.sockets.emit('shot', {
                    value: data
                });
                }
                catch(e){
                    logger.error(e);
                }
            }

            lcdWriter(msg, color);
        });

        me.button.on('push', function () {
            me.blue.turnOn();
        });

        me.button.on('release', function () {
            me.blue.turnOff();
        });
    }
}).start();
