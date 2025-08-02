import Product from '../models/Product.js';

// GET all products with shareable message links
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();

    const host = `${req.protocol}://${req.get('host')}`;
    const enrichedProducts = products.map((product) => {
      const message = `I just made a purchase of ${product.title}, join me to seal the deal!`;
      const encodedMessage = encodeURIComponent(message);

      return {
        ...product.toObject(),
        shareLink: `${host}/product/${product.slug}?msg=${encodedMessage}`,
      };
    });

    res.json(enrichedProducts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products' });
  }
};

// GET a single product by slug
export const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const host = `${req.protocol}://${req.get('host')}`;
    const message = `I just made a purchase of ${product.title}, join me to seal the deal!`;
    const encodedMessage = encodeURIComponent(message);

    res.json({
      ...product.toObject(),
      shareLink: `${host}/product/${product.slug}?msg=${encodedMessage}`,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching product', error: err.message });
  }
};

// CREATE a new product
export const createProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      basePrice,
      price,
      stock,
      category,
      unitTag,
      groupEligible,
      variants,
      lowStockThreshold,
    } = req.body;

    // Generate image URLs if files exist
    const imageUrls = req.files?.map(
      (file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
    ) || [];

    const product = new Product({
      title,
      description,
      basePrice,
      price,
      stock,
      category,
      unitTag,
      groupEligible: groupEligible === 'true',
      variants: variants ? JSON.parse(variants) : [],
      lowStockThreshold: Number(lowStockThreshold) || 5,
      images: imageUrls,
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error('Create Product Error:', err.message);
    res.status(400).json({ message: 'Error creating product', error: err.message });
  }
};

// UPDATE a product
export const updateProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      basePrice,
      price,
      stock,
      category,
      unitTag,
      groupEligible,
      variants,
      lowStockThreshold,
    } = req.body;

    const updateData = {
      title,
      description,
      basePrice,
      price,
      stock,
      category,
      unitTag,
      groupEligible: groupEligible === 'true',
      variants: variants ? JSON.parse(variants) : [],
      lowStockThreshold: Number(lowStockThreshold) || 5,
    };

    if (req.files?.length > 0) {
      updateData.images = req.files.map(
        (file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
      );
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    res.json(updated);
  } catch (err) {
    console.error('Update Product Error:', err.message);
    res.status(400).json({ message: 'Error updating product', error: err.message });
  }
};

// DELETE a product
export const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Error deleting product' });
  }
};
