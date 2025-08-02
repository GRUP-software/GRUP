"use client"

import { useState, useEffect } from "react"

interface LocationPickerProps {
  onLocationChange: (location: any) => void
  onDeliveryFeeChange: (fee: number) => void
}

export default function LocationPicker({ onLocationChange, onDeliveryFeeChange }: LocationPickerProps) {
  const [location, setLocation] = useState(null as any)
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [manualAddress, setManualAddress] = useState({
    street: "",
    city: "",
    state: "",
  })
  const [deliveryFee, setDeliveryFee] = useState(0)

  useEffect(() => {
    detectCurrentLocation()
  }, [])

  const detectCurrentLocation = () => {
    setLoading(true)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords

          try {
            
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
              {
                headers: {
                  "User-Agent": "GrupApp/1.0",
                },
              },
            )
            const data = await response.json()

            const locationData = {
              coordinates: { lat: latitude, lng: longitude },
              address: data.display_name,
              street: data.address?.road || "",
              city: data.address?.city || data.address?.town || "",
              state: data.address?.state || "",
            }

            setLocation(locationData)
            setAddress(data.display_name)
            onLocationChange(locationData)

            
            calculateDeliveryFee(locationData.coordinates)
          } catch (error) {
            console.error("Error getting address:", error)
            
            const locationData = {
              coordinates: { lat: latitude, lng: longitude },
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              street: "",
              city: "Lagos", 
              state: "Lagos State",
            }
            setLocation(locationData)
            setAddress(locationData.address)
            onLocationChange(locationData)
            calculateDeliveryFee(locationData.coordinates)
          } finally {
            setLoading(false)
          }
        },
        (error) => {
          console.error("Error getting location:", error)
          setLoading(false)
        },
      )
    } else {
      console.error("Geolocation is not supported")
      setLoading(false)
    }
  }

  const calculateDeliveryFee = async (coordinates: { lat: number; lng: number }) => {
    try {
      const response = await fetch("/api/delivery/calculate-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates }),
      })

      if (response.ok) {
        const data = await response.json()
        setDeliveryFee(data.deliveryFee)
        onDeliveryFeeChange(data.deliveryFee)
      }
    } catch (error) {
      console.error("Error calculating delivery fee:", error)
      setDeliveryFee(1500)
      onDeliveryFeeChange(1500)
    }
  }

  const handleManualAddressSubmit = async () => {
    if (!manualAddress.street || !manualAddress.city || !manualAddress.state) {
      return
    }

    setLoading(true)

    try {
      const fullAddress = `${manualAddress.street}, ${manualAddress.city}, ${manualAddress.state}, Nigeria`

      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
        {
          headers: {
            "User-Agent": "GrupApp/1.0",
          },
        },
      )
      const data = await response.json()

      if (data.length > 0) {
        const locationData = {
          coordinates: {
            lat: Number.parseFloat(data[0].lat),
            lng: Number.parseFloat(data[0].lon),
          },
          address: data[0].display_name,
          street: manualAddress.street,
          city: manualAddress.city,
          state: manualAddress.state,
        }

        setLocation(locationData)
        setAddress(data[0].display_name)
        onLocationChange(locationData)
        calculateDeliveryFee(locationData.coordinates)
      } else {
        
        const locationData = {
          coordinates: { lat: 6.5244, lng: 3.3792 },
          address: fullAddress,
          street: manualAddress.street,
          city: manualAddress.city,
          state: manualAddress.state,
        }
        setLocation(locationData)
        setAddress(fullAddress)
        onLocationChange(locationData)
        calculateDeliveryFee(locationData.coordinates)
      }
    } catch (error) {
      console.error("Error processing address:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">📍 Delivery Location</h3>
        <p className="text-xs text-gray-500 mt-1">Powered by OpenStreetMap (Free)</p>
      </div>
      <div className="p-4 space-y-4">
        {}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Current Location</label>
            <button
              onClick={detectCurrentLocation}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "🔄" : "🧭"}
              {loading ? "Detecting..." : "Auto-detect"}
            </button>
          </div>

          {location && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">📍</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">Location Detected</p>
                  <p className="text-xs text-green-600 mt-1">{address}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-green-600">Delivery Fee:</span>
                    <span className="text-sm font-semibold text-green-800">₦{deliveryFee.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {}
        <div className="space-y-3">
          <label className="text-sm font-medium">Or Enter Address Manually</label>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Street Address</label>
              <input
                type="text"
                placeholder="Enter street address"
                value={manualAddress.street}
                onChange={(e) => setManualAddress((prev) => ({ ...prev, street: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">City</label>
                <input
                  type="text"
                  placeholder="Lagos"
                  value={manualAddress.city}
                  onChange={(e) => setManualAddress((prev) => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">State</label>
                <input
                  type="text"
                  placeholder="Lagos State"
                  value={manualAddress.state}
                  onChange={(e) => setManualAddress((prev) => ({ ...prev, state: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleManualAddressSubmit}
              disabled={loading || !manualAddress.street || !manualAddress.city || !manualAddress.state}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">🔄 Processing...</span>
              ) : (
                "Use This Address"
              )}
            </button>
          </div>
        </div>

        {}
        {deliveryFee > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-700">
              <p className="font-medium mb-1">📦 Delivery Information</p>
              <p>• Estimated delivery: 24-48 hours after dispatch</p>
              <p>• Delivery fee: ₦{deliveryFee.toLocaleString()}</p>
              <p>• Free delivery on orders above ₦50,000</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
