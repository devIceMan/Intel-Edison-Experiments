var cylon = require("cylon"),
    morze = require('./morze-map.js');

cylon.robot({
    name: "Morze",
    connections: {
        edison: { adaptor: "intel-iot" }
    },
    devices: {
        blue: {
            driver: "led",
            pin: 3,
            connection: "edison"
        },
        button: {
            driver: "button",
            pin: 4,
            connection: "edison"
        },
        buzzer: {
            driver: "direct-pin",
            pin: 7,
            connection: "edison"
        },
        lcd: {
            driver: 'upm-jhd1313m1',
            connection: 'edison'
        }
    },

    setup: function () {
        this.blue.turnOff();
        this.lcd.clear();

        this.dashDotBuffer = [];
        this.dashDotCollector = null;

        this.charCodeBuffer = [];
        this.wordCollector = null;
    },

    restartCollectors: function() {
        var me = this;
        clearTimeout(me.dashDotCollector);
        clearTimeout(me.wordCollector);

        // waiting 350ms ater button pressed, then collecting
        // signals and transforming them to chars
        me.dashDotCollector = setTimeout(function() {
            var code = me.dashDotBuffer.join(''),
                char = morze.map[code];

            // clearing buffer
            me.dashDotBuffer = [];
            if (char) {
                // if we have a valid char, then put it to another buffer
                // and start waiting for word collector
                me.charCodeBuffer.push([code, char]);
                me.writeMessage('Collected: ' + code, 'green');
            } else {
                me.writeMessage('Unknown: ' + code, 'red');
            }

            me.restartWordCollector();
        }, 350);
    },

    restartWordCollector: function () {
        var me = this;

        clearTimeout(me.wordCollector);
        // waiting 550ms after last char collected
        me.wordCollector = setTimeout(function () {
            if (!me.charCodeBuffer.length) return;

            var msg = me.charCodeBuffer.reduce(function (current, next) { return current + next[1]; }, "");
            me.charCodeBuffer = [];
            console.log(msg);
            me.writeMessage(msg, 'blue');
        }, 550);
    },

    writeMessage: function (message, color) {
        var me = this;
        var str = message.toString();
        while (str.length < 16) {
            str = str + " ";
        }
        console.log(message);

        switch (color) {
            case "red":
                me.lcd.setColor(255, 0, 0);
                break;
            case "green":
                me.lcd.setColor(0, 255, 0);
                break;
            case "blue":
                me.lcd.setColor(0, 0, 255);
                break;
            default:
                me.lcd.setColor(255, 255, 255);
                break;
        }

        me.lcd.setCursor(0, 0);
        me.lcd.write(str);
    },

    work: function () {
        var me = this;
        me.setup();

        me.button.on('push', function () {
            clearTimeout(me.dashDotCollector);
            clearTimeout(me.wordCollector);

            me.pressedTime = new Date().getTime();
            me.blue.turnOn();
            // me.buzzer.digitalWrite(1);
        });

        me.button.on('release', function () {
            me.blue.turnOff();
            // me.buzzer.digitalWrite(0);

            var time = new Date().getTime() - me.pressedTime;
            me.pressedTime = 0;
            me.buffer = me.buffer || [];
            if (time <= 150) {
                me.dashDotBuffer.push('.');
                me.restartCollectors();
            }
            else {
                me.dashDotBuffer.push('-');
                me.restartCollectors();
            }

            me.writeMessage(time);
        });
    }
}).start();
