import express from "express"
import upload from "../middleware/upload.js"
import { verifyAdminToken } from "./adminAuthRoutes.js"
import UploadedImage from "../models/uploadedImage.js"

const router = express.Router()

// Enhanced image upload endpoint that saves to database
router.post("/upload-images", verifyAdminToken, upload.array("images", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" })
    }

    const host = `${req.protocol}://${req.get("host")}`
    const uploadedImages = []

    // Save each uploaded image to database
    for (const file of req.files) {
      const imageUrl = `${host}/uploads/${file.filename}`

      const uploadedImage = await UploadedImage.create({
        filename: file.filename,
        originalName: file.originalname,
        url: imageUrl,
        size: file.size,
        mimetype: file.mimetype,
        uploadedBy: "admin",
        description: req.body.description || `Uploaded image: ${file.originalname}`,
        tags: req.body.tags ? req.body.tags.split(",").map((tag) => tag.trim()) : [],
      })

      uploadedImages.push(uploadedImage)
    }

    const imageUrls = uploadedImages.map((img) => img.url)

    res.json({
      success: true,
      message: "Images uploaded and saved to gallery",
      imageUrls,
      images: uploadedImages,
      count: req.files.length,
    })
  } catch (error) {
    console.error("Image upload error:", error)
    res.status(500).json({
      success: false,
      message: "Error uploading images",
      error: error.message,
    })
  }
})

// Get all uploaded images for selection
router.get("/images", verifyAdminToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unused = false, tags } = req.query

    const filter = {}
    if (unused === "true") filter.isUsed = false
    if (tags) filter.tags = { $in: tags.split(",") }

    const images = await UploadedImage.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("usedInProducts", "title")

    const total = await UploadedImage.countDocuments(filter)

    res.json({
      success: true,
      images,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching images",
      error: error.message,
    })
  }
})

// Delete uploaded image
router.delete("/images/:id", verifyAdminToken, async (req, res) => {
  try {
    const image = await UploadedImage.findById(req.params.id)
    if (!image) {
      return res.status(404).json({ message: "Image not found" })
    }

    // Delete file from filesystem
    const fs = await import("fs")
    const path = await import("path")
    const filePath = path.join(process.cwd(), "uploads", image.filename)

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    await UploadedImage.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "Image deleted successfully",
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting image",
      error: error.message,
    })
  }
})

export default router
