import { ApiClient } from "adminjs";
import React, { useEffect, useState } from "react";

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const api = new ApiClient();

  useEffect(() => {
    api.getDashboard().then((res) => setStats(res.data));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Platform Overview</h2>
      <ul>
        <li>
          <strong>Total Users:</strong> {stats.totalUsers}
        </li>
        <li>
          <strong>Active Group Buys:</strong> {stats.activeGroupBuys}
        </li>
        <li>
          <strong>Total Sales:</strong> ${stats.totalSales}
        </li>
        <li>
          <strong>Top Product:</strong> {stats.topProduct}
        </li>
      </ul>
    </div>
  );
};

export default Dashboard;
