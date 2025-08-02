import mongoose from 'mongoose';

const { Schema } = mongoose;

const groupParticipantSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  group: { type: Schema.Types.ObjectId, ref: 'GroupPurchase' },
  committedQty: Number,
});

const GroupParticipant = mongoose.model('GroupParticipant', groupParticipantSchema);
export default GroupParticipant;
