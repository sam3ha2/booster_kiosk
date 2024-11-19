import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

function log_function_call(func_name, args, result) {
  logger.info(`Function called: ${func_name}`, {
    arguments: args,
    result: result,
    timestamp: new Date().toISOString()
  });
}

export { logger };
export { log_function_call };
export default {
    logger,
    log_function_call
};
