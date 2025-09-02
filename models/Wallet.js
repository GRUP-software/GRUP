import mongoose from "mongoose";

const { Schema } = mongoose;

const walletSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  balance: { type: Number, default: 0 },
});

const Wallet = mongoose.model("Wallet", walletSchema);
export default Wallet;
