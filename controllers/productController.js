import Product from "../models/Product.js"

// GET all products with shareable message links and enhanced data
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()

    const host = `${req.protocol}://${req.get("host")}`
    const enrichedProducts = products.map((product) => {
      const message = `I just made a purchase of ${product.title}, join me to seal the deal!`
      const encodedMessage = encodeURIComponent(message)

      return {
        ...product.toObject(),
        shareLink: `${host}/product/${product.slug}?msg=${encodedMessage}`,
        // Ensure description is included
        description: product.description || "",
        // Add computed fields for frontend
        hasDescription: Boolean(product.description && product.description.trim()),
        shortDescription: product.description
          ? product.description.length > 150
            ? product.description.substring(0, 150) + "..."
            : product.description
          : "",
        isLowStock: product.stock <= (product.lowStockThreshold || 5),
        stockStatus: product.stock > 0 ? "in-stock" : "out-of-stock",
      }
    })

    res.json({
      success: true,
      count: enrichedProducts.length,
      data: enrichedProducts,
    })
  } catch (err) {
    console.error("Get all products error:", err)
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: err.message,
    })
  }
}

// GET a single product by slug with full description
export const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    const host = `${req.protocol}://${req.get("host")}`
    const message = `I just made a purchase of ${product.title}, join me to seal the deal!`
    const encodedMessage = encodeURIComponent(message)

    const enrichedProduct = {
      ...product.toObject(),
      shareLink: `${host}/product/${product.slug}?msg=${encodedMessage}`,
      // Ensure full description is available
      description: product.description || "",
      hasDescription: Boolean(product.description && product.description.trim()),
      // Add computed fields
      isLowStock: product.stock <= (product.lowStockThreshold || 5),
      stockStatus: product.stock > 0 ? "in-stock" : "out-of-stock",
      // Format variants for frontend consumption
      formattedVariants: product.variants
        ? product.variants.map((variant) => ({
            ...variant,
            isAvailable: variant.stock > 0,
          }))
        : [],
    }

    res.json({
      success: true,
      data: enrichedProduct,
    })
  } catch (err) {
    console.error("Get product by slug error:", err)
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: err.message,
    })
  }
}

// GET a single product by ID with full description
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    const host = `${req.protocol}://${req.get("host")}`
    const message = `I just made a purchase of ${product.title}, join me to seal the deal!`
    const encodedMessage = encodeURIComponent(message)

    const enrichedProduct = {
      ...product.toObject(),
      shareLink: `${host}/product/${product.slug}?msg=${encodedMessage}`,
      description: product.description || "",
      hasDescription: Boolean(product.description && product.description.trim()),
      isLowStock: product.stock <= (product.lowStockThreshold || 5),
      stockStatus: product.stock > 0 ? "in-stock" : "out-of-stock",
      formattedVariants: product.variants
        ? product.variants.map((variant) => ({
            ...variant,
            isAvailable: variant.stock > 0,
          }))
        : [],
    }

    res.json({
      success: true,
      data: enrichedProduct,
    })
  } catch (err) {
    console.error("Get product by ID error:", err)
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: err.message,
    })
  }
}

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
    } = req.body

    // Validate required fields
    if (!title || !description || !basePrice || !stock) {
      return res.status(400).json({
        success: false,
        message: "Title, description, base price, and stock are required fields",
      })
    }

    // Generate image URLs if files exist
    const imageUrls = req.files?.map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`) || []

    const product = new Product({
      title,
      description: description.trim(), // Ensure description is properly stored
      basePrice,
      price,
      stock,
      category,
      unitTag,
      groupEligible: groupEligible === "true",
      variants: variants ? JSON.parse(variants) : [],
      lowStockThreshold: Number(lowStockThreshold) || 5,
      images: imageUrls,
    })

    await product.save()

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: {
        ...product.toObject(),
        hasDescription: Boolean(product.description && product.description.trim()),
      },
    })
  } catch (err) {
    console.error("Create Product Error:", err.message)
    res.status(400).json({
      success: false,
      message: "Error creating product",
      error: err.message,
    })
  }
}

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
    } = req.body

    const updateData = {
      title,
      description: description ? description.trim() : "", // Ensure description is properly updated
      basePrice,
      price,
      stock,
      category,
      unitTag,
      groupEligible: groupEligible === "true",
      variants: variants ? JSON.parse(variants) : [],
      lowStockThreshold: Number(lowStockThreshold) || 5,
    }

    if (req.files?.length > 0) {
      updateData.images = req.files.map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`)
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    })

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      data: {
        ...updated.toObject(),
        hasDescription: Boolean(updated.description && updated.description.trim()),
      },
    })
  } catch (err) {
    console.error("Update Product Error:", err.message)
    res.status(400).json({
      success: false,
      message: "Error updating product",
      error: err.message,
    })
  }
}

// DELETE a product
export const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id)

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (err) {
    console.error("Delete Product Error:", err.message)
    res.status(400).json({
      success: false,
      message: "Error deleting product",
      error: err.message,
    })
  }
}
