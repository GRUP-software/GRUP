import GroupPurchase from '../models/GroupPurchase.js'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import User from '../models/User.js'

const expireGroups = async () => {
  const now = new Date()
  const expiredGroups = await GroupPurchase.find({
    status: 'forming',
    expiresAt: { $lt: now },
  })

  for (const group of expiredGroups) {
    group.status = 'expired'
    await group.save()

    for (const p of group.participants) {
      const user = await User.findById(p.user).populate('wallet')
      const refund = p.quantity * 100

      user.wallet.balance += refund
      await user.wallet.save()

      await Transaction.create({
        wallet: user.wallet._id,
        type: 'credit',
        amount: refund,
        reason: 'REFUND',
      })
    }
  }

  console.log(`Expired ${expiredGroups.length} groups and refunded users`)
}

export default expireGroups
