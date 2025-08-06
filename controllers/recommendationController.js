import Product from "../models/Product.js"
import Order from "../models/order.js"
import mongoose from "mongoose" // Declare mongoose variable

// AI-powered product recommendations
export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id

    // Get user's purchase history
    const userOrders = await Order.find({
      user: userId,
      paymentStatus: "paid",
    }).populate("items.product")

    const purchasedProducts = userOrders.flatMap((order) => order.items.map((item) => item.product._id.toString()))

    const purchasedCategories = [
      ...new Set(userOrders.flatMap((order) => order.items.map((item) => item.product.category))),
    ]

    // Find similar users (collaborative filtering)
    const similarUsers = await Order.aggregate([
      { $match: { paymentStatus: "paid", user: { $ne: userId } } },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: purchasedProducts.map((id) => new mongoose.Types.ObjectId(id)) } } },
      {
        $group: {
          _id: "$user",
          commonProducts: { $addToSet: "$items.product" },
          totalSpent: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        },
      },
      {
        $addFields: {
          similarity: { $size: "$commonProducts" },
        },
      },
      { $sort: { similarity: -1 } },
      { $limit: 10 },
    ])

    // Get products bought by similar users
    const similarUserIds = similarUsers.map((user) => user._id)
    const recommendedFromSimilar = await Order.aggregate([
      { $match: { user: { $in: similarUserIds }, paymentStatus: "paid" } },
      { $unwind: "$items" },
      { $match: { "items.product": { $nin: purchasedProducts.map((id) => new mongoose.Types.ObjectId(id)) } } },
      {
        $group: {
          _id: "$items.product",
          score: { $sum: 1 },
          avgPrice: { $avg: "$items.price" },
        },
      },
      { $sort: { score: -1 } },
      { $limit: 5 },
      { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
      {
        $project: {
          product: "$product",
          score: 1,
          reason: "Users with similar purchases also bought this",
        },
      },
    ])

    // Category-based recommendations
    const categoryRecommendations = await Product.find({
      _id: { $nin: purchasedProducts },
      category: { $in: purchasedCategories },
      stock: { $gt: 0 },
    })
      .limit(5)
      .lean()

    // Trending products (high group activity)
    const trendingProducts = await Product.aggregate([
      { $match: { _id: { $nin: purchasedProducts.map((id) => new mongoose.Types.ObjectId(id)) } } },
      {
        $lookup: {
          from: "groupbuys",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$productId", "$$productId"] },
                status: "forming",
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
              },
            },
            { $count: "count" },
          ],
          as: "recentGroups",
        },
      },
      {
        $addFields: {
          groupActivity: { $ifNull: [{ $arrayElemAt: ["$recentGroups.count", 0] }, 0] },
        },
      },
      { $match: { groupActivity: { $gt: 0 } } },
      { $sort: { groupActivity: -1 } },
      { $limit: 5 },
      {
        $project: {
          product: "$$ROOT",
          score: "$groupActivity",
          reason: "Trending - High group purchase activity",
        },
      },
    ])

    // Seasonal recommendations (mock - you can enhance with real seasonal data)
    const currentMonth = new Date().getMonth()
    const seasonalCategories = {
      0: ["Vegetables", "Fruits"], // January
      1: ["Vegetables", "Fruits"], // February
      // ... add more seasonal mappings
    }

    const recommendations = {
      collaborative: recommendedFromSimilar,
      category: categoryRecommendations.map((product) => ({
        product,
        score: 1,
        reason: `Popular in ${product.category} category`,
      })),
      trending: trendingProducts,
      personalized: true,
      timestamp: new Date().toISOString(),
    }

    res.json(recommendations)
  } catch (error) {
    console.error("Recommendations error:", error)
    res.status(500).json({ message: "Error generating recommendations", error: error.message })
  }
}

// Smart inventory alerts
export const getInventoryAlerts = async (req, res) => {
  try {
    const alerts = await Product.aggregate([
      {
        $lookup: {
          from: "groupbuys",
          localField: "_id",
          foreignField: "productId",
          as: "activeGroups",
        },
      },
      {
        $lookup: {
          from: "orders",
          let: { productId: "$_id" },
          pipeline: [
            { $unwind: "$items" },
            {
              $match: {
                $expr: { $eq: ["$items.product", "$$productId"] },
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
              },
            },
            { $group: { _id: null, weeklyDemand: { $sum: "$items.quantity" } } },
          ],
          as: "demand",
        },
      },
      {
        $addFields: {
          activeGroupDemand: {
            $sum: {
              $map: {
                input: { $filter: { input: "$activeGroups", cond: { $eq: ["$$this.status", "forming"] } } },
                as: "group",
                in: "$$group.currentQty",
              },
            },
          },
          weeklyDemand: { $ifNull: [{ $arrayElemAt: ["$demand.weeklyDemand", 0] }, 0] },
          daysUntilStockout: {
            $cond: [{ $gt: ["$weeklyDemand", 0] }, { $divide: [{ $multiply: ["$stock", 7] }, "$weeklyDemand"] }, 999],
          },
        },
      },
      {
        $match: {
          $or: [
            { stock: { $lte: "$lowStockThreshold" } },
            { daysUntilStockout: { $lt: 14 } },
            { activeGroupDemand: { $gte: { $multiply: ["$stock", 0.8] } } },
          ],
        },
      },
      {
        $project: {
          title: 1,
          stock: 1,
          lowStockThreshold: 1,
          activeGroupDemand: 1,
          weeklyDemand: 1,
          daysUntilStockout: 1,
          alertType: {
            $cond: [
              { $lte: ["$stock", "$lowStockThreshold"] },
              "LOW_STOCK",
              {
                $cond: [
                  { $gte: ["$activeGroupDemand", { $multiply: ["$stock", 0.8] }] },
                  "HIGH_GROUP_DEMAND",
                  "PREDICTED_STOCKOUT",
                ],
              },
            ],
          },
          severity: {
            $cond: [
              { $lte: ["$stock", { $multiply: ["$lowStockThreshold", 0.5] }] },
              "CRITICAL",
              {
                $cond: [{ $lte: ["$daysUntilStockout", 7] }, "HIGH", "MEDIUM"],
              },
            ],
          },
        },
      },
      { $sort: { severity: 1, daysUntilStockout: 1 } },
    ])

    res.json({
      alerts,
      summary: {
        critical: alerts.filter((a) => a.severity === "CRITICAL").length,
        high: alerts.filter((a) => a.severity === "HIGH").length,
        medium: alerts.filter((a) => a.severity === "MEDIUM").length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Inventory alerts error:", error)
    res.status(500).json({ message: "Error fetching inventory alerts", error: error.message })
  }
}
