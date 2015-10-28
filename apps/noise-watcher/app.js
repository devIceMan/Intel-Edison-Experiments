var cylon = require('cylon'),
    request = require('request'),
    winston = require('winston'),
    winstonError = require('winston-error'),
    LCD_ADDRESS = 0x3E,
    RGB_ADDRESS = 0x62,
    LCD = require('jsupm_i2clcd'),
    myLCD = new LCD.Jhd1313m1(0, 0x3E, 0x62),
    lcdWriter = require('./edison-utils.js').getWriter(myLCD);

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
logger.info('Starting Noise Watcher...');

cylon.robot({
    name: 'Noise Watcher',
    observations: [],
    connections: {
        edison: { adaptor: 'intel-iot' }
    },
    devices: {
        sound: {
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

    getSound: function () {
        var me = this,
            rawData = me.sound.analogRead();

        return rawData;
    },

    initialize: function () {
        var me = this;

        clearInterval(me.initWorker);
        clearInterval(me.monitorWorker);

        me.maxNoize = 0;

        me.listenCounter = 0;
        me.initWorker = setInterval(function () {
            me.maxNoize = Math.max(me.maxNoize, me.getSound());
            lcdWriter(['Sampling ' + (++me.listenCounter) + '/30', 'Max noise is ' + me.maxNoize], 'blue');
            if (me.listenCounter >= 30) {
                clearInterval(me.initWorker);
                clearInterval(me.monitorWorker);

                me.monitorWorker = setInterval(function () {
                    var noize = me.getSound(),
                        color = 'green';
                    if (noize > me.maxNoize) {
                        color = 'red';
                    }

                    lcdWriter(['Monitoring (' + me.maxNoize + ')', 'Noise level:' + noize], color);
                }, 500);
            }
        }, 750);
    },

    work: function () {
        var me = this;

        me.button.on('push', function () {
            me.blue.turnOn();
        });

        me.button.on('release', function () {
            me.blue.turnOff();
            me.initialize();
        });

        me.initialize();
    }
}).start();
