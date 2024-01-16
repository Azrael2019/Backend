import config from "../configs/config";
import winston from "winston";

const winstonConfig = winston.config;
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            level: config.logs.level,
            silent: config.logs.silent,
            handleExceptions: true,
            json: false,
            colorize: config.logs.colorize,
            formatter:  (options) => logFormatter(winstonConfig, options)
        })
    ],
    exitOnError: false
});

const getTimestamp = () => new Date().toISOString();

const logFormatter = (winstonConfig, options) => {
    let timestamp =  trimOrExtendText(24, getTimestamp());
    let level = options.colorize ? winstonConfig.colorize(options.level, trimOrExtendText(7, options.level.toUpperCase())) : trimOrExtendText(7, options.level.toUpperCase());
    let file = trimOrExtendText(50, options.message.substring(0, options.message.indexOf(':')), true);
    let message = options.message.substring(options.message.indexOf(':')+2);
    return timestamp + ' ' +
        level + ' ' +
        file + ' ' +
        message + ' ' +
        (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
};

const trimOrExtendText = (length, text, inverted = false) => {
    if(text.length < length){
        text += ' '.repeat(length-text.length);
    }
    if(text.length > length){
        if(!inverted){
            text = text.substring(0, text.length - length - 3) + '...'
        }else{
            text = '...' + text.substring(text.length - length + 3);
        }
    }
    return text;
};

// module.exports = logger;
export default fileName => {
    let loggerWithFile = {
        error: function(text) {
            logger.error(fileName + ': ' + text)
        },
        warm: function(text) {
            logger.warm(fileName + ': ' + text)
        },
        info: function(text) {
            logger.info(fileName + ': ' + text)
        },
        verbose: function(text) {
            logger.verbose(fileName + ': ' + text)
        },
        debug: function(text) {
            logger.debug(fileName + ': ' + text)
        },
        silly: function(text) {
            logger.silly(fileName + ': ' + text)
        }
    };
    loggerWithFile.stream = {
        write: (message) => {
            logger.info(message);
        }
    };
    return loggerWithFile;
};
