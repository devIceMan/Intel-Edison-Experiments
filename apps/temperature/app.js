var cylon = require("cylon"),
    request = require("request"),
    log = require('winston'),
    path = require('path'),
    LCD_ADDRESS = 0x3E,
    RGB_ADDRESS = 0x62,
    ABS_ZERO = 273.15,
    ROOM_TEMPERATURE = 298.15,
    THERMISTOR = 3975,
    LCD = require('jsupm_i2clcd'),
    myLCD = new LCD.Jhd1313m1(0, 0x3E, 0x62);

cylon.api({
    host: "0.0.0.0",
    port: "3500",
    ssl: false
});

log.add(log.transports.File, {
    filename: path.join(process.cwd(), 'log.txt'),
    json: true
});

log.handleExceptions(new log.transports.File({
    filename: path.join(process.cwd(), 'exceptions.txt'),
    json: true
}));

log.info('Starting Temperature Watcher...');

cylon.robot({
    name: "Temperature Watcher",
    connections: {
        edison: { adaptor: "intel-iot" }
    },
    devices: {
        temperature: {
            driver: "analogSensor",
            pin: 0,
            connection: "edison"
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

        log.debug('Writing to LCD:', str);

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

    sendObservation: function (buffer) {
        // iotkit-agent credentials needed to connect and submit data
        var deviceSpec = require('/usr/lib/node_modules/iotkit-agent/data/device.json'),
            uname = deviceSpec.device_id,
            accountId = deviceSpec.account_id,
            deviceId = deviceSpec.device_id,
            token = deviceSpec.device_token,
            cid = deviceSpec.sensor_list.filter(function (obj) {
                return obj.name === 'Temperature';
            })[0],
            data = (buffer || []).map(function (x) {
                return { on: x.Date, cid: cid, value: x.Temperature }
            }),
            observation = {
                "accountId": accountId,
                "did": uname,
                "on": Date.now(),
                "count": 1,
                "data": data
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
            log.debug('Sending data to cloud:', requestData);
            request(requestData);
        }
        catch (e) {
            log.error(e);
        }
    },

    work: function () {
        var me = this;

        me.temperatureBuffer = [];

        every((1).second(), function () {
            var temperature = me.getTemperature(),
                msg = 't = ' + temperature.toFixed(2),
                observation = {
                    Temperature: temperature,
                    Date: Date.now()
                };

            var color = 'green';
            if (temperature <= 25) {
                color = 'blue';
            }
            else if (temperature >= 30) {
                color = 'red'
            };

            me.writeMessage(msg, color);
            me.temperatureBuffer.push(observation);
        });

        every((10).second(), function () {
            try {
                var buffer = [].concat(me.temperatureBuffer);
                me.temperatureBuffer = [];
                me.sendObservations(buffer);
            }
            catch (e) {
                log.debug('Could`nt send info to cloud:', e);
            }
        });
    }
}).start();
