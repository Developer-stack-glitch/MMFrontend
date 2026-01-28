import React from "react";
import { Skeleton } from "antd";
import "../css/Dashboard.css";

export default function IncomeSkeleton() {
    return (
        <div className="dashboard-container" style={{ paddingTop: 30 }}>
            {/* 1. Global Filters Skeleton */}
            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                    alignItems: "center"
                }}
            >
                <Skeleton.Button active size="large" style={{ width: 150, borderRadius: 8 }} />
                <Skeleton.Button active size="large" style={{ width: 120, borderRadius: 8 }} />
                <Skeleton.Input active size="large" style={{ width: 250, borderRadius: 8 }} />
            </div>

            {/* 2. Amount Details (Stats Grid) */}
            <div className="stats-grid">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="stat-card">
                        <Skeleton active title={{ width: 100 }} paragraph={{ rows: 2, width: ["80%", "40%"] }} />
                    </div>
                ))}
            </div>

            {/* 3. Quick Access */}
            <div className="quick-access-card" style={{ marginTop: 20 }}>
                <Skeleton.Input active size="small" style={{ width: 150, marginBottom: 15 }} />
                <div className="quick-access-grid">
                    <div className="quick-access-item" style={{ height: 100, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                        <Skeleton.Avatar active size="large" shape="circle" />
                        <Skeleton.Input active size="small" style={{ width: 80, marginTop: 10 }} />
                    </div>
                </div>
            </div>

            {/* 4. Charts Content (Grid) */}
            <div className="graphs-grid">
                {/* Chart 1: Area Chart */}
                <div className="chart-card">
                    <div className="chart-header" style={{ marginBottom: 15 }}>
                        <Skeleton.Input active size="default" style={{ width: 150 }} />
                    </div>
                    <Skeleton.Node active style={{ width: "100%", height: 260 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#ccc" }}>
                            Chart Placeholder
                        </div>
                    </Skeleton.Node>
                </div>

                {/* Chart 2: Pie Chart */}
                <div className="chart-card">
                    <div className="chart-header" style={{ marginBottom: 15 }}>
                        <Skeleton.Input active size="default" style={{ width: 180 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 260 }}>
                        <Skeleton.Avatar active size="large" style={{ width: 200, height: 200 }} shape="circle" />
                    </div>
                </div>
            </div>

            {/* 5. Recent Transactions Table */}
            <div className="transactions-card">
                <div className="transactions-header" style={{ marginBottom: 15 }}>
                    <Skeleton.Input active size="default" style={{ width: 250 }} />
                </div>
                <div className="rt-content">
                    <div style={{ display: "flex", padding: "12px", borderBottom: "1px solid #eee", gap: 10 }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton.Input key={i} active size="small" style={{ width: '15%' }} />
                        ))}
                    </div>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} style={{ display: "flex", padding: "12px", borderBottom: "1px solid #eee", gap: 10 }}>
                            <Skeleton.Input active size="small" style={{ width: '15%' }} />
                            <Skeleton.Input active size="small" style={{ width: '15%' }} />
                            <Skeleton.Input active size="small" style={{ width: '15%' }} />
                            <Skeleton.Input active size="small" style={{ width: '15%' }} />
                            <Skeleton.Input active size="small" style={{ width: '15%' }} />
                            <Skeleton.Input active size="small" style={{ width: '15%' }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
