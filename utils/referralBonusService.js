import User from "../models/User.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"

/**
 * Referral Bonus Service
 * Handles all referral bonus business logic
 */

// Check if user should receive referral bonus
export const checkReferralBonusEligibility = async (userId) => {
  try {
    console.log(`🔍 Checking referral bonus eligibility for user: ${userId}`)
    
    const user = await User.findById(userId)
    if (!user) return { eligible: false, reason: "User not found" }

    const totalReferrals = user.referredUsers?.length || 0
    console.log(`📊 Total referrals: ${totalReferrals}`)
    
    // Get wallet to check actual transaction records
    const wallet = await Wallet.findOne({ user: userId })
    if (!wallet) return { eligible: false, reason: "Wallet not found" }
    
    // Count actual bonuses given by checking transaction records
    const referralTransactions = await Transaction.find({
      wallet: wallet._id,
      reason: "REFERRAL_BONUS",
      type: "credit"
    })
    const bonusesActuallyGiven = referralTransactions.length
    console.log(`📊 Bonuses actually given: ${bonusesActuallyGiven}`)
    
    // Calculate how many bonuses should be earned based on total referrals
    // Every 3 referrals = 1 bonus: 3, 6, 9, 12, 15, etc.
    const totalBonusesEarned = Math.floor(totalReferrals / 3)
    const missingBonuses = totalBonusesEarned - bonusesActuallyGiven
    
    console.log(`📊 Total bonuses that should be earned: ${totalBonusesEarned}`)
    console.log(`📊 Missing bonuses: ${missingBonuses}`)
    
    const eligible = missingBonuses > 0
    const bonusAmount = eligible ? (missingBonuses * 500) : 0

    console.log(`🎯 Eligibility result: ${eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}, Bonus amount: ₦${bonusAmount}`)

    return {
      eligible,
      bonusAmount,
      totalReferrals,
      bonusesActuallyGiven,
      totalBonusesEarned,
      missingBonuses,
      reason: eligible ? `Eligible for ${missingBonuses} bonus(es)` : `Need ${3 - (totalReferrals % 3)} more referrals for next bonus`
    }
  } catch (error) {
    console.error("Error checking referral bonus eligibility:", error)
    return { eligible: false, reason: "Error checking eligibility" }
  }
}

// Calculate bonus amount based on referral count (FIXED)
export const calculateBonusAmount = async (userId) => {
  try {
    const user = await User.findById(userId)
    if (!user) return 0
    
    const wallet = await Wallet.findOne({ user: userId })
    if (!wallet) return 0
    
    const totalReferrals = user.referredUsers?.length || 0
    
    // Count actual bonuses given
    const referralTransactions = await Transaction.find({
      wallet: wallet._id,
      reason: "REFERRAL_BONUS",
      type: "credit"
    })
    const bonusesActuallyGiven = referralTransactions.length
    
    // Calculate missing bonuses
    const totalBonusesEarned = Math.floor(totalReferrals / 3)
    const missingBonuses = totalBonusesEarned - bonusesActuallyGiven
    
    return missingBonuses * 500 // ₦500 per missing bonus
  } catch (error) {
    console.error("Error calculating bonus amount:", error)
    return 0
  }
}

// Process referral bonus for a user
export const processReferralBonus = async (userId) => {
  try {
    console.log(`🎁 Processing referral bonus for user: ${userId}`)
    
    const eligibility = await checkReferralBonusEligibility(userId)
    console.log(`🎁 Eligibility check result:`, eligibility)
    
    if (!eligibility.eligible) {
      console.log(`❌ Not eligible for bonus: ${eligibility.reason}`)
      return { success: false, message: eligibility.reason }
    }

    const user = await User.findById(userId)
    const bonusAmount = eligibility.bonusAmount

    // Get or create wallet
    let wallet = await Wallet.findById(user.wallet)
    if (!wallet) {
      wallet = await Wallet.create({ user: userId, balance: 0 })
      user.wallet = wallet._id
    }
    
    console.log(`💳 Adding ₦${bonusAmount} to wallet balance (current: ${wallet.balance})`)
    
    // Add bonus to wallet balance
    wallet.balance += bonusAmount
    await wallet.save()
    
    console.log(`✅ Wallet balance updated to: ${wallet.balance}`)

    // Create transaction record
    const transaction = await Transaction.create({
      wallet: wallet._id,
      user: userId,
      type: "credit",
      amount: bonusAmount,
      reason: "REFERRAL_BONUS",
      description: `Referral bonus for inviting ${eligibility.totalReferrals} users`,
      metadata: {
        referralCount: eligibility.totalReferrals,
      }
    })
    
    console.log(`📝 Transaction created: ${transaction._id}`)

    // Update user referral stats - set lastBonusAt to current total referrals
    user.referralStats.lastBonusAt = eligibility.totalReferrals
    user.referralStats.totalBonusesEarned = (user.referralStats.totalBonusesEarned || 0) + bonusAmount
    await user.save()

    console.log(`✅ Referral bonus of ₦${bonusAmount} processed for user ${userId}`)

    return {
      success: true,
      bonusAmount,
      newBalance: wallet.balance,
      totalReferrals: eligibility.totalReferrals,
      message: `Referral bonus of ₦${bonusAmount} added to wallet`
    }
  } catch (error) {
    console.error("Error processing referral bonus:", error)
    return { success: false, message: "Error processing bonus" }
  }
}

// Add referral and check for bonus
export const addReferral = async (referrerId, referredUserId) => {
  try {
    console.log(`🔗 Adding referral: ${referredUserId} to referrer: ${referrerId}`)
    
    const referrer = await User.findById(referrerId)
    if (!referrer) return { success: false, message: "Referrer not found" }

    // Initialize referredUsers array if it doesn't exist
    if (!referrer.referredUsers) {
      referrer.referredUsers = []
    }

    // Add to referredUsers if not already added
    if (!referrer.referredUsers.includes(referredUserId)) {
      referrer.referredUsers.push(referredUserId)
      console.log(`✅ Added new referral. Total referrals now: ${referrer.referredUsers.length}`)
    } else {
      console.log(`⚠️ Referral already exists. Total referrals: ${referrer.referredUsers.length}`)
    }

    // Update referral stats
    referrer.referralStats.totalReferrals = referrer.referredUsers.length
    // FIXED: nextBonusAt should be the next multiple of 3 after current total
    referrer.referralStats.nextBonusAt = Math.ceil((referrer.referralStats.totalReferrals + 1) / 3) * 3

    await referrer.save()
    console.log(`💾 Updated referrer stats: totalReferrals=${referrer.referralStats.totalReferrals}, nextBonusAt=${referrer.referralStats.nextBonusAt}`)

    // Check if referrer should receive bonus
    console.log(`🎁 Checking for referral bonus...`)
    const bonusResult = await processReferralBonus(referrerId)
    console.log(`🎁 Bonus result:`, bonusResult)

    return {
      success: true,
      totalReferrals: referrer.referralStats.totalReferrals,
      bonusProcessed: bonusResult.success,
      bonusAmount: bonusResult.bonusAmount || 0
    }
  } catch (error) {
    console.error("Error adding referral:", error)
    return { success: false, message: "Error adding referral" }
  }
}

// Process all missing bonuses for all users (one-time fix)
export const processAllMissingBonuses = async () => {
  try {
    console.log(`🔧 Starting system-wide missing bonus processing...`)
    
    const users = await User.find({})
    let totalProcessed = 0
    let totalAmount = 0
    
    for (const user of users) {
      try {
        const eligibility = await checkReferralBonusEligibility(user._id)
        
        if (eligibility.eligible) {
          console.log(`🎁 Processing missing bonus for user ${user.email}: ${eligibility.missingBonuses} bonus(es) = ₦${eligibility.bonusAmount}`)
          
          const result = await processReferralBonus(user._id)
          
          if (result.success) {
            totalProcessed++
            totalAmount += result.bonusAmount
            console.log(`✅ Successfully processed ₦${result.bonusAmount} for ${user.email}`)
          } else {
            console.log(`❌ Failed to process bonus for ${user.email}: ${result.message}`)
          }
        }
      } catch (error) {
        console.error(`❌ Error processing bonus for user ${user.email}:`, error)
      }
    }
    
    console.log(`🎉 System-wide bonus processing complete!`)
    console.log(`📊 Total users processed: ${totalProcessed}`)
    console.log(`💰 Total amount distributed: ₦${totalAmount}`)
    
    return {
      success: true,
      totalProcessed,
      totalAmount,
      message: `Processed ${totalProcessed} users with ₦${totalAmount} in missing bonuses`
    }
  } catch (error) {
    console.error("Error in system-wide bonus processing:", error)
    return { success: false, message: "Error processing system-wide bonuses" }
  }
}

// Get referral statistics for a user
export const getReferralStats = async (userId) => {
  try {
    const user = await User.findById(userId)
    if (!user) return null

    const totalReferrals = user.referredUsers?.length || 0
    const lastBonusAt = user.referralStats?.lastBonusAt || 0
    const nextBonusAt = user.referralStats?.nextBonusAt || 3
    const totalBonusesEarned = user.referralStats?.totalBonusesEarned || 0

    // Get wallet to check actual transaction records
    const wallet = await Wallet.findOne({ user: userId })
    if (!wallet) return null
    
    // Count actual bonuses given by checking transaction records
    const referralTransactions = await Transaction.find({
      wallet: wallet._id,
      reason: "REFERRAL_BONUS",
      type: "credit"
    })
    const bonusesActuallyGiven = referralTransactions.length

    // FIXED: Calculate next bonus milestone correctly
    const nextBonusMilestone = Math.ceil((totalReferrals + 1) / 3) * 3
    const referralsNeeded = Math.max(0, nextBonusMilestone - totalReferrals)
    const progressPercentage = totalReferrals > 0 ? (totalReferrals % 3) / 3 * 100 : 0

    // FIXED: Check if user can receive bonus using the corrected logic
    const totalBonusesEarned_should = Math.floor(totalReferrals / 3)
    const canReceiveBonus = totalBonusesEarned_should > bonusesActuallyGiven

    return {
      totalReferrals,
      lastBonusAt,
      nextBonusAt: nextBonusMilestone,
      totalBonusesEarned,
      referralsNeeded,
      progressPercentage,
      canReceiveBonus,
      totalBonusesEarned_should,
      bonusesActuallyGiven
    }
  } catch (error) {
    console.error("Error getting referral stats:", error)
    return null
  }
}
