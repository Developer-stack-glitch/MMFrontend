import React from "react";
import { Skeleton, Card, Row, Col } from "antd";

export default function StatementsSkeleton() {
    return (
        <div style={{ paddingTop: 30 }}>
            {/* Top Cards Section */}
            <Card variant="borderless" className="premium-card" style={{ marginBottom: "24px" }}>
                <div style={{ marginBottom: "20px" }}>
                    <Skeleton.Input active size="default" style={{ width: 150 }} />
                </div>
                <Row gutter={[16, 16]}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                        <Col xs={24} sm={12} md={8} lg={6} xl={4} key={i}>
                            <Card variant="borderless" style={{ border: '1px solid #f0f0f0', textAlign: 'center', height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                <Skeleton.Avatar active shape="circle" size="large" style={{ marginBottom: '10px' }} />
                                <Skeleton.Input active size="small" style={{ width: '80%', marginBottom: '15px' }} />
                                <Skeleton.Button active size="small" style={{ width: '60%' }} />
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Card>

            {/* Middle Section (Opening Balance, Income, Expenses) */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                {[1, 2, 3].map(i => (
                    <Col xs={24} lg={8} key={i}>
                        <Card variant="borderless" className="premium-card">
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <Skeleton.Input active size="default" style={{ width: 120 }} />
                            </div>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(j => (
                                <div key={j} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0' }}>
                                    <Skeleton.Input active size="small" style={{ width: '40%' }} />
                                    <Skeleton.Input active size="small" style={{ width: '20%' }} />
                                </div>
                            ))}
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Middle Section 2 (Balance, Not Reconciliation) */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px', justifyContent: 'center' }}>
                {[1, 2].map(i => (
                    <Col xs={24} lg={10} key={i}>
                        <Card variant="borderless" className="premium-card">
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <Skeleton.Input active size="default" style={{ width: 150 }} />
                            </div>
                            {[1, 2, 3, 4].map(j => (
                                <div key={j} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0' }}>
                                    <Skeleton.Input active size="small" style={{ width: '30%' }} />
                                    <Skeleton.Input active size="small" style={{ width: '20%' }} />
                                </div>
                            ))}
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Bottom Tabs Section */}
            <Card variant="borderless" className="premium-card">
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <Skeleton.Button key={i} active size="small" style={{ width: 80 }} />
                    ))}
                </div>
                
                {/* Table Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#1c2431', borderRadius: '8px', marginBottom: '20px' }}>
                    <Skeleton.Input active size="small" style={{ width: '15%' }} />
                    <Skeleton.Input active size="small" style={{ width: '15%' }} />
                    <Skeleton.Input active size="small" style={{ width: '25%' }} />
                    <Skeleton.Input active size="small" style={{ width: '15%' }} />
                    <Skeleton.Input active size="small" style={{ width: '10%' }} />
                    <Skeleton.Input active size="small" style={{ width: '10%' }} />
                </div>
                
                {/* Table Rows */}
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 10px', borderBottom: '1px solid #f0f0f0' }}>
                        <Skeleton.Input active size="small" style={{ width: '15%' }} />
                        <Skeleton.Input active size="small" style={{ width: '15%' }} />
                        <Skeleton.Input active size="small" style={{ width: '25%' }} />
                        <Skeleton.Input active size="small" style={{ width: '15%' }} />
                        <Skeleton.Input active size="small" style={{ width: '10%' }} />
                        <Skeleton.Input active size="small" style={{ width: '10%' }} />
                    </div>
                ))}
            </Card>
        </div>
    );
}
