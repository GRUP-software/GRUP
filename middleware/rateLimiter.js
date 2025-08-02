import rateLimit from "express-rate-limit"

export const apiLimiter = rateLimit({
  windowMs: 6 * 60 * 1000,
  max: 2,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
})

export const authLimiter = rateLimit({
  windowMs: 6 * 60 * 1000, // 6 minutes
  message: "Too many authentication attempts, please try again later.",
  skipSuccessfulRequests: true,
})

export const paymentLimiter = rateLimit({
  windowMs: 6 * 60 * 1000, // 6 minutes
  max: 2, // limit payment requests
  message: "Too many payment requests, please try again later.",
})

export const uploadLimiter = rateLimit({
  windowMs: 6 * 60 * 1000, 
  max: 6, // limit upload requests
  message: "Too many upload requests, please try again later.",
})

export const adminLimiter = rateLimit({
  windowMs: 6 * 60 * 1000, 
  max: 200, // higher limit for admin
  message: "Too many admin requests, please try again later.",
})


