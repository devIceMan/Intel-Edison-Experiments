var cylon = require("cylon");

cylon.robot({
    name: "Morze",
    connections: {
        edison: { adaptor: "intel-iot" }
    },
    devices: {
        led: {
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
        }
    },
    
    setup: function () {
        this.led.turnOff();
    },
    
    work: function () {
        var me = this;
        this.led.turnOn();
        me.setup();
        
        me.button.on('push', function () {
            me.led.turnOn();            
            me.buzzer.digitalWrite(1);
        });
        
        me.button.on('release', function () {
            me.led.turnOff();
            me.buzzer.digitalWrite(0);
        });
    }
}).start();
