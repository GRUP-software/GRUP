import LiveUserSession from "../models/LiveUserSession.js"
import User from "../models/User.js"

export const updateUserActivity = async (req, res) => {
  try {
    const userId = req.user.id
    const { currentPage, socketId } = req.body

    await LiveUserSession.findOneAndUpdate(
      { userId },
      {
        userId,
        socketId,
        currentPage,
        lastActivity: new Date(),
        isActive: true,
      },
      { upsert: true, new: true },
    )

    // Update user online status
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date(),
      socketId,
    })

    res.json({ message: "Activity updated" })
  } catch (err) {
    console.error("Update activity error:", err)
    res.status(500).json({ message: "Error updating activity", error: err.message })
  }
}

export const getLiveUserCount = async (req, res) => {
  try {
    // Count active sessions from last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const activeUsers = await LiveUserSession.countDocuments({
      lastActivity: { $gte: fiveMinutesAgo },
      isActive: true,
    })

    // If called as API endpoint (with res object)
    if (res) {
      res.json({ liveUsers: activeUsers })
    }

    // Return the count for internal use
    return { liveUsers: activeUsers }
  } catch (err) {
    console.error("Get live user count error:", err)

    // If called as API endpoint
    if (res) {
      res.status(500).json({ message: "Error fetching live user count", error: err.message })
    }

    // Return default for internal use
    return { liveUsers: 0 }
  }
}

// Add a separate utility function for internal use
export const getLiveUserCountUtil = async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const activeUsers = await LiveUserSession.countDocuments({
      lastActivity: { $gte: fiveMinutesAgo },
      isActive: true,
    })

    return activeUsers
  } catch (err) {
    console.error("Get live user count utility error:", err)
    return 0
  }
}

export const userDisconnected = async (socketId, res) => {
  try {
    await LiveUserSession.findOneAndUpdate({ socketId }, { isActive: false })

    const session = await LiveUserSession.findOne({ socketId })
    if (session) {
      await User.findByIdAndUpdate(session.userId, {
        isOnline: false,
        lastSeen: new Date(),
      })
    }

    console.log(`User disconnected: ${socketId}`)

    // If called as API endpoint (with res object)
    if (res) {
      res.json({ message: "User disconnected" })
    }
  } catch (err) {
    console.error("User disconnect error:", err)

    // If called as API endpoint
    if (res) {
      res.status(500).json({ message: "Error disconnecting user", error: err.message })
    }
  }
}
