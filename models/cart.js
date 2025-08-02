import mongoose from 'mongoose';
const { Schema } = mongoose;

const cartItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  variant: { type: String }, 
});

const cartSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  items: [cartItemSchema],
}, { timestamps: true });

export default mongoose.model('Cart', cartSchema);
