import fs from "fs"
import path from "path"

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads")

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log("✅ Uploads directory created successfully!")

  // Create a test image placeholder
  const testImageContent = `
<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f0f0"/>
  <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#666" text-anchor="middle" dy=".3em">
    Test Image Placeholder
  </text>
</svg>`

  fs.writeFileSync(path.join(uploadsDir, "test-image.svg"), testImageContent)
  console.log("✅ Test image created at /uploads/test-image.svg")
} else {
  console.log("✅ Uploads directory already exists")
}

console.log("📁 Uploads folder ready at:", uploadsDir)
