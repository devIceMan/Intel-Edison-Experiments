var cylon = require('cylon'),
    request = require('request'),
    winston = require('winston'),
    winstonError = require('winston-error'),
    path = require('path'),
    apiData = require('/home/root/.api-data/ubidots.json'),
    ubidots = require('ubidots'),
    ubidotsUtils = require('./edison-utils.js'),
    client = ubidots.createClient(apiData.apiKey),
    wrapper = new ubidotsUtils.UbiDots(client),
    LCD_ADDRESS = 0x3E,
    RGB_ADDRESS = 0x62,
    LCD = require('jsupm_i2clcd'),
    myLCD = new LCD.Jhd1313m1(0, 0x3E, 0x62);

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

logger.info('--------------------------------')
logger.info('Starting Light and Sound Watcher...');

cylon.robot({
    name: 'Light and Sound Watcher',
    observations: [],
    connections: {
        edison: { adaptor: 'intel-iot' }
    },
    devices: {
        sound: {
            driver: 'analogSensor',
            pin: 2,
            connection: 'edison'
        },
        light: {
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
        // ,
        // lcd: {
        //     driver: 'upm-jhd1313m1',
        //     connection: 'edison'
        // }
    },

    writeMessage: function (message, color, line) {
        var me = this,
            screen = myLCD,
            str = ('' + message).trim();

        line = line || 0;
        line = line > 1 ? 1 : line;
        line = line < 0 ? 0 : line;

        while (str.length < 16) {
            str = str + " ";
        }

        switch (color) {
            case "red":
                screen.setColor(255, 0, 0);
                break;
            case "green":
                screen.setColor(0, 255, 0);
                break;
            case "blue":
                screen.setColor(0, 0, 255);
                break;
            default:
                screen.setColor(255, 255, 255);
                break;
        }

        screen.setCursor(line, 0);
        screen.write(str);
    },

    getLight: function () {
        var me = this,
            rawData = me.light.analogRead();

        return rawData;
    },

    getSound: function () {
        var me = this,
            rawData = me.sound.analogRead();

        return rawData;
    },

    work: function () {
        var me = this;

        me.button.on('push', function () {
            me.blue.turnOn();
        });

        me.button.on('release', function () {
            me.blue.turnOff();
        });

        every((1).second(), function () {
            var light = me.getLight(),
                sound = me.getSound();

            me.writeMessage('light = ' + light, null, 0);
            me.writeMessage('sound = ' + sound, null, 1);

            wrapper.sendValue(apiData.variables.light, light);
            wrapper.sendValue(apiData.variables.sound, sound);
        });
    }
}).start();
