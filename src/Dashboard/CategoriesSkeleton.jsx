import React from "react";
import { Skeleton } from "antd";
import "../css/Dashboard.css";

export default function CategoriesSkeleton() {
    return (
        <div className="categories-container" style={{ paddingTop: 30 }}>
            {/* 1. Header Skeleton */}
            <div className="categories-header" style={{ marginBottom: 30 }}>
                <Skeleton active title={{ width: 250 }} paragraph={{ rows: 1, width: "350px" }} />
            </div>

            {/* 2. Tabs Skeleton */}
            <div className="categories-tabs">
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                    <Skeleton.Button active size="default" style={{ width: 100, marginRight: 20 }} />
                    <Skeleton.Button active size="default" style={{ width: 100 }} />
                </div>

                {/* Categories List Skeleton */}
                <div className="category-list-grouped" style={{ paddingBottom: 20 }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="category-group-card" style={{
                            marginBottom: 15,
                            background: "#fff",
                            borderRadius: 12,
                            padding: "15px 15px",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                            border: "1px solid #f0f0f0"
                        }}>
                            {/* Group Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                                    <Skeleton.Button active shape="circle" size="small" style={{ width: 18, height: 18, minWidth: 18 }} />
                                    <Skeleton.Input active size="default" style={{ width: 150, height: 20 }} />
                                    <Skeleton.Input active size="small" style={{ width: 40, height: 16 }} />
                                </div>
                                <Skeleton.Button active size="small" shape="circle" style={{ width: 20, height: 20 }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Footer Button Skeleton */}
            <div className="categories-footer" style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
                <Skeleton.Button active size="large" style={{ width: 250, height: 50, borderRadius: 30 }} />
            </div>
        </div>
    );
}
