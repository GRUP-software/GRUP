import cron from "node-cron"
import {
  updateDynamicPricing,
  processLoyaltyRewards,
  generateRestockSuggestions,
} from "../controllers/automationController.js"
import logger from "../utils/logger.js"

// Dynamic pricing - runs every hour
export const startDynamicPricingJob = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      await updateDynamicPricing()
      logger.info("Dynamic pricing job completed")
    } catch (error) {
      logger.error("Dynamic pricing job failed:", error)
    }
  })
}

// Loyalty rewards - runs daily at midnight
export const startLoyaltyRewardsJob = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      await processLoyaltyRewards()
      logger.info("Loyalty rewards job completed")
    } catch (error) {
      logger.error("Loyalty rewards job failed:", error)
    }
  })
}

// Restock alerts - runs daily at 9 AM
export const startRestockAlertsJob = () => {
  cron.schedule("0 9 * * *", async () => {
    try {
      const suggestions = await generateRestockSuggestions()
      if (suggestions.length > 0) {
        logger.info(`Generated ${suggestions.length} restock suggestions`)
        // Here you could send email alerts to admins
      }
    } catch (error) {
      logger.error("Restock alerts job failed:", error)
    }
  })
}
