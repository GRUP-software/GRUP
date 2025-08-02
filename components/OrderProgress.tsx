"use client"

import { useState, useEffect } from "react"

interface OrderProgressProps {
  orderId: string
}

const statusEmojis = {
  groups_forming: "👥",
  all_secured: "✅",
  processing: "📦",
  packaged: "📦",
  dispatched: "🚚",
  out_for_delivery: "🚚",
  delivered: "✅",
}

const statusColors = {
  groups_forming: "bg-yellow-500",
  all_secured: "bg-blue-500",
  processing: "bg-purple-500",
  packaged: "bg-indigo-500",
  dispatched: "bg-green-500",
  out_for_delivery: "bg-green-600",
  delivered: "bg-green-700",
}

export default function OrderProgressTracker({ orderId }: OrderProgressProps) {
  const [orderData, setOrderData] = useState(null as any)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrderProgress()

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchOrderProgress, 30000)
    return () => clearInterval(interval)
  }, [orderId])

  const fetchOrderProgress = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/orders/progress/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setOrderData(data)
      }
    } catch (err) {
      console.error("Error fetching order progress:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="border rounded-lg p-6 text-center">
        ⚠️
        <p className="text-gray-500 mt-2">Order not found</p>
      </div>
    )
  }

  const { order, estimatedDelivery, groupsProgress } = orderData
  const currentStatusIndex = getStatusIndex(order.currentStatus)

  return (
    <div className="space-y-6">
      {}
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Order #{order.trackingNumber}</h2>
            <span className="px-3 py-1 text-sm border rounded-full capitalize">
              {order.currentStatus.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="font-semibold">₦{order.totalAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Items</p>
              <p className="font-semibold">{order.items.length} products</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estimated Delivery</p>
              <p className="font-semibold">
                {estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString() : "Pending group completion"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupsProgress.map((group: any, index: number) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">{group.productTitle}</h4>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  group.groupStatus === "secured" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {group.groupStatus === "secured" ? "✅ Secured" : "⏳ Forming"}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Group Progress</span>
                <span>{Math.round(group.groupProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${group.groupProgress}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>👥 {group.participantCount} participants</span>
                {group.groupStatus === "secured" && <span className="text-green-600 font-medium">✓ Secured</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {}
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Order Timeline</h3>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {order.progress.map((step: any, index: number) => {
              const emoji = statusEmojis[step.status as keyof typeof statusEmojis] || "⏰"
              const isCompleted = index <= currentStatusIndex

              return (
                <div key={index} className="flex items-start gap-4">
                  <div
                    className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm
                    ${isCompleted ? statusColors[step.status as keyof typeof statusColors] || "bg-gray-400" : "bg-gray-200"}
                  `}
                  >
                    <span className={isCompleted ? "text-white" : "text-gray-400"}>{emoji}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${isCompleted ? "text-gray-900" : "text-gray-500"}`}>
                        {step.status.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(step.timestamp).toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{step.message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Delivery Map Placeholder */}
      {order.currentStatus === "out_for_delivery" && (
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold flex items-center gap-2">📍 Live Delivery Tracking</h3>
          </div>
          <div className="p-4">
            <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
              <div className="text-center">
                🚚<p className="text-gray-600 mt-2">Interactive delivery map will appear here</p>
                <p className="text-sm text-gray-500 mt-1">Track your delivery in real-time</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getStatusIndex(status: string): number {
  const statuses = [
    "groups_forming",
    "all_secured",
    "processing",
    "packaged",
    "dispatched",
    "out_for_delivery",
    "delivered",
  ]
  return statuses.indexOf(status)
}
