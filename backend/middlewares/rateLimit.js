const rateLimit = require('express-rate-limit');

function authRateLimiter() {
  if (String(process.env.AUTH_RATE_LIMIT_ENABLED || 'false').toLowerCase() !== 'true') {
    return (req, res, next) => next();
  }
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts. Please try again later.' }
  });
}

module.exports = { authRateLimiter };
