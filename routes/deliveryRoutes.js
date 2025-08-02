import express from "express"
import { calculateDeliveryFee } from "../utils/deliveryCalculator.js"
import { reverseGeocode, forwardGeocode } from "../utils/openStreetMapService.js"

const router = express.Router()

router.post("/calculate-fee", async (req, res) => {
  try {
    const { coordinates } = req.body

    if (!coordinates || !coordinates.lat || !coordinates.lng) {
      return res.status(400).json({ message: "Valid coordinates required" })
    }

    const deliveryFee = await calculateDeliveryFee(coordinates)

    // Get address using free OpenStreetMap
    const addressData = await reverseGeocode(coordinates.lat, coordinates.lng)

    res.json({
      deliveryFee,
      coordinates,
      address: addressData?.formatted_address || `${coordinates.lat}, ${coordinates.lng}`,
      addressComponents: addressData?.address_components || {},
      message: "Delivery fee calculated successfully (using OpenStreetMap)",
    })
  } catch (err) {
    console.error("Calculate delivery fee error:", err)
    res.status(500).json({ message: "Error calculating delivery fee", error: err.message })
  }
})

// New endpoint for address search
router.post("/search-address", async (req, res) => {
  try {
    const { address } = req.body

    if (!address) {
      return res.status(400).json({ message: "Address is required" })
    }

    const locationData = await forwardGeocode(address)

    if (!locationData) {
      return res.status(404).json({ message: "Address not found" })
    }

    const deliveryFee = await calculateDeliveryFee(locationData)

    res.json({
      coordinates: { lat: locationData.lat, lng: locationData.lng },
      address: locationData.formatted_address,
      deliveryFee,
      message: "Address found successfully",
    })
  } catch (err) {
    console.error("Address search error:", err)
    res.status(500).json({ message: "Error searching address", error: err.message })
  }
})

export default router
