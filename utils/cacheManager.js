import NodeCache from 'node-cache';

/**
 * Cache Manager Service
 * Provides caching functionality for wallet and user data
 */

// Initialize cache with default settings
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Don't clone objects for better performance
  deleteOnExpire: true // Automatically delete expired keys
});

// Cache keys constants
export const CACHE_KEYS = {
  WALLET_DATA: 'wallet_data',
  WALLET_STATS: 'wallet_stats',
  USER_REFERRAL_INFO: 'user_referral_info',
  TRANSACTION_HISTORY: 'transaction_history',
  WALLET_BALANCE: 'wallet_balance'
};

// Generate cache key with user ID
const generateKey = (baseKey, userId, additionalParams = '') => {
  return `${baseKey}:${userId}${additionalParams ? `:${additionalParams}` : ''}`;
};

/**
 * Wallet Cache Operations
 */

// Cache wallet data
export const cacheWalletData = async (userId, walletData, ttl = 300) => {
  try {
    const key = generateKey(CACHE_KEYS.WALLET_DATA, userId);
    cache.set(key, walletData, ttl);
    return true;
  } catch (error) {
    console.error('Error caching wallet data:', error);
    return false;
  }
};

// Get cached wallet data
export const getCachedWalletData = async (userId) => {
  try {
    const key = generateKey(CACHE_KEYS.WALLET_DATA, userId);
    const cachedData = cache.get(key);
    
    if (cachedData) {
      return cachedData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached wallet data:', error);
    return null;
  }
};

// Cache wallet statistics
export const cacheWalletStats = async (userId, stats, ttl = 300) => {
  try {
    const key = generateKey(CACHE_KEYS.WALLET_STATS, userId);
    cache.set(key, stats, ttl);
    console.log(`💾 Cached wallet stats for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error caching wallet stats:', error);
    return false;
  }
};

// Get cached wallet statistics
export const getCachedWalletStats = async (userId) => {
  try {
    const key = generateKey(CACHE_KEYS.WALLET_STATS, userId);
    const cachedStats = cache.get(key);
    
    if (cachedStats) {
      console.log(`📋 Retrieved cached wallet stats for user ${userId}`);
      return cachedStats;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached wallet stats:', error);
    return null;
  }
};

// Cache wallet balance
export const cacheWalletBalance = async (userId, balance, ttl = 60) => {
  try {
    const key = generateKey(CACHE_KEYS.WALLET_BALANCE, userId);
    cache.set(key, balance, ttl);
    console.log(`💾 Cached wallet balance for user ${userId}: ₦${balance}`);
    return true;
  } catch (error) {
    console.error('Error caching wallet balance:', error);
    return false;
  }
};

// Get cached wallet balance
export const getCachedWalletBalance = async (userId) => {
  try {
    const key = generateKey(CACHE_KEYS.WALLET_BALANCE, userId);
    const cachedBalance = cache.get(key);
    
    if (cachedBalance !== undefined) {
      console.log(`📋 Retrieved cached wallet balance for user ${userId}: ₦${cachedBalance}`);
      return cachedBalance;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached wallet balance:', error);
    return null;
  }
};

// Cache transaction history
export const cacheTransactionHistory = async (userId, transactions, page = 1, ttl = 300) => {
  try {
    const key = generateKey(CACHE_KEYS.TRANSACTION_HISTORY, userId, `page_${page}`);
    cache.set(key, transactions, ttl);
    console.log(`💾 Cached transaction history for user ${userId}, page ${page}`);
    return true;
  } catch (error) {
    console.error('Error caching transaction history:', error);
    return false;
  }
};

// Get cached transaction history
export const getCachedTransactionHistory = async (userId, page = 1) => {
  try {
    const key = generateKey(CACHE_KEYS.TRANSACTION_HISTORY, userId, `page_${page}`);
    const cachedTransactions = cache.get(key);
    
    if (cachedTransactions) {
      console.log(`📋 Retrieved cached transaction history for user ${userId}, page ${page}`);
      return cachedTransactions;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached transaction history:', error);
    return null;
  }
};

// Cache user referral info
export const cacheUserReferralInfo = async (userId, referralInfo, ttl = 600) => {
  try {
    const key = generateKey(CACHE_KEYS.USER_REFERRAL_INFO, userId);
    cache.set(key, referralInfo, ttl);
    console.log(`💾 Cached referral info for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error caching referral info:', error);
    return false;
  }
};

// Get cached user referral info
export const getCachedUserReferralInfo = async (userId) => {
  try {
    const key = generateKey(CACHE_KEYS.USER_REFERRAL_INFO, userId);
    const cachedReferralInfo = cache.get(key);
    
    if (cachedReferralInfo) {
      console.log(`📋 Retrieved cached referral info for user ${userId}`);
      return cachedReferralInfo;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached referral info:', error);
    return null;
  }
};

/**
 * Cache Invalidation Operations
 */

// Invalidate all wallet-related cache for a user
export const invalidateWalletCache = async (userId) => {
  try {
    const patterns = [
      generateKey(CACHE_KEYS.WALLET_DATA, userId),
      generateKey(CACHE_KEYS.WALLET_STATS, userId),
      generateKey(CACHE_KEYS.WALLET_BALANCE, userId),
      generateKey(CACHE_KEYS.USER_REFERRAL_INFO, userId)
    ];
    
    // Invalidate transaction history for all pages
    for (let page = 1; page <= 10; page++) {
      patterns.push(generateKey(CACHE_KEYS.TRANSACTION_HISTORY, userId, `page_${page}`));
    }
    
    let invalidatedCount = 0;
    patterns.forEach(pattern => {
      const keys = cache.keys().filter(key => key.startsWith(pattern));
      keys.forEach(key => {
        cache.del(key);
        invalidatedCount++;
      });
    });
    
    return invalidatedCount;
  } catch (error) {
    console.error('Error invalidating wallet cache:', error);
    return 0;
  }
};

// Invalidate specific cache entry
export const invalidateCacheEntry = async (key) => {
  try {
    const deleted = cache.del(key);
    if (deleted > 0) {
      console.log(`🗑️ Invalidated cache entry: ${key}`);
    }
    return deleted > 0;
  } catch (error) {
    console.error('Error invalidating cache entry:', error);
    return false;
  }
};

// Clear all cache
export const clearAllCache = async () => {
  try {
    cache.flushAll();
    console.log('🗑️ Cleared all cache');
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Cache Statistics
 */

// Get cache statistics
export const getCacheStats = () => {
  try {
    const stats = cache.getStats();
    return {
      hits: stats.hits,
      misses: stats.misses,
      keys: stats.keys,
      ksize: stats.ksize,
      vsize: stats.vsize,
      hitRate: stats.hits / (stats.hits + stats.misses) * 100
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
};

// Get cache keys
export const getCacheKeys = () => {
  try {
    return cache.keys();
  } catch (error) {
    console.error('Error getting cache keys:', error);
    return [];
  }
};

/**
 * Cache with Fallback Pattern
 */

// Get data with cache fallback
export const getDataWithCache = async (userId, cacheKey, fetchFunction, ttl = 300) => {
  try {
    // Try to get from cache first
    let cachedData = null;
    
    switch (cacheKey) {
      case CACHE_KEYS.WALLET_DATA:
        cachedData = await getCachedWalletData(userId);
        break;
      case CACHE_KEYS.WALLET_STATS:
        cachedData = await getCachedWalletStats(userId);
        break;
      case CACHE_KEYS.WALLET_BALANCE:
        cachedData = await getCachedWalletBalance(userId);
        break;
      case CACHE_KEYS.USER_REFERRAL_INFO:
        cachedData = await getCachedUserReferralInfo(userId);
        break;
      default:
        cachedData = null;
    }
    
    if (cachedData) {
      return { data: cachedData, fromCache: true };
    }
    
    // If not in cache, fetch from database
    const freshData = await fetchFunction();
    
    // Cache the fresh data
    switch (cacheKey) {
      case CACHE_KEYS.WALLET_DATA:
        await cacheWalletData(userId, freshData, ttl);
        break;
      case CACHE_KEYS.WALLET_STATS:
        await cacheWalletStats(userId, freshData, ttl);
        break;
      case CACHE_KEYS.WALLET_BALANCE:
        await cacheWalletBalance(userId, freshData, ttl);
        break;
      case CACHE_KEYS.USER_REFERRAL_INFO:
        await cacheUserReferralInfo(userId, freshData, ttl);
        break;
    }
    
    return { data: freshData, fromCache: false };
    
  } catch (error) {
    console.error('Error in getDataWithCache:', error);
    throw error;
  }
};

export default {
  cacheWalletData,
  getCachedWalletData,
  cacheWalletStats,
  getCachedWalletStats,
  cacheWalletBalance,
  getCachedWalletBalance,
  cacheTransactionHistory,
  getCachedTransactionHistory,
  cacheUserReferralInfo,
  getCachedUserReferralInfo,
  invalidateWalletCache,
  invalidateCacheEntry,
  clearAllCache,
  getCacheStats,
  getCacheKeys,
  getDataWithCache,
  CACHE_KEYS
};
