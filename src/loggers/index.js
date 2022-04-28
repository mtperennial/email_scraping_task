const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;
const appRoot = require('app-root-path');
const fs = require('fs');

if (!fs.existsSync(`${appRoot}/src/logs`)) {
    fs.mkdirSync(`${appRoot}/src/logs`, { recursive: true });
}

const customFormate = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: "HH:MM:SS DD:MM:YYYY" }),
        customFormate
    ),
    transports: [
        new transports.File({ filename: `${appRoot}/src/logs/error.log`, level: 'error' }),
        new transports.File({ filename: `${appRoot}/src/logs/combined.log` }),
    ],
});

module.exports = logger;