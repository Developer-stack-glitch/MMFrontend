import React from "react";
import { Skeleton } from "antd";
import "../css/Dashboard.css";


export function WalletTableSkeleton() {
    return (
        <div className="wallet-table">
            {/* Header */}
            <div style={{ display: "flex", padding: "16px", background: "#f8f7f3", borderBottom: "1px solid #eee", gap: 15 }}>
                <Skeleton.Input active size="small" style={{ width: '25%' }} />
                <Skeleton.Input active size="small" style={{ width: '15%' }} />
                <Skeleton.Input active size="small" style={{ width: '15%' }} />
                <Skeleton.Input active size="small" style={{ width: '15%' }} />
                <Skeleton.Input active size="small" style={{ width: '15%' }} />
            </div>

            {/* Rows */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} style={{ display: "flex", padding: "16px", borderBottom: "1px solid #eee", alignItems: "center", gap: 15 }}>
                    {/* User Cell */}
                    <div style={{ width: '25%', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Skeleton.Avatar active size="large" shape="circle" />
                        <div style={{ flex: 1 }}>
                            <Skeleton.Input active size="small" style={{ width: '60%', marginBottom: 4 }} />
                            <Skeleton.Input active size="small" style={{ width: '90%' }} />
                        </div>
                    </div>
                    {/* Received */}
                    <Skeleton.Input active size="small" style={{ width: '15%' }} />
                    {/* Spend */}
                    <Skeleton.Input active size="small" style={{ width: '15%' }} />
                    {/* Balance */}
                    <Skeleton.Input active size="small" style={{ width: '15%' }} />
                    {/* Action */}
                    <Skeleton.Button active size="default" style={{ width: 110 }} />
                </div>
            ))}
        </div>
    );
}

export default function WalletSkeleton() {
    return (
        <div className="wallet-table-container">
            {/* 1. Title */}
            <div className="wallet-table-title" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Skeleton.Avatar active size="small" shape="circle" style={{ width: 24, height: 24 }} />
                <Skeleton.Input active size="default" style={{ width: 200, height: 28 }} />
            </div>

            {/* 2. Global Filters */}
            <div style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Skeleton.Button active size="large" style={{ width: 140, borderRadius: 8 }} />
                <Skeleton.Button active size="large" style={{ width: 120, borderRadius: 8 }} />
                <Skeleton.Input active size="large" style={{ width: 220, borderRadius: 8 }} />
            </div>

            {/* 3. Search Input */}
            <div className="wallet-filter-box" style={{ marginBottom: 20 }}>
                <Skeleton.Input active size="large" style={{ width: "100%", borderRadius: 8, height: 40 }} />
            </div>

            {/* 4. Table */}
            <WalletTableSkeleton />
        </div>
    );
}
