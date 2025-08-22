import Product from "../models/Product.js"
import GroupBuy from "../models/GroupBuy.js"

// GET all products with shareable message links and enhanced data
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()

    // Use frontend URL instead of backend URL for share links
    const frontendHost = process.env.NODE_ENV === "development" 
      ? "http://localhost:5173" 
      : process.env.FRONTEND_URL || "https://grupclient.netlify.app"

    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        // Updated share message as requested by user
        const message = `Wow I just bought ${product.title}! Click on the link so we can complete the order.`
        const encodedMessage = encodeURIComponent(message)

        // Fetch the most recent GroupBuy for this product (active or inactive)
        const groupBuy = await GroupBuy.findOne({ productId: product._id })
          .sort({ createdAt: -1 })
          .populate("productId", "title price")

        let groupBuyData = {
          hasActiveGroupBuy: false,
          minimumViableUnits: product.minimumViableUnits || 20, // Use product's MVU
          currentParticipants: 0,
          progressPercentage: 0,
          timeRemaining: 0,
          status: "none",
          expiresAt: null,
        }

        if (groupBuy) {
          const now = new Date()
          const isActive = groupBuy.status === "active" && groupBuy.expiresAt > now
          const timeLeft = Math.max(0, groupBuy.expiresAt - now)

          groupBuyData = {
            hasActiveGroupBuy: isActive,
            minimumViableUnits: groupBuy.minimumViableUnits,
            currentParticipants: groupBuy.participants.length,
            progressPercentage: Math.round((groupBuy.participants.length / groupBuy.minimumViableUnits) * 100),
            timeRemaining: timeLeft,
            status: groupBuy.status,
            expiresAt: groupBuy.expiresAt,
          }
        }

        return {
          ...product.toObject(),
          shareLink: `${frontendHost}/product/${product.slug}?msg=${encodedMessage}`,
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
          sellingUnitsData: product.sellingUnits?.enabled
            ? {
                ...product.sellingUnits,
                options: product.getActiveSellingUnits().map((option) => ({
                  ...option.toObject(),
                  calculatedPrice: product.calculateSellingUnitPrice(option.name),
                })),
              }
            : null,
          ...groupBuyData,
        }
      }),
    )

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

    // Use frontend URL instead of backend URL for share links
    const frontendHost = process.env.NODE_ENV === "development" 
      ? "http://localhost:5173" 
      : process.env.FRONTEND_URL || "https://grupclient.netlify.app"

    // Updated share message as requested by user
    const message = `Wow I just bought ${product.title}! Click on the link so we can complete the order.`
    const encodedMessage = encodeURIComponent(message)

    const groupBuy = await GroupBuy.findOne({ productId: product._id })
      .sort({ createdAt: -1 })
      .populate("productId", "title price")

    let groupBuyData = {
      hasActiveGroupBuy: false,
      minimumViableUnits: product.minimumViableUnits || 20, // Use product's MVU
      currentParticipants: 0,
      progressPercentage: 0,
      timeRemaining: 0,
      status: "none",
      expiresAt: null,
    }

    if (groupBuy) {
      const now = new Date()
      const isActive = groupBuy.status === "active" && groupBuy.expiresAt > now
      const timeLeft = Math.max(0, groupBuy.expiresAt - now)

      groupBuyData = {
        hasActiveGroupBuy: isActive,
        minimumViableUnits: groupBuy.minimumViableUnits,
        currentParticipants: groupBuy.participants.length,
        progressPercentage: Math.round((groupBuy.participants.length / groupBuy.minimumViableUnits) * 100),
        timeRemaining: timeLeft,
        status: groupBuy.status,
        expiresAt: groupBuy.expiresAt,
      }
    }

    const enrichedProduct = {
      ...product.toObject(),
      shareLink: `${frontendHost}/product/${product.slug}?msg=${encodedMessage}`,
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
      sellingUnitsData: product.sellingUnits?.enabled
        ? {
            ...product.sellingUnits,
            options: product.getActiveSellingUnits().map((option) => ({
              ...option.toObject(),
              calculatedPrice: product.calculateSellingUnitPrice(option.name),
            })),
          }
        : null,
      ...groupBuyData,
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

    // Use frontend URL instead of backend URL for share links
    const frontendHost = process.env.NODE_ENV === "development" 
      ? "http://localhost:5173" 
      : process.env.FRONTEND_URL || "https://grupclient.netlify.app"

    // Updated share message as requested by user
    const message = `Wow I just bought ${product.title}! Click on the link so we can complete the order.`
    const encodedMessage = encodeURIComponent(message)

    const groupBuy = await GroupBuy.findOne({ productId: product._id })
      .sort({ createdAt: -1 })
      .populate("productId", "title price")

    let groupBuyData = {
      hasActiveGroupBuy: false,
      minimumViableUnits: product.minimumViableUnits || 20, // Use product's MVU
      currentParticipants: 0,
      progressPercentage: 0,
      timeRemaining: 0,
      status: "none",
      expiresAt: null,
    }

    if (groupBuy) {
      const now = new Date()
      const isActive = groupBuy.status === "active" && groupBuy.expiresAt > now
      const timeLeft = Math.max(0, groupBuy.expiresAt - now)

      groupBuyData = {
        hasActiveGroupBuy: isActive,
        minimumViableUnits: groupBuy.minimumViableUnits,
        currentParticipants: groupBuy.participants.length,
        progressPercentage: Math.round((groupBuy.participants.length / groupBuy.minimumViableUnits) * 100),
        timeRemaining: timeLeft,
        status: groupBuy.status,
        expiresAt: groupBuy.expiresAt,
      }
    }

    const enrichedProduct = {
      ...product.toObject(),
      shareLink: `${frontendHost}/product/${product.slug}?msg=${encodedMessage}`,
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
      sellingUnitsData: product.sellingUnits?.enabled
        ? {
            ...product.sellingUnits,
            options: product.getActiveSellingUnits().map((option) => ({
              ...option.toObject(),
              calculatedPrice: product.calculateSellingUnitPrice(option.name),
            })),
          }
        : null,
      ...groupBuyData,
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
      // New price range fields
      minPrice,
      maxPrice,
      minBasePrice,
      maxBasePrice,
      stock,
      category,
      unitTag,
      groupEligible,
      variants,
      lowStockThreshold,
      minimumViableUnits,
      sellingUnits,
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

    const productData = {
      title,
      description: description.trim(), // Ensure description is properly stored
      basePrice,
      price,
      // Add price range fields
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minBasePrice: minBasePrice ? Number(minBasePrice) : undefined,
      maxBasePrice: maxBasePrice ? Number(maxBasePrice) : undefined,
      stock,
      category,
      unitTag,
      groupEligible: groupEligible === "true",
      variants: variants ? JSON.parse(variants) : [],
      lowStockThreshold: Number(lowStockThreshold) || 5,
      images: imageUrls,
      minimumViableUnits: Number(minimumViableUnits) || 20,
    }

    if (sellingUnits) {
      try {
        productData.sellingUnits = typeof sellingUnits === "string" ? JSON.parse(sellingUnits) : sellingUnits
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid selling units format",
          error: error.message,
        })
      }
    }

    const product = new Product(productData)
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
      // New price range fields
      minPrice,
      maxPrice,
      minBasePrice,
      maxBasePrice,
      stock,
      category,
      unitTag,
      groupEligible,
      variants,
      lowStockThreshold,
      minimumViableUnits,
      sellingUnits,
    } = req.body

    const updateData = {
      title,
      description: description ? description.trim() : "", // Ensure description is properly updated
      basePrice,
      price,
      // Add price range fields
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minBasePrice: minBasePrice ? Number(minBasePrice) : undefined,
      maxBasePrice: maxBasePrice ? Number(maxBasePrice) : undefined,
      stock,
      category,
      unitTag,
      groupEligible: groupEligible === "true",
      variants: variants ? JSON.parse(variants) : [],
      lowStockThreshold: Number(lowStockThreshold) || 5,
      minimumViableUnits: Number(minimumViableUnits) || 20,
    }

    if (sellingUnits) {
      try {
        updateData.sellingUnits = typeof sellingUnits === "string" ? JSON.parse(sellingUnits) : sellingUnits
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid selling units format",
          error: error.message,
        })
      }
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

// UPDATE selling units for a product
export const updateSellingUnits = async (req, res) => {
  try {
    const { sellingUnits } = req.body

    if (!sellingUnits) {
      return res.status(400).json({
        success: false,
        message: "Selling units data is required",
      })
    }

    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    product.sellingUnits = sellingUnits
    await product.save()

    res.json({
      success: true,
      message: "Selling units updated successfully",
      data: {
        sellingUnits: product.sellingUnits,
        sellingUnitsData: product.sellingUnits?.enabled
          ? {
              ...product.sellingUnits,
              options: product.getActiveSellingUnits().map((option) => ({
                ...option.toObject(),
                calculatedPrice: product.calculateSellingUnitPrice(option.name),
              })),
            }
          : null,
      },
    })
  } catch (err) {
    console.error("Update Selling Units Error:", err.message)
    res.status(400).json({
      success: false,
      message: "Error updating selling units",
      error: err.message,
    })
  }
}

// GET calculated price for a selling unit option
export const getSellingUnitPrice = async (req, res) => {
  try {
    const { productId, optionName } = req.params

    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    if (!product.sellingUnits?.enabled) {
      return res.status(400).json({
        success: false,
        message: "Selling units not enabled for this product",
      })
    }

    const calculatedPrice = product.calculateSellingUnitPrice(optionName)
    const option = product.sellingUnits.options.find((opt) => opt.name === optionName)

    if (!option) {
      return res.status(404).json({
        success: false,
        message: "Selling unit option not found",
      })
    }

    res.json({
      success: true,
      data: {
        optionName,
        displayName: option.displayName,
        baseUnitQuantity: option.baseUnitQuantity,
        priceType: option.priceType,
        customPrice: option.customPrice,
        calculatedPrice,
        baseUnitName: product.sellingUnits.baseUnitName,
      },
    })
  } catch (err) {
    console.error("Get Selling Unit Price Error:", err.message)
    res.status(500).json({
      success: false,
      message: "Error calculating selling unit price",
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
