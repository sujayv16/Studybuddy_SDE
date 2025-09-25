const { createLogger, format, transports } = require('winston');

const isProd = process.env.NODE_ENV === 'production';
const logFormat = (process.env.LOG_FORMAT || 'pretty').toLowerCase();

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat === 'json'
    ? format.combine(format.timestamp(), format.errors({ stack: true }), format.json())
    : format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ level, message, timestamp, ...meta }) => {
          const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}: ${message}${extras}`;
        })
      ),
  transports: [new transports.Console()],
});

module.exports = logger;
