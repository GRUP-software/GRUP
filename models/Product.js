import mongoose from 'mongoose';
import slugify from 'slugify';

const { Schema } = mongoose;

const productSchema = new Schema({
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
    enum: ['Litres', 'Paint', 'Bags', 'Kg', 'Bottles', 'Piece'],
  },
  groupEligible: { type: Boolean, default: false },
  lowStockThreshold: { type: Number, default: 5 },
  images: [String],
  variants: [
    {
      name: String,
      options: [String], // e.g., sizes: ["Small", "Medium", "Large"]
    },
  ],
}, {
  timestamps: true
});

// Generate slug from title before saving
productSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;
