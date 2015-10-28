var cylon = require('cylon'),
    request = require('request'),
    winston = require('winston'),
    winstonError = require('winston-error'),
    LCD_ADDRESS = 0x3E,
    RGB_ADDRESS = 0x62,
    LCD = require('jsupm_i2clcd'),
    myLCD = new LCD.Jhd1313m1(0, 0x3E, 0x62),
    lcdWriter = require('./LcdWriter.js').getWriter(myLCD);

cylon.api({
    host: '0.0.0.0',
    port: '3500',
    ssl: false
});

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({
            filename: '/home/root/log.txt',
            json: true
        })
    ]
});

winstonError(logger);

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

        me.vibro.on('analogRead', function (data) {
            if (!me.ready)
                me.maxValue = Math.max(me.maxValue, data);
            var msg = ['Value:' + data + (me.ready ? ' |' + me.maxValue : '')];
            var color = 'white';
            if (me.ready && data > me.maxValue) {
                color = 'green';
                me.hitCount = me.hitCount + 1;
                msg.push('Hit ' + (me.hitCount) + ' ' + data);
            }
            lcdWriter(msg, color);
        });

        me.button.on('push', function () {
            me.ready = true;
            me.blue.turnOn();
        });

        me.button.on('release', function () {
            me.blue.turnOff();
        });
    }
}).start();
