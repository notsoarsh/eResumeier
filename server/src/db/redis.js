const { createClient } = require('redis');
const logger = require('../utils/logger');

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.on('error', (err) => {
  logger.error(`Redis error: ${err.message}`);
});

// Connect on import
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    logger.error(`Redis connection failed: ${err.message}`);
  }
})();

module.exports = redisClient;
