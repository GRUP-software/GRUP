// Free geocoding using Nominatim (OpenStreetMap)
export const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          "User-Agent": "GrupApp/1.0", // Required by Nominatim
        },
      },
    )
    const data = await response.json()

    return {
      formatted_address: data.display_name,
      address_components: {
        street: data.address?.road || "",
        city: data.address?.city || data.address?.town || "",
        state: data.address?.state || "",
        country: data.address?.country || "",
      },
    }
  } catch (error) {
    console.error("Reverse geocoding error:", error)
    return null
  }
}

export const forwardGeocode = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          "User-Agent": "GrupApp/1.0",
        },
      },
    )
    const data = await response.json()

    if (data.length > 0) {
      return {
        lat: Number.parseFloat(data[0].lat),
        lng: Number.parseFloat(data[0].lon),
        formatted_address: data[0].display_name,
      }
    }
    return null
  } catch (error) {
    console.error("Forward geocoding error:", error)
    return null
  }
}

// Calculate distance using Haversine formula (no API needed)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in km
}

const deg2rad = (deg) => deg * (Math.PI / 180)
