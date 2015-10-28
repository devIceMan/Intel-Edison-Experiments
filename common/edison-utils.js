var LcdWriter = (function () {
    function LcdWriter(lcd) {
        this._lcd = lcd;
    }
    LcdWriter.prototype.write = function (message, color) {
        LcdWriter.write(this._lcd, message, color);
    };
    LcdWriter.hexToRgb = function (hex) {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
            : null;
    };
    LcdWriter.write = function (lcd, message, color) {
        message = message || '';
        color = color || '';
        var lines = [];
        if (typeof message == 'string') {
            lines = message.split('\n');
        }
        else if (message instanceof Array) {
            lines = message;
        }
        lines.forEach(function (x, i, a) {
            var s = ('' + x).trim().substr(0, 16);
            while (s.length < 16) {
                s = s + " ";
            }
            a[i] = s;
        });
        var rgb = [255, 255, 255];
        if (color instanceof Array && color.length == 3) {
            rgb = color;
        }
        else if (typeof color == 'string') {
            switch (color) {
                case 'red':
                    rgb = [255, 0, 0];
                    break;
                case 'green':
                    rgb = [0, 255, 0];
                    break;
                case 'blue':
                    rgb = [0, 0, 255];
                    break;
                default:
                    if (color[0] == '#') {
                        rgb = LcdWriter.hexToRgb(color) || rgb;
                    }
            }
        }
        lcd.setColor.apply(lcd, rgb);
        lines.forEach(function (x, i) {
            if (i > 1)
                return;
            lcd.setCursor(i, 0);
            lcd.write(x);
        });
    };
    return LcdWriter;
})();
exports.LcdWriter = LcdWriter;
function getWriter(lcd) {
    var writer = new LcdWriter(lcd);
    return writer.write.bind(writer);
}
exports.getWriter = getWriter;

/// <reference path="../../.typings/tsd.d.ts" />
function createLogger(folder) {
    var winston = require('winston'), winstonError = require('winston-error'), path = require('path'), fs = require('fs'), logsFolder = path.join(folder, 'logs');
    if (!fs.existsSync(logsFolder)) {
        fs.mkdirSync(logsFolder);
    }
    var logger = new winston.Logger({
        exitOnError: false,
        transports: [
            new winston.transports.Console({
                name: 'console',
                colorize: true,
                timestamp: true,
                prettyPrint: true,
            }),
            new winston.transports.DailyRotateFile({
                name: 'rolling-file',
                timestamp: true,
                logstash: true,
                filename: path.join(logsFolder, 'daily.log'),
                json: true
            }),
            new winston.transports.File({
                name: 'exceptions',
                filename: path.join(logsFolder, 'exceptions.log'),
                handleExceptions: true,
                humanReadableUnhandledException: true
            })
        ]
    });
    winstonError(logger);
    return logger;
}
exports.createLogger = createLogger;

var UbiDots = (function () {
    function UbiDots(client) {
        this._client = client;
        this._observations = [];
    }
    UbiDots.prototype.connect = function () {
        if (this._client._authenticationError)
            return this._client._authenticationError;
        if (this._client._isAuthenticating)
            return false;
        if (this._client._isAuthenticated)
            return true;
        var me = this;
        this._client._isAuthenticating = true;
        this._client.auth(function (e) {
            me._client._isAuthenticating = false;
            if (e) {
                me._client._authenticationError = e;
                throw e;
            }
            me._client._isAuthenticated = true;
        });
        return false;
    };
    UbiDots.prototype.sendObservation = function (observation) {
        var ready = this.connect();
        switch (ready) {
            case true:
                if (this._observations.length) {
                    var data = this._observations;
                    this._observations = [];
                    data.push(observation);
                    data.forEach(function (x) {
                        var variable = this._client.getVariable(x.variable);
                        variable.saveValue(x);
                    }, this);
                }
                else {
                    this._client.getVariable(observation.variable).saveValue(observation);
                }
                break;
            case false:
                this._observations.push(observation);
                break;
            default:
                console.error(ready);
        }
    };
    UbiDots.prototype.sendValue = function (variable, value, timestamp) {
        timestamp = timestamp || Date.now();
        return this.sendObservation({ timestamp: timestamp, value: value, variable: variable });
    };
    return UbiDots;
})();
exports.UbiDots = UbiDots;
