"use client";

import { useState, useEffect } from "react";

interface GroupProgressProps {
  productId: string;
  productTitle: string;
  onJoinGroup?: () => void;
}

export default function GroupProgressCard({
  productId,
  productTitle,
  onJoinGroup,
}: GroupProgressProps) {
  const [groupData, setGroupData] = useState(null as any);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroupStatus();

    const interval = setInterval(fetchGroupStatus, 30000);
    return () => clearInterval(interval);
  }, [productId]);

  const fetchGroupStatus = async () => {
    try {
      const response = await fetch(`/api/group/group-status/${productId}`);
      if (response.ok) {
        const data = await response.json();
        setGroupData(data);
      }
    } catch (err) {
      console.error("Error fetching group status:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full border rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-2 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="w-full border-2 border-dashed rounded-lg p-4 text-center">
        📦<p className="text-sm text-gray-500 mb-3 mt-2">No active group buy</p>
        <button
          onClick={onJoinGroup}
          className="text-sm bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Start Group Buy
        </button>
      </div>
    );
  }

  const { progressPercentage, participantCount, unitsRemaining, status } =
    groupData;

  return (
    <div className="w-full border rounded-lg">
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">{productTitle}</h4>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              status === "secured"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {status === "secured" ? "✅ Secured" : "⏳ Forming"}
          </span>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            👥<span>{participantCount} joined</span>
          </div>
          <div className="flex items-center gap-1">
            📦<span>{unitsRemaining} left</span>
          </div>
        </div>

        {status === "forming" && (
          <button
            onClick={onJoinGroup}
            className="w-full text-xs bg-green-500 text-white py-2 rounded hover:bg-green-600 transition-colors"
          >
            Join Group Buy
          </button>
        )}

        {status === "secured" && (
          <div className="flex items-center justify-center gap-1 text-xs text-green-600">
            ⏰<span>Ready for dispatch</span>
          </div>
        )}
      </div>
    </div>
  );
}
