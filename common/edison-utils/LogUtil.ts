/// <reference path="../../.typings/tsd.d.ts" />

export function createLogger(folder: string): any {

	let winston = require('winston'),
		winstonError = require('winston-error'),
		path = require('path'),
		fs = require('fs'),
		logsFolder = path.join(folder, 'logs');

	if (!fs.existsSync(logsFolder)){
    	fs.mkdirSync(logsFolder);
	}

	let logger = new winston.Logger({
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