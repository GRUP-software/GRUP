import mongoose from "mongoose"
const { Schema } = mongoose

const cartItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  variant: { type: String },
  sellingUnit: {
    optionName: { type: String }, 
    displayName: { type: String }, 
    baseUnitQuantity: { type: Number }, 
    baseUnitName: { type: String }, 
    pricePerUnit: { type: Number }, 
    totalBaseUnits: { type: Number }, 
  },
})

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    items: [cartItemSchema],
  },
  { timestamps: true },
)

export default mongoose.model("Cart", cartSchema)
