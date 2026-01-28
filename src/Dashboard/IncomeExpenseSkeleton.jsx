import React from "react";
import { Skeleton } from "antd";
import "../css/Dashboard.css";

export default function IncomeExpenseSkeleton() {
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

            <div className="expense-container">
                {/* 2. Tabs Skeleton */}
                <div className="tabs-wrapper" style={{ marginBottom: 20 }}>
                    <Skeleton.Button active size="default" style={{ width: 100, borderRadius: "8px 8px 0 0", marginRight: 5 }} />
                    <Skeleton.Button active size="default" style={{ width: 100, borderRadius: "8px 8px 0 0" }} />
                </div>

                <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(212, 175, 55, 0.15)" }}>
                    {/* 3. Header & Actions */}
                    <div className="expense-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 }}>
                        <Skeleton.Input active size="large" style={{ width: 200 }} />
                        <div style={{ display: "flex", gap: 10 }}>
                            <Skeleton.Button active size="default" style={{ width: 120 }} />
                            <Skeleton.Button active size="default" style={{ width: 140 }} />
                        </div>
                    </div>

                    {/* 4. Internal Filter Card */}
                    <div className="filter-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 15 }}>
                        <div className="filter-left" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                            <Skeleton.Input active size="default" style={{ width: 220 }} />
                            <Skeleton.Input active size="default" style={{ width: 140 }} />
                            <Skeleton.Input active size="default" style={{ width: 150 }} />
                            <Skeleton.Input active size="default" style={{ width: 150 }} />
                        </div>
                        <div className="total-stat-box" style={{ width: 200 }}>
                            <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 5 }} />
                            <Skeleton.Input active size="large" style={{ width: 150 }} />
                        </div>
                    </div>

                    {/* 5. Table Skeleton */}
                    <div className="expense-table-wrapper">
                        {/* Header Row */}
                        <div style={{ display: "flex", padding: "15px 10px", background: "#f8f7f3", borderRadius: "8px", marginBottom: 15, gap: 10 }}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <Skeleton.Input key={i} active size="small" style={{ width: i === 1 ? '20%' : '15%' }} />
                            ))}
                        </div>

                        {/* Data Rows */}
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <div key={i} style={{ display: "flex", padding: "15px 10px", borderBottom: "1px solid #eee", alignItems: "center", gap: 10 }}>
                                <div style={{ width: '25%', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Skeleton.Avatar active size="large" shape="circle" />
                                    <div style={{ width: '70%' }}>
                                        <Skeleton.Input active size="small" style={{ width: '40%', marginBottom: 5 }} />
                                        <Skeleton.Input active size="small" style={{ width: '80%' }} />
                                    </div>
                                </div>
                                <Skeleton.Input active size="small" style={{ width: '15%' }} />
                                <Skeleton.Input active size="small" style={{ width: '12%' }} />
                                <Skeleton.Input active size="small" style={{ width: '12%' }} />
                                <Skeleton.Input active size="small" style={{ width: '10%' }} />
                                <Skeleton.Button active size="small" style={{ width: 80 }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
