import React from "react";
import { Skeleton, Card, Row, Col } from "antd";

export default function ReportsSkeleton() {
    return (
        <div className="reports-page-container">
            <Card variant="borderless" className="reports-premium-card" style={{ padding: "10px" }}>
                {/* Header Skeleton */}
                <div className="reports-header-container" style={{ marginBottom: "40px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <Skeleton.Avatar active shape="square" size={32} style={{ borderRadius: "8px" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <Skeleton.Input active size="default" style={{ width: 300, height: 28 }} />
                        <Skeleton.Input active size="small" style={{ width: 450 }} />
                        <div style={{ height: "1px", background: "#f0f0f0", marginTop: "10px", width: "100%" }}></div>
                    </div>
                </div>

                {/* Form Skeleton */}
                <Row gutter={[32, 32]} style={{ marginBottom: "32px" }}>
                    {/* First Row: 3 fields */}
                    <Col xs={24} md={8}>
                        <div style={{ marginBottom: "12px" }}>
                            <Skeleton.Input active size="small" style={{ width: 120, height: 16 }} />
                        </div>
                        <Skeleton.Input active size="large" style={{ width: "100%", borderRadius: "8px" }} block />
                    </Col>
                    <Col xs={24} md={8}>
                        <div style={{ marginBottom: "12px" }}>
                            <Skeleton.Input active size="small" style={{ width: 100, height: 16 }} />
                        </div>
                        <Skeleton.Input active size="large" style={{ width: "100%", borderRadius: "8px" }} block />
                    </Col>
                    <Col xs={24} md={8}>
                        <div style={{ marginBottom: "12px" }}>
                            <Skeleton.Input active size="small" style={{ width: 90, height: 16 }} />
                        </div>
                        <Skeleton.Input active size="large" style={{ width: "100%", borderRadius: "8px" }} block />
                    </Col>

                    {/* Second Row: 2 fields */}
                    <Col xs={24} md={8}>
                        <div style={{ marginBottom: "12px" }}>
                            <Skeleton.Input active size="small" style={{ width: 80, height: 16 }} />
                        </div>
                        <Skeleton.Input active size="large" style={{ width: "100%", borderRadius: "8px" }} block />
                    </Col>
                    <Col xs={24} md={8}>
                        <div style={{ marginBottom: "12px" }}>
                            <Skeleton.Input active size="small" style={{ width: 110, height: 16 }} />
                        </div>
                        <Skeleton.Input active size="large" style={{ width: "100%", borderRadius: "8px" }} block />
                    </Col>
                </Row>

                {/* Button Skeleton */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "40px", paddingTop: "20px" }}>
                    <Skeleton.Button active size="large" style={{ width: 180, borderRadius: "8px", height: 46 }} />
                </div>
            </Card>
        </div>
    );
}
