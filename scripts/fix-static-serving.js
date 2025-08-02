// Check if static file serving is working
import express from "express"
import path from "path"
import fs from "fs"

const app = express()
const uploadsPath = path.join(process.cwd(), "uploads")

// Ensure uploads directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true })
  console.log("Created uploads directory")
}

// Test static file serving
app.use("/uploads", express.static(uploadsPath))

// Test endpoint
app.get("/test-uploads", (req, res) => {
  const files = fs.readdirSync(uploadsPath)
  res.json({
    uploadsPath,
    files,
    message: "Static file serving test",
  })
})

console.log("Static file serving configured for:", uploadsPath)
