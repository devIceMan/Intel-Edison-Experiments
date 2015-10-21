var cylon = require("cylon");

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
        }
    },
    
    setup: function () {
        this.blue.turnOff();
    },
    
    work: function () {
        var me = this;        
        me.setup();
        
        me.button.on('push', function () {
            me.blue.turnOn();
            me.buzzer.digitalWrite(1);
        });
        
        me.button.on('release', function () {
            me.blue.turnOff();
            me.buzzer.digitalWrite(0);
        });
    }
}).start();
