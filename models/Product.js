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
      baseUnitName: { type: String }, // e.g., "paint", "250g portion"
      baseUnitPrice: { type: Number }, // Price per base unit
      options: [
        {
          name: { type: String }, // e.g., "1_paint", "half_bag"
          displayName: { type: String }, // e.g., "1 Paint", "Half Bag"
          baseUnitQuantity: { type: Number, default: 1 }, // How many base units
          priceType: {
            type: String,
            enum: ["calculated", "manual"],
            default: "calculated",
          },
          customPrice: { type: Number, default: 0 }, // For manual pricing
          image: { type: String }, // Image for this option
          isActive: { type: Boolean, default: true },
        },
      ],
    },
  },
  {
    timestamps: true,
  },
)

productSchema.methods.calculateSellingUnitPrice = function (optionName) {
  if (!this.sellingUnits.enabled) return this.price

  const option = this.sellingUnits.options.find((opt) => opt.name === optionName)
  if (!option) return this.price

  if (option.priceType === "manual" && option.customPrice > 0) {
    return option.customPrice
  }

  // Use current product price instead of baseUnitPrice to respect discounts
  // Find the total base units that make up the full product
  const fullProductBaseUnits = this.sellingUnits.options.reduce((total, opt) => {
    return Math.max(total, opt.baseUnitQuantity)
  }, 0)
  
  // Calculate price per base unit from current product price
  const basePrice = fullProductBaseUnits > 0 ? this.price / fullProductBaseUnits : this.price
  return Math.round(basePrice * option.baseUnitQuantity)
}

productSchema.methods.getActiveSellingUnits = function () {
  if (!this.sellingUnits.enabled) return []
  return this.sellingUnits.options.filter((option) => option.isActive)
}

// Generate slug from title before saving
productSchema.pre("save", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true })
  }
  next()
})

const Product = mongoose.model("Product", productSchema)
export default Product
