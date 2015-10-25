var cylon = require("cylon"),
    mqtt = require('mqtt'),
    util = require('util'),
    LCD_ADDRESS = 0x3E,
    RGB_ADDRESS = 0x62,
    ABS_ZERO = 273.15,
    ROOM_TEMPERATURE = 298.15,
    THERMISTOR = 3975;

cylon.robot({
    name: "Temperature Sensor",
    connections: {
        edison: { adaptor: "intel-iot" }
    },
    devices: {
        temperature: {
            driver: "analogSensor",
            pin: 0,
            connection: "edison"
        },
        lcd: {
            driver: 'upm-jhd1313m1',
            connection: 'edison'
        }
    },

    writeMessage: function (message, color) {
        var me = this,
            screen = me.lcd,
            str = ('' + message).trim();

        while (str.length < 16) {
            str = str + " ";
        }
        console.log(message);

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

    getTemperature: function (rawData) {
        var resistance = (1023 - rawData) * 10000 / rawData,
            temperature = 1 / (Math.log(resistance / 10000) / THERMISTOR + 1 / ROOM_TEMPERATURE) - ABS_ZERO;
        return temperature;
    },

    sendObservation: function (temperature) {
        // iotkit-agent credentials needed to connect and submit data
        var deviceSpec = require('/usr/lib/node_modules/iotkit-agent/data/device.json'),
            uname = deviceSpec.device_id,
            account = deviceSpec.account_id,
            password = deviceSpec.device_token,
            comp_name = "Temperature",
            broker = "broker.us.enableiot.com",
            port = 8883,
            // default CA cert location
            ca_certs = ["/usr/lib/node_modules/iotkit-agent/certs/AddTrust_External_Root.pem"],
            // Authentication info
            auth = {
                "username": uname,
                "password": password,
                "keepalive": 60,
                "ca": ca_certs,
                "rejectUnauthorized": true
            },
            cid = deviceSpec.sensor_list.filter(function (obj) {
                return obj.name === comp_name;
            })[0],
            // MQTT topic for data submission
            topic = util.format('server/metric/%s/%s', account, uname),
            client = mqtt.createSecureClient(port, broker, auth),
            now = (new Date).getTime(),
            observation = {
                "accountId": account,
                "did": uname,
                "on": now,
                "count": 1,
                "data": [
                    {
                        "on": now,
                        "value": temperature.toFixed(2),
                        "cid": cid
                    }
                ]
            };

        client.publish(topic, JSON.stringify(observation), function () {
            console.log("Observation is submitted");
            client.end(); // Close the connection when published
        });
    },

    work: function () {
        var me = this;

        every((1).second(), function () {
            var data = me.temperature.analogRead(),
                temperature = me.getTemperature(data),
                msg = 't = ' + temperature.toFixed(2);

            var color = 'green';
            if (temperature <= 25) {
                color = 'blue';
            }
            else if (temperature >= 30) {
                color = 'red'
            };

            me.writeMessage(msg, color);
            try{
                //me.sendObservation(temperature);
            }
            catch(e){
                console.log(e);
            }
        });
    }
}).start();
