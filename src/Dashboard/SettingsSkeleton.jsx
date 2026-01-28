import React from "react";
import { Skeleton } from "antd";
import "../css/Dashboard.css";

export default function SettingsSkeleton() {
    return (
        <div className="settings-page" style={{ paddingTop: 30 }}>
            {/* 1. Create User Card Skeleton */}
            <div className="card" style={{ background: "#fff", padding: 24, borderRadius: 12, marginBottom: 30, border: "1px solid rgba(212, 175, 55, 0.15)" }}>
                <Skeleton active title={{ width: 150 }} paragraph={false} style={{ marginBottom: 20 }} />

                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div style={{ marginBottom: 15 }}>
                        <Skeleton.Input active size="small" style={{ width: 60, marginBottom: 8, display: "block" }} />
                        <Skeleton.Input active size="large" style={{ width: "100%", borderRadius: 6 }} />
                    </div>
                    <div style={{ marginBottom: 15 }}>
                        <Skeleton.Input active size="small" style={{ width: 60, marginBottom: 8, display: "block" }} />
                        <Skeleton.Input active size="large" style={{ width: "100%", borderRadius: 6 }} />
                    </div>
                    <div style={{ marginBottom: 15 }}>
                        <Skeleton.Input active size="small" style={{ width: 80, marginBottom: 8, display: "block" }} />
                        <Skeleton.Input active size="large" style={{ width: "100%", borderRadius: 6 }} />
                    </div>
                    <div style={{ marginBottom: 15 }}>
                        <Skeleton.Input active size="small" style={{ width: 50, marginBottom: 8, display: "block" }} />
                        <Skeleton.Input active size="large" style={{ width: "100%", borderRadius: 6 }} />
                    </div>
                </div>
                <Skeleton.Button active size="large" style={{ width: 150, marginTop: 10, borderRadius: 6 }} />
            </div>

            {/* 2. Users List Skeleton */}
            <div className="card" style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid rgba(212, 175, 55, 0.15)" }}>
                <Skeleton active title={{ width: 150 }} paragraph={false} style={{ marginBottom: 20 }} />

                <div className="table-wrapper">
                    {/* Header */}
                    <div style={{ display: "flex", padding: "12px 0", borderBottom: "1px solid #eee", marginBottom: 10 }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton.Input key={i} active size="small" style={{ width: "16%", marginRight: 10 }} />
                        ))}
                    </div>

                    {/* Rows */}
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ display: "flex", padding: "12px 0", borderBottom: "1px solid #eee", alignItems: "center" }}>
                            <Skeleton.Input active size="small" style={{ width: "5%", marginRight: "11%" }} />
                            <Skeleton.Input active size="small" style={{ width: "15%", marginRight: "1%" }} />
                            <Skeleton.Input active size="small" style={{ width: "20%", marginRight: "1%" }} />
                            <Skeleton.Button active size="small" style={{ width: 60, marginRight: "13%" }} />
                            <Skeleton.Input active size="small" style={{ width: "15%", marginRight: "1%" }} />
                            <Skeleton.Button active size="small" style={{ width: 80 }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
