import mongoose from "mongoose"
import slugify from "slugify"

const { Schema } = mongoose

const productSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    description: { type: String },
    basePrice: { type: Number },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    category: { type: String },
    unitTag: {
      type: String,
      required: false,
      enum: ["Litres", "Paint", "Bags", "Kg", "Bottles", "Piece"],
    },
    groupEligible: { type: Boolean, default: false },
    lowStockThreshold: { type: Number, default: 5 },
    minimumViableUnits: {
      type: Number,
      default: 20,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Minimum viable units must be a whole number",
      },
    },
    images: [String],
    variants: [
      {
        name: String,
        options: [String], // e.g., sizes: ["Small", "Medium", "Large"]
      },
    ],
    sellingUnits: {
      enabled: { type: Boolean, default: false },
      baseUnit: { type: String }, // e.g., "250g portions", "paints", "pieces"
      baseUnitName: { type: String }, // e.g., "250g portion", "paint", "piece"
      baseUnitPrice: { type: Number }, // Price per base unit
      options: [
        {
          name: { type: String }, // Removed required to prevent validation errors
          displayName: { type: String }, // Removed required to prevent validation errors
          baseUnitQuantity: { type: Number, default: 1 }, // Added default value
          priceType: {
            type: String,
            enum: ["manual", "calculated"],
            default: "calculated",
          },
          customPrice: { type: Number, default: 0 }, // Manual price override
          image: { type: String }, // Optional image for this selling unit option
          description: { type: String }, // Optional description
          isActive: { type: Boolean, default: true },
        },
      ],
    },
  },
  {
    timestamps: true,
  },
)

// Generate slug from title before saving
productSchema.pre("save", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true })
  }
  next()
})

productSchema.methods.getSellingUnitPrice = function (optionIndex) {
  if (!this.sellingUnits.enabled || !this.sellingUnits.options[optionIndex]) {
    return this.price
  }

  const option = this.sellingUnits.options[optionIndex]

  if (option.priceType === "manual" && option.customPrice > 0) {
    return option.customPrice
  }

  // Calculate price based on base unit price and quantity
  return this.sellingUnits.baseUnitPrice * option.baseUnitQuantity
}

productSchema.methods.getActiveSellingUnits = function () {
  if (!this.sellingUnits.enabled) {
    return []
  }

  return this.sellingUnits.options.filter((option) => option.isActive)
}

const Product = mongoose.model("Product", productSchema)
export default Product
