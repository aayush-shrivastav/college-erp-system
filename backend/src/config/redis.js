const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});
redis.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Redis error (non-fatal):', err.message);
  }
});
module.exports = redis;
