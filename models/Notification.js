import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["success", "error", "warning", "info", "loading"],
      default: "info",
    },
    category: {
      type: String,
      enum: ["payment", "group_buy", "referral", "wallet", "system", "order"],
      default: "system",
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    actionUrl: {
      type: String,
      maxlength: 200,
    },
    actionText: {
      type: String,
      maxlength: 50,
    },
    expiresAt: {
      type: Date,
      default: function () {
        // Auto-expire after 30 days
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for better query performance
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, category: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for time ago
notificationSchema.virtual("timeAgo").get(function () {
  const now = new Date();
  const diffInSeconds = Math.floor((now - this.createdAt) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return this.createdAt.toLocaleDateString();
});

// Static method to create notification
notificationSchema.statics.createNotification = async function (
  notificationData,
) {
  const notification = new this(notificationData);
  await notification.save();
  return notification;
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({ userId, read: false });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function (userId) {
  return await this.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() },
  );
};

// Static method to delete old notifications
notificationSchema.statics.cleanupOldNotifications = async function (
  daysOld = 30,
) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return await this.deleteMany({ createdAt: { $lt: cutoffDate } });
};

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
