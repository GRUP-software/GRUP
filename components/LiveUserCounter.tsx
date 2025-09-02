"use client";

import { useState, useEffect } from "react";
import { Users } from "lucide-react";

export default function LiveUserCounter() {
  const [liveUsers, setLiveUsers] = useState(0);

  useEffect(() => {
    fetch("/api/live-users/count")
      .then((res) => res.json())
      .then((data) => setLiveUsers(data.liveUsers))
      .catch((err) => console.error("Error fetching live users:", err));

    const interval = setInterval(() => {
      fetch("/api/live-users/count")
        .then((res) => res.json())
        .then((data) => setLiveUsers(data.liveUsers))
        .catch((err) => console.error("Error fetching live users:", err));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
      <Users className="h-4 w-4 text-green-500" />
      <span className="font-medium">
        {liveUsers} {liveUsers === 1 ? "user" : "users"} online
      </span>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
    </div>
  );
}
