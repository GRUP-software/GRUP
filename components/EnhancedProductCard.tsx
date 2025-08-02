"use client"

import { useState, useEffect } from "react"
import { Users, Package, Clock, ShoppingCart, Share2, Zap } from "lucide-react"
import GroupProgressCard from "./GroupProgressCard"

interface ProductCardProps {
  product: any
  onAddToCart?: (productId: string, quantity: number) => void
}

export default function EnhancedProductCard({ product, onAddToCart }: ProductCardProps) {
  const [groupProgress, setGroupProgress] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [showGroupDetails, setShowGroupDetails] = useState(false)

  useEffect(() => {
    fetchGroupProgress()

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
      onAddToCart(product._id, quantity)
    }
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

  return (
    <div className="group border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
      {}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.images?.[0] || `/placeholder.svg?height=300&width=300&query=${product.title}`}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {}
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

        {}
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
              <p className="text-2xl font-bold text-green-600">
                ₦{product.basePrice?.toLocaleString() || product.price?.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">per {product.unitTag}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Stock</p>
              <p className="font-semibold">
                {product.stock} {product.unitTag}
              </p>
            </div>
          </div>
        </div>

        {}
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

        {}
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium">Quantity ({product.unitTag})</label>
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
          <p className="text-xs text-gray-500">
            Total: ₦{((product.basePrice || product.price) * quantity).toLocaleString()}
          </p>
        </div>

        {}
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

        {}
        {showGroupDetails && hasActiveGroup && (
          <div className="mt-4 pt-4 border-t">
            <GroupProgressCard productId={product._id} productTitle={product.title} onJoinGroup={handleJoinGroup} />
          </div>
        )}

        {}
        <div className="text-xs text-gray-500 space-y-1 mt-4">
          <p>Category: {product.category}</p>
          {product.description && <p className="line-clamp-2">{product.description}</p>}
        </div>
      </div>
    </div>
  )
}
