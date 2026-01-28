import React from "react";
import { Skeleton } from "antd";
import "../css/Dashboard.css";

export default function DashboardSkeleton() {
    return (
        <div className="dashboard-container" style={{ paddingTop: 30 }}>
            {/* 1. Filters Skeleton */}
            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                    alignItems: "center"
                }}
            >
                {/* Mimic Filter Tabs/Inputs */}
                <Skeleton.Button active size="large" style={{ width: 150, borderRadius: 8 }} />
                <Skeleton.Button active size="large" style={{ width: 120, borderRadius: 8 }} />
                <Skeleton.Input active size="large" style={{ width: 250, borderRadius: 8 }} />
            </div>

            {/* 2. AmountDetails Stats Grid */}
            <div className="stats-grid" style={{ marginBottom: "30px" }}>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="stat-card" style={{ height: 160, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                            <Skeleton.Input active size="small" style={{ width: 100 }} />
                            <Skeleton.Input active size="small" style={{ width: 60 }} />
                        </div>
                        <Skeleton.Input active size="large" style={{ width: 180, marginBottom: 15 }} />
                        <Skeleton.Input active size="small" style={{ width: 140 }} />
                    </div>
                ))}
            </div>

            {/* 3. Quick Access Skeleton */}
            <div className="quick-access-card" style={{ marginBottom: "20px" }}>
                <Skeleton.Input active size="default" style={{ width: 160, marginBottom: 20 }} />
                <div className="quick-access-grid">
                    {[1, 2].map((i) => (
                        <div key={i} className="quick-access-item" style={{ border: '1px dashed #e0e0e0', justifyContent: 'center' }}>
                            <Skeleton.Avatar active size="small" shape="circle" />
                            <Skeleton.Input active size="small" style={{ width: 100 }} />
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. Charts Grid */}
            <div className="graphs-grid">
                {/* Wallet Cash Flow Chart */}
                <div className="chart-card" style={{ height: 350 }}>
                    <div className="chart-header">
                        <Skeleton.Input active size="default" style={{ width: 180 }} />
                    </div>
                    <div style={{ padding: 20 }}>
                        <Skeleton active paragraph={{ rows: 6 }} />
                    </div>
                </div>

                {/* Expense Breakdown Pie Chart */}
                <div className="chart-card" style={{ height: 350 }}>
                    <div className="chart-header">
                        <Skeleton.Input active size="default" style={{ width: 150 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80%' }}>
                        <Skeleton.Avatar active size={180} shape="circle" />
                    </div>
                </div>
            </div>

            {/* 5. Recent Transactions Table */}
            <div className="transactions-card">
                <div className="transactions-header">
                    <Skeleton.Button active size="default" style={{ width: 200 }} />
                </div>
                {/* Mimic a table with rows */}
                <div style={{ marginTop: 20 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
                            <Skeleton.Input active size="small" style={{ width: '15%' }} />
                            <Skeleton.Input active size="small" style={{ width: '15%' }} />
                            <Skeleton.Input active size="small" style={{ width: '15%' }} />
                            <Skeleton.Input active size="small" style={{ width: '15%' }} />
                            <Skeleton.Input active size="small" style={{ width: '10%' }} />
                            <Skeleton.Button active size="small" style={{ width: 80 }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
