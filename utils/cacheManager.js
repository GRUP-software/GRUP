import NodeCache from "node-cache"
import logger from "./logger.js"

// In-memory cache with TTL
const cache = new NodeCache({
  stdTTL: 600, // 10 minutes default
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false,
})

export class CacheManager {
  static set(key, value, ttl = 600) {
    try {
      cache.set(key, value, ttl)
      logger.debug(`Cache SET: ${key}`)
    } catch (error) {
      logger.error(`Cache SET error for ${key}:`, error)
    }
  }

  static get(key) {
    try {
      const value = cache.get(key)
      if (value !== undefined) {
        logger.debug(`Cache HIT: ${key}`)
      } else {
        logger.debug(`Cache MISS: ${key}`)
      }
      return value
    } catch (error) {
      logger.error(`Cache GET error for ${key}:`, error)
      return undefined
    }
  }

  static del(key) {
    try {
      cache.del(key)
      logger.debug(`Cache DEL: ${key}`)
    } catch (error) {
      logger.error(`Cache DEL error for ${key}:`, error)
    }
  }

  static flush() {
    try {
      cache.flushAll()
      logger.info("Cache flushed")
    } catch (error) {
      logger.error("Cache flush error:", error)
    }
  }

  static getStats() {
    return cache.getStats()
  }

  // Cache wrapper for expensive operations
  static async wrap(key, fn, ttl = 600) {
    const cached = this.get(key)
    if (cached !== undefined) {
      return cached
    }

    try {
      const result = await fn()
      this.set(key, result, ttl)
      return result
    } catch (error) {
      logger.error(`Cache wrap error for ${key}:`, error)
      throw error
    }
  }
}

// Cache middleware for Express routes
export const cacheMiddleware = (ttl = 300) => {
  return (req, res, next) => {
    const key = `route:${req.method}:${req.originalUrl}`
    const cached = CacheManager.get(key)

    if (cached) {
      return res.json(cached)
    }

    // Override res.json to cache the response
    const originalJson = res.json
    res.json = function (data) {
      CacheManager.set(key, data, ttl)
      return originalJson.call(this, data)
    }

    next()
  }
}

export default CacheManager
