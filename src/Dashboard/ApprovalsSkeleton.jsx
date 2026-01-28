import React from "react";
import { Skeleton } from "antd";
import "../css/Dashboard.css";

export default function ApprovalsSkeleton() {
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

            <div className="approvals-container">
                {/* 2. Header */}
                <div className="approvals-header-top" style={{ marginBottom: 20 }}>
                    <Skeleton.Input active size="large" style={{ width: 200, height: 32 }} />
                </div>

                {/* 3. Filter Card */}
                <div className="filter-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 15 }}>
                    <div className="filter-left" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <Skeleton.Input active size="default" style={{ width: 220 }} />
                        <Skeleton.Input active size="default" style={{ width: 160 }} />
                        <Skeleton.Input active size="default" style={{ width: 150 }} />
                    </div>
                    <div className="total-stat-box" style={{ width: 200 }}>
                        <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 5 }} />
                        <Skeleton.Input active size="large" style={{ width: 150 }} />
                    </div>
                </div>

                {/* 4. Table Skeleton */}
                <div className="approvals-table-wrapper" style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(212, 175, 55, 0.15)", overflow: "hidden" }}>
                    {/* Header Row */}
                    <div style={{ display: "flex", padding: "16px", background: "#f8f7f3", borderBottom: "1px solid #eee", gap: 10 }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <Skeleton.Input key={i} active size="small" style={{ width: '12%' }} />
                        ))}
                    </div>

                    {/* Data Rows */}
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} style={{ display: "flex", padding: "16px", borderBottom: "1px solid #eee", alignItems: "center", gap: 10 }}>
                            {/* Spender Name (Avatar + Text) */}
                            <div style={{ width: '12%', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Skeleton.Avatar active size="large" shape="circle" />
                                <div style={{ flex: 1 }}>
                                    <Skeleton.Input active size="small" style={{ width: '80%', marginBottom: 4 }} />
                                    <Skeleton.Input active size="small" style={{ width: '50%' }} />
                                </div>
                            </div>

                            {/* Other Columns */}
                            <Skeleton.Input active size="small" style={{ width: '12%' }} />
                            <Skeleton.Input active size="small" style={{ width: '12%' }} />
                            <Skeleton.Input active size="small" style={{ width: '12%' }} />
                            <Skeleton.Button active size="small" style={{ width: 80 }} />
                            <Skeleton.Input active size="small" style={{ width: '12%' }} />
                            <Skeleton.Input active size="small" style={{ width: '12%' }} />
                            <div style={{ width: '12%', display: 'flex', gap: 8 }}>
                                <Skeleton.Button active size="small" shape="circle" style={{ width: 30, height: 30 }} />
                                <Skeleton.Button active size="small" shape="circle" style={{ width: 30, height: 30 }} />
                                <Skeleton.Button active size="small" shape="circle" style={{ width: 30, height: 30 }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
