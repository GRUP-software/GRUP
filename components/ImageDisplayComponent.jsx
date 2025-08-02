const ImageDisplayComponent = (props) => {
  const { record, property } = props
  const images = record.params[property.path] || []

  if (!images || images.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", border: "2px dashed #ccc", borderRadius: "8px" }}>
        <div style={{ fontSize: "48px", marginBottom: "10px" }}>📷</div>
        <p style={{ color: "#666", margin: 0 }}>No images uploaded</p>
        <div
          style={{
            marginTop: "15px",
            padding: "10px",
            backgroundColor: "#e8f4fd",
            border: "1px solid #bee5eb",
            borderRadius: "4px",
            fontSize: "12px",
            color: "#0c5460",
          }}
        >
          <strong>📝 How to upload images:</strong>
          <ol style={{ margin: "5px 0", paddingLeft: "20px", textAlign: "left" }}>
            <li>
              Use API: <code>POST /api/products/{"{productId}"}/images</code>
            </li>
            <li>
              Or when creating: <code>POST /api/products</code> with images
            </li>
            <li>Use tools like Postman or your frontend app</li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "10px",
          marginBottom: "15px",
        }}
      >
        {images.map((imageUrl, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "#fff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <img
              src={imageUrl || "/placeholder.svg"}
              alt={`Product ${index + 1}`}
              style={{
                width: "100%",
                height: "150px",
                objectFit: "cover",
                display: "block",
              }}
              onError={(e) => {
                e.target.src = "/placeholder.svg?height=150&width=150&text=Error"
              }}
            />
            <div
              style={{
                padding: "8px",
                fontSize: "12px",
                color: "#666",
                textAlign: "center",
                backgroundColor: "#f8f9fa",
                borderTop: "1px solid #eee",
              }}
            >
              Image {index + 1}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "12px",
          backgroundColor: "#e8f5e8",
          border: "1px solid #c3e6c3",
          borderRadius: "6px",
          fontSize: "13px",
          color: "#2d5a2d",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
          <strong>
            ✅ {images.length} image{images.length !== 1 ? "s" : ""} uploaded successfully
          </strong>
        </div>
        <div style={{ fontSize: "12px", color: "#4a6741" }}>
          <strong>🔗 Image URLs:</strong>
          <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
            {images.slice(0, 3).map((url, index) => (
              <li key={index} style={{ marginBottom: "2px", wordBreak: "break-all" }}>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#2d5a2d" }}>
                  {url.length > 50 ? `${url.substring(0, 50)}...` : url}
                </a>
              </li>
            ))}
            {images.length > 3 && <li>... and {images.length - 3} more</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ImageDisplayComponent
