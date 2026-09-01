import rateLimit from "express-rate-limit";

const isDev = process.env.NODE_ENV !== "production";

// In development, default to generous limits to prevent blocking local development & testing
const globalMax = Number(process.env.RATE_LIMIT_GLOBAL_MAX) || (isDev ? 5000 : 150);
const authMax = Number(process.env.RATE_LIMIT_AUTH_MAX) || (isDev ? 1000 : 20);
const superadminMax = Number(process.env.RATE_LIMIT_SUPERADMIN_MAX) || (isDev ? 2000 : 100);

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: globalMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const superadminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: superadminMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Rate limit exceeded for superadmin actions.",
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

