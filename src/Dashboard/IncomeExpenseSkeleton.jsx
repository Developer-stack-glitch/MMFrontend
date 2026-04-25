import React from "react";
import { Skeleton } from "antd";
import "../css/Dashboard.css";

export default function IncomeExpenseSkeleton() {
    const unifiedGridStyle = {
        gridTemplateColumns: "40px 100px 90px 140px 160px 110px 120px 150px 120px 60px minmax(200px, 0.9fr) 90px 80px"
    };

    return (
        <div className="expense-container">
            {/* 1. Tabs Skeleton */}
            <div className="tabs-wrapper" style={{ marginBottom: "20px" }}>
                <div className="skeleton-premium" style={{ width: 120, height: 42, borderRadius: "10px", marginRight: 8 }} />
                <div className="skeleton-premium" style={{ width: 120, height: 42, borderRadius: "10px" }} />
            </div>

            {/* 2. Header Skeleton */}
            <div className="expense-header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div className="skeleton-premium" style={{ width: 180, height: 32, borderRadius: 6 }} />
                    <div className="skeleton-premium" style={{ width: 280, height: 16, borderRadius: 4 }} />
                </div>
                <div className="skeleton-premium" style={{ width: 130, height: 42, borderRadius: "10px" }} />
            </div>

            {/* 3. Filter Card Skeleton */}
            <div className="filter-card">
                <div className="filter-left" style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1, alignItems: "center" }}>
                    <div className="skeleton-premium" style={{ width: 250, height: 38, borderRadius: 8 }} /> {/* Search */}
                    <div className="skeleton-premium" style={{ width: 100, height: 38, borderRadius: 8 }} /> {/* Person */}
                    <div className="skeleton-premium" style={{ width: 100, height: 38, borderRadius: 8 }} /> {/* Category */}
                    <div className="skeleton-premium" style={{ width: 120, height: 38, borderRadius: 8 }} /> {/* Subcategory */}
                    <div className="skeleton-premium" style={{ width: 100, height: 38, borderRadius: 8 }} /> {/* Branch */}
                    <div className="skeleton-premium" style={{ width: 120, height: 38, borderRadius: 8 }} /> {/* Transaction */}
                    <div className="skeleton-premium" style={{ width: 100, height: 38, borderRadius: 8 }} /> {/* Vendor */}
                    <div className="skeleton-premium" style={{ width: 80, height: 38, borderRadius: 8 }} /> {/* GST */}
                    <div className="skeleton-premium" style={{ width: 120, height: 38, borderRadius: 8 }} /> {/* Amount */}
                </div>

                {/* Total Card Skeleton */}
                <div className="total-stat-box" style={{ background: "#252f3f", borderTop: "3px solid #444", minWidth: 200, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end" }}>
                    <div className="skeleton-premium" style={{ width: 120, height: 12, marginBottom: 8, opacity: 0.2 }} />
                    <div className="skeleton-premium" style={{ width: 160, height: 28, opacity: 0.3 }} />
                </div>
            </div>

            {/* 4. Table Header Skeleton */}
            <div className="table-scroll-wrapper" style={{ overflowX: "auto", width: "100%", borderRadius: "8px", marginTop: "20px" }}>
                <div className="expense-table-wrapper" style={{ minWidth: "1600px" }}>
                    <div className="expense-table">
                        <div className="expense-row expense-header-row" style={unifiedGridStyle}>
                            <div className="skeleton-premium" style={{ width: '25px', height: 14, opacity: 0.6 }} /> {/* S.NO */}
                            <div className="skeleton-premium" style={{ width: '80px', height: 14, opacity: 0.6 }} /> {/* DATE */}
                            <div className="skeleton-premium" style={{ width: '70px', height: 14, opacity: 0.6 }} /> {/* PERSON */}
                            <div className="skeleton-premium" style={{ width: '100px', height: 14, opacity: 0.6 }} /> {/* CATEGORY */}
                            <div className="skeleton-premium" style={{ width: '120px', height: 14, opacity: 0.6 }} /> {/* SUBCATEGORY */}
                            <div className="skeleton-premium" style={{ width: '80px', height: 14, opacity: 0.6 }} /> {/* BRANCH */}
                            <div className="skeleton-premium" style={{ width: '100px', height: 14, opacity: 0.6 }} /> {/* TRANSACTION */}
                            <div className="skeleton-premium" style={{ width: '100px', height: 14, opacity: 0.6 }} /> {/* VENDOR */}
                            <div className="skeleton-premium" style={{ width: '80px', height: 14, opacity: 0.6 }} /> {/* AMOUNT */}
                            <div className="skeleton-premium" style={{ width: '40px', height: 14, opacity: 0.6 }} /> {/* GST */}
                            <div className="skeleton-premium" style={{ width: '120px', height: 14, opacity: 0.6 }} /> {/* DESCRIPTION */}
                            <div className="skeleton-premium" style={{ width: '70px', height: 14, opacity: 0.6 }} /> {/* INVOICE */}
                            <div className="skeleton-premium" style={{ width: '60px', height: 14, opacity: 0.6 }} /> {/* ACTION */}
                        </div>

                        {/* 5. Table Rows Skeleton */}
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="expense-row" style={unifiedGridStyle}>
                                <div className="skeleton-premium" style={{ width: 25, height: 20 }} /> {/* S.NO */}
                                <div className="skeleton-premium" style={{ width: 80, height: 20 }} /> {/* Date */}
                                <div className="skeleton-premium" style={{ width: 70, height: 20 }} /> {/* Person */}
                                <div className="skeleton-premium" style={{ width: 100, height: 16, borderRadius: 4 }} /> {/* Cat */}
                                <div className="skeleton-premium" style={{ width: 120, height: 20 }} /> {/* Sub */}
                                <div className="skeleton-premium" style={{ width: 80, height: 20 }} /> {/* Branch */}
                                <div className="skeleton-premium" style={{ width: 100, height: 20 }} /> {/* Trans */}
                                <div className="skeleton-premium" style={{ width: 100, height: 20 }} /> {/* Vendor */}
                                <div className="skeleton-premium" style={{ width: 80, height: 20, borderRadius: 12 }} /> {/* Amount */}
                                <div className="skeleton-premium" style={{ width: 40, height: 20 }} /> {/* GST */}
                                <div className="skeleton-premium" style={{ width: 120, height: 20 }} /> {/* Desc */}
                                <div className="skeleton-premium" style={{ width: 50, height: 20 }} /> {/* Invoice */}
                                <div className="skeleton-premium" style={{ width: 30, height: 30, borderRadius: 6, margin: "0 auto" }} /> {/* Action */}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 6. Pagination Skeleton */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 25 }}>
                <div className="skeleton-premium" style={{ width: 300, height: 32 }} />
            </div>
        </div>
    );
}
