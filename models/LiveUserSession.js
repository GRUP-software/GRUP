import mongoose from "mongoose";

const { Schema } = mongoose;

const liveUserSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    socketId: { type: String, required: true },
    lastActivity: { type: Date, default: Date.now },
    currentPage: String,
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

// Auto-expire sessions after 5 minutes of inactivity
liveUserSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 300 });

const LiveUserSession = mongoose.model(
  "LiveUserSession",
  liveUserSessionSchema,
);
export default LiveUserSession;
