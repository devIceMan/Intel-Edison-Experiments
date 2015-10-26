var cylon = require('cylon'),
    request = require('request'),
    winston = require('winston'),
    winstonError = require('winston-error'),
    path = require('path'),
    LCD_ADDRESS = 0x3E,
    RGB_ADDRESS = 0x62,
    ABS_ZERO = 273.15,
    ROOM_TEMPERATURE = 298.15,
    THERMISTOR = 3975,
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
            filename: './home/root/log.txt',
            json: true
        })
    ]
});

winstonError(logger);

logger.info('--------------------------------')
logger.info('Starting Temperature Watcher...');

cylon.robot({
    name: 'Temperature Watcher',
    connections: {
        edison: { adaptor: 'intel-iot' }
    },
    devices: {
        temperature: {
            driver: 'analogSensor',
            pin: 0,
            connection: 'edison'
        }
        // ,
        // lcd: {
        //     driver: 'upm-jhd1313m1',
        //     connection: 'edison'
        // }
    },

    writeMessage: function (message, color) {
        var me = this,
            screen = myLCD,
            str = ('' + message).trim();

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

        screen.setCursor(0, 0);
        screen.write(str);
    },

    getTemperature: function () {
        var me = this,
            rawData = me.temperature.analogRead(),
            resistance = (1023 - rawData) * 10000 / rawData,
            temperature = 1 / (Math.log(resistance / 10000) / THERMISTOR + 1 / ROOM_TEMPERATURE) - ABS_ZERO;

        return temperature;
    },

    sendObservation: function (data) {
        var deviceSpec = require('/usr/lib/node_modules/iotkit-agent/data/device.json'),
            accountId = deviceSpec.account_id,
            deviceId = deviceSpec.device_id,
            token = deviceSpec.device_token,
            component = deviceSpec.sensor_list.filter(function (obj) {
                return obj.name === 'temperature';
            })[0],
            cid = data.componentId = component.cid,
            observation = {
                "accountId": accountId,
                "on": Date.now(),
                "data": [data]
            },
            requestData = {
                url: 'https://dashboard.us.enableiot.com/v1/api/data/' + deviceId,
                method: 'POST',
                json: true,
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                body: observation
            };

        try {

            var err_handler = function (err) {
                if (err) throw err;
            };

            var process_response = function (res, body, callback) {
                var data = null;
                if (res.statusCode === 200 || res.statusCode === 201) {
                    if (res.headers['content-type'] &&
                        res.headers['content-type'].indexOf('application/json') > -1) {
                        data = body;
                    } else {
                        data = null;
                    }
                } else if (res.statusCode === 204) {
                    data = { status: "Done" };
                }
                return callback(data);
            };

            request(requestData, function (error, response, body) {
                if (!error && (response.statusCode === 200 ||
                    response.statusCode === 201 ||
                    response.statusCode === 204)) {
                    process_response(response, body, function (json_data) {
                        return err_handler(null, json_data);
                    });
                } else {
                    error = error || body;
                    return err_handler(error);
                }
            });
        }
        catch (e) {
            logger.error(e);
        }
    },

    work: function () {
        var me = this;

        every((1).second(), function () {
            var temperature = me.getTemperature(),
                msg = 't = ' + temperature.toFixed(2);

            var color = 'green';
            if (temperature <= 25) {
                color = 'blue';
            }
            else if (temperature >= 30) {
                color = 'red'
            };

            me.writeMessage(msg, color);
        });

        every((10).second(), function () {
            try {
                me.sendObservation({
                    on: Date.now(),
                    value: me.getTemperature().toFixed(2)
                });
            }
            catch (e) {
                logger.error(e);
            }
            finally {
            }
        });
    }
}).start();
