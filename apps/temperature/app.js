var cylon = require("cylon"),
    LCD_ADDRESS = 0x3E,
    RGB_ADDRESS = 0x62,
    ABS_ZERO = 273.15,
    ROOM_TEMPERATURE = 298.15,
    THERMISTOR = 3975;

cylon.robot({
    name: "Morze",
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

    work: function () {
        var me = this;
        me.writeMessage('Ready!');

        every((1).second(), function () {
            var data = me.temperature.analogRead(),
                resistance = (1023 - data) * 10000 / data,
                temperature = 1 / (Math.log(resistance / 10000) / THERMISTOR + 1 / ROOM_TEMPERATURE) - ABS_ZERO,
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
    }
}).start();
