"use client"

import React, { useState, useEffect } from "react"
import { Users, Package, Clock, ShoppingCart, Share2, Zap, ChevronDown } from "lucide-react"
import GroupProgressCard from "./GroupProgressCard"

interface ProductCardProps {
  product: any
  onAddToCart?: (productId: string, quantity: number, variant?: string, sellingUnit?: any) => void
}

export default function EnhancedProductCard({ product, onAddToCart }: ProductCardProps) {
  const [groupProgress, setGroupProgress] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [showGroupDetails, setShowGroupDetails] = useState(false)
  const [selectedSellingUnit, setSelectedSellingUnit] = useState<any>(null)
  const [selectedVariant, setSelectedVariant] = useState<string>("")

  useEffect(() => {
    fetchGroupProgress()

    if (product.sellingUnitsData?.enabled && product.sellingUnitsData.options?.length > 0) {
      const activeOptions = product.sellingUnitsData.options.filter((opt: any) => opt.isActive)
      if (activeOptions.length > 0) {
        setSelectedSellingUnit(activeOptions[0])
      }
    }

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchGroupProgress, 30000)
    return () => clearInterval(interval)
  }, [product._id])

  const fetchGroupProgress = async () => {
    try {
      const response = await fetch(`/api/group/group-status/${product._id}`)
      if (response.ok) {
        const data = await response.json()
        setGroupProgress(data)
      }
    } catch (err) {
      console.error("Error fetching group progress:", err)
    }
  }

  const handleJoinGroup = () => {
    if (onAddToCart) {
      const sellingUnitData = selectedSellingUnit
        ? {
            optionName: selectedSellingUnit.name,
            displayName: selectedSellingUnit.displayName,
            baseUnitQuantity: selectedSellingUnit.baseUnitQuantity,
            baseUnitName: product.sellingUnitsData?.baseUnitName || "unit",
            pricePerUnit: selectedSellingUnit.calculatedPrice,
            totalBaseUnits: selectedSellingUnit.baseUnitQuantity * quantity,
          }
        : null

      onAddToCart(product._id, quantity, selectedVariant, sellingUnitData)
    }
  }

  const getCurrentPrice = () => {
    return product.price // Always show base product price
  }

  const getDisplayUnit = () => {
    if (selectedSellingUnit) {
      return selectedSellingUnit.displayName
    }
    return product.unitTag
  }

  const getBaseUnitDisplay = () => {
    if (selectedSellingUnit && product.sellingUnitsData?.enabled) {
      const totalBaseUnits = selectedSellingUnit.baseUnitQuantity * quantity
      const unitName = product.sellingUnitsData.baseUnitName || "unit"
      const pluralUnit = totalBaseUnits === 1 ? unitName : `${unitName}s`
      return `${totalBaseUnits} ${pluralUnit}`
    }
    return null
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Check out this group buy for ${product.title}!`,
          url: product.shareLink,
        })
      } catch (err) {
        console.log("Error sharing:", err)
      }
    } else {
      navigator.clipboard.writeText(product.shareLink)
    }
  }

  const hasActiveGroup = groupProgress && groupProgress.status === "forming"
  const isGroupSecured = groupProgress && groupProgress.status === "secured"
  const hasSellingUnits = product.sellingUnitsData?.enabled && product.sellingUnitsData.options?.length > 0
  const hasVariants = product.variants?.length > 0
  const activeSellingUnits = hasSellingUnits ? product.sellingUnitsData.options.filter((opt: any) => opt.isActive) : []

  return (
    <div className="group border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.images?.[0] || `/placeholder.svg?height=300&width=300&query=${product.title}`}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        <div className="absolute top-3 left-3">
          {isGroupSecured ? (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
              <Zap className="h-3 w-3" />
              Secured
            </span>
          ) : hasActiveGroup ? (
            <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500 text-white text-xs rounded-full">
              <Clock className="h-3 w-3" />
              Forming
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 border bg-white text-xs rounded-full">
              <Users className="h-3 w-3" />
              Start Group
            </span>
          )}
        </div>

        <button
          onClick={handleShare}
          className="absolute top-3 right-3 p-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4">
        <div className="space-y-2 mb-4">
          <h3 className="font-semibold text-lg line-clamp-2">{product.title}</h3>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600">₦{getCurrentPrice().toLocaleString()}</p>
              <p className="text-xs text-gray-500">per {getDisplayUnit()}</p>
              {getBaseUnitDisplay() && <p className="text-xs text-blue-600 font-medium">= {getBaseUnitDisplay()}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Stock</p>
              <p className="font-semibold">
                {product.stock} {product.unitTag}
              </p>
            </div>
          </div>
        </div>

        {hasSellingUnits && (
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium">Select Quantity Option</label>
            <div className="relative">
              <select
                value={selectedSellingUnit?.name || ""}
                onChange={(e) => {
                  const selected = activeSellingUnits.find((opt: any) => opt.name === e.target.value)
                  setSelectedSellingUnit(selected)
                }}
                className="w-full p-3 border rounded-md appearance-none bg-white pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {activeSellingUnits.map((option: any, index: number) => {
                  const optionPrice = option.calculatedPrice || 0

                  return (
                    <option key={index} value={option.name}>
                      {option.displayName} - ₦{optionPrice.toLocaleString()}
                      {option.baseUnitQuantity > 1 &&
                        ` (${option.baseUnitQuantity} ${product.sellingUnitsData.baseUnitName}s)`}
                    </option>
                  )
                })}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {selectedSellingUnit?.description && (
              <p className="text-xs text-gray-600">{selectedSellingUnit.description}</p>
            )}
          </div>
        )}

        {hasVariants && (
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium">Select Variant</label>
            <div className="relative">
              <select
                value={selectedVariant}
                onChange={(e) => setSelectedVariant(e.target.value)}
                className="w-full p-3 border rounded-md appearance-none bg-white pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose variant...</option>
                {product.variants.map((variant: any, index: number) => (
                  <optgroup key={index} label={variant.name}>
                    {variant.options.map((option: string, optIndex: number) => (
                      <option key={optIndex} value={`${variant.name}: ${option}`}>
                        {option}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {hasActiveGroup && (
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Group Progress</span>
              <span className="text-green-600">{Math.round(groupProgress.progressPercentage)}% complete</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${groupProgress.progressPercentage}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{groupProgress.participantCount} joined</span>
              </div>
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                <span>{groupProgress.unitsRemaining} left</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium">
            Quantity {hasSellingUnits ? `(${getDisplayUnit()})` : `(${product.unitTag})`}
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              -
            </button>
            <span className="font-semibold min-w-[3rem] text-center">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="px-3 py-1 border rounded hover:bg-gray-50">
              +
            </button>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Total: ₦{(getCurrentPrice() * quantity).toLocaleString()}</p>
            {getBaseUnitDisplay() && <p className="text-blue-600 font-medium">Total: {getBaseUnitDisplay()}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleJoinGroup}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
              hasActiveGroup ? "bg-blue-500 text-white hover:bg-blue-600" : "border border-gray-300 hover:bg-gray-50"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            {hasActiveGroup ? "Join Group Buy" : "Start Group Buy"}
          </button>

          {hasActiveGroup && (
            <button
              onClick={() => setShowGroupDetails(!showGroupDetails)}
              className="w-full text-xs text-gray-600 hover:text-gray-800 py-1"
            >
              {showGroupDetails ? "Hide" : "Show"} Group Details
            </button>
          )}
        </div>

        {showGroupDetails && hasActiveGroup && (
          <div className="mt-4 pt-4 border-t">
            <GroupProgressCard productId={product._id} productTitle={product.title} onJoinGroup={handleJoinGroup} />
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1 mt-4">
          <p>Category: {product.category}</p>
          {product.description && <p className="line-clamp-2">{product.description}</p>}
        </div>
      </div>
    </div>
  )
}
