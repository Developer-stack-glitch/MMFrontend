import React from "react";
import { Skeleton } from "antd";
import "../css/Dashboard.css";

export default function ApprovalsSkeleton() {
    const unifiedGridStyle = {
        gridTemplateColumns: "40px 100px 120px 140px 160px 110px 120px 150px 120px 60px minmax(200px, 0.9fr) 90px 100px"
    };

    return (
        <div className="expense-container">
            {/* 1. Header */}
            <div className="expense-header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <Skeleton.Input active size="large" style={{ width: 200, height: 32 }} />
                    <Skeleton.Input active size="small" style={{ width: 300, marginTop: 4 }} />
                </div>
            </div>

            {/* 2. Filter Card */}
            <div className="filter-card">
                <div className="filter-left" style={{ flexWrap: "wrap", gap: "10px" }}>
                    <Skeleton.Input active size="default" style={{ width: 190 }} />
                    <Skeleton.Button active size="default" style={{ width: 120, borderRadius: 8 }} />
                    <Skeleton.Button active size="default" style={{ width: 150, borderRadius: 8 }} />
                </div>
                <div className="total-stat-box" style={{ minWidth: 150 }}>
                    <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 5 }} />
                    <Skeleton.Input active size="large" style={{ width: 120 }} />
                </div>
            </div>

            {/* 3. Table Skeleton */}
            <div className="table-scroll-wrapper" style={{ overflowX: "auto", width: "100%", borderRadius: "8px" }}>
                <div className="expense-table-wrapper" style={{ minWidth: "1600px" }}>
                    <div className="expense-table">
                        {/* Header Row */}
                        <div
                            className="expense-row expense-header-row"
                            style={unifiedGridStyle}
                        >
                            {[...Array(13)].map((_, i) => (
                                <div key={i}>
                                    <Skeleton.Input active size="small" style={{ width: '60%' }} />
                                </div>
                            ))}
                        </div>

                        {/* Data Rows */}
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="expense-row"
                                style={unifiedGridStyle}
                            >
                                <div className="sno-cell">
                                    <Skeleton.Input active size="small" style={{ width: 20 }} />
                                </div>
                                <div><Skeleton.Input active size="small" style={{ width: 80 }} /></div>
                                <div><Skeleton.Input active size="small" style={{ width: 90 }} /></div>
                                <div><Skeleton.Input active size="small" style={{ width: 110 }} /></div>
                                <div><Skeleton.Input active size="small" style={{ width: 130 }} /></div>
                                <div><Skeleton.Input active size="small" style={{ width: 80 }} /></div>
                                <div><Skeleton.Input active size="small" style={{ width: 100 }} /></div>
                                <div><Skeleton.Input active size="small" style={{ width: 120 }} /></div>
                                <div><Skeleton.Input active size="small" style={{ width: 90 }} /></div>
                                <div><Skeleton.Input active size="small" style={{ width: 40 }} /></div>
                                <div><Skeleton.Input active size="small" style={{ width: '90%' }} /></div>
                                <div><Skeleton.Button active size="small" style={{ width: 60 }} /></div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <Skeleton.Button active size="small" shape="circle" style={{ width: 24, height: 24 }} />
                                    <Skeleton.Button active size="small" shape="circle" style={{ width: 24, height: 24 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
