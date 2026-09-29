import React, { useEffect, useState } from "react";
import { Card, Typography, Select, Button, Row, Col, Divider, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { FileText } from "lucide-react";
import Filters from "../Filters/Filters";
import "../css/Statement.css";
import "../css/Report.css";
import { getTransactionActionCategoriesApi, downloadBranchReportApi, downloadMonthReportApi, downloadOverallReportApi, getBranchesApi } from "../../Api/action";
import { CheckCircleFilled, SearchOutlined } from "@ant-design/icons";
import { Input, Space } from "antd";

const { Title, Text } = Typography;
const { Option } = Select;

const Reports = () => {
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);

    const [groupedCategories, setGroupedCategories] = useState({});
    const [selectedCategory, setSelectedCategory] = useState([]);
    const [selectedSubCategory, setSelectedSubCategory] = useState([]);
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [branchesList, setBranchesList] = useState([]);
    const [branchSearch, setBranchSearch] = useState("");
    const [categorySearch, setCategorySearch] = useState("");
    const [transactionType, setTransactionType] = useState("Credit/Debit");
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const fetchCategories = async () => {
        try {
            setLoadingCategories(true);
            const response = await getTransactionActionCategoriesApi();
            if (Array.isArray(response)) {
                const grouped = response.reduce((acc, item) => {
                    if (!acc[item.main_category]) acc[item.main_category] = [];
                    acc[item.main_category].push(item.sub_category);
                    return acc;
                }, {});
                setGroupedCategories(grouped);
                setSelectedCategory(Object.keys(grouped));
            } else {
                setGroupedCategories({});
                message.error("Failed to fetch categories");
            }
        }
        catch (error) {
            setGroupedCategories({});
            message.error(
                "Failed to load categories"
            )
        } finally {
            setLoadingCategories(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await getBranchesApi();
            if (Array.isArray(res)) {
                setBranchesList(res);
                setSelectedBranches(res.map(b => b.name));
            }
        } catch (error) {
            console.error("Failed to load branches");
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchBranches();
    }, []);

    const handleDownload = async () => {
        if (!fromDate || !toDate) {
            message.error("Please select a date range first.");
            return;
        }

        try {
            setDownloading(true);
            const filters = {
                start_date: fromDate.format("YYYY-MM-DD"),
                end_date: toDate.format("YYYY-MM-DD"),
                category: selectedCategory.length > 0 ? selectedCategory.join(",") : "",
                sub_category: selectedSubCategory.length > 0 ? selectedSubCategory.join(",") : "",
                transaction_type: transactionType,
                branches: selectedBranches.join(",")
            };

            await downloadBranchReportApi(filters);

            message.success("Report downloaded successfully!");
        } catch (error) {
            message.error("Failed to download report.");
            console.error(error);
        } finally {
            setDownloading(false);
        }
    };

    // Calculate available sub-categories based on selected main categories
    const availableSubCategories = (selectedCategory.length === 0 || selectedCategory.includes("OVERALL"))
        ? [...new Set(Object.values(groupedCategories).flat())]
        : [...new Set(selectedCategory.flatMap(cat => groupedCategories[cat] || []))];

    return (
        <div className="reports-page-container">
            <Card
                bordered={false}
                className="reports-premium-card"
            >
                <div className="reports-header-container">
                    <div>
                        <Title level={3} className="reports-title">
                            <FileText size={28} color="#d4af37" /> Financial Reports Standard
                        </Title>
                        <Text type="secondary" className="reports-subtitle">
                            Standardized generation for all categories, branches, and monthly tracking.
                        </Text>
                    </div>
                </div>

                <Divider style={{ margin: "24px 0", borderColor: "#e2e8f0" }} />

                <Row gutter={[32, 32]}>
                    <Col xs={24} sm={12} md={8}>
                        <div className="reports-input-group">
                            <Text strong className="reports-input-label">Date Filter</Text>
                            <Filters onFilterChange={(data) => {
                                setFromDate(data?.value?.[0] || null);
                                setToDate(data?.value?.[1] || null);
                            }} />
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <div className="reports-input-group">
                            <Text strong className="reports-input-label">Branch & Dept</Text>
                            <Select
                                mode="multiple"
                                placeholder="Select Branches"
                                style={{ width: "100%" }}
                                value={selectedBranches}
                                onChange={setSelectedBranches}
                                size="large"
                                maxTagCount={0}
                                maxTagPlaceholder={() => `${selectedBranches.length} selected`}
                                className="reports-premium-select reports-branch-select"
                                dropdownRender={(menu) => {
                                    const filteredBranches = branchesList.filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase()));
                                    
                                    return (
                                        <div style={{ padding: '8px' }}>
                                            <Input
                                                placeholder="Search branches..."
                                                prefix={<SearchOutlined />}
                                                value={branchSearch}
                                                onChange={e => setBranchSearch(e.target.value)}
                                                style={{ marginBottom: 8, borderRadius: '20px' }}
                                                onKeyDown={e => e.stopPropagation()}
                                            />
                                            <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Button 
                                                    type="default" 
                                                    shape="round"
                                                    style={{ color: '#000080', borderColor: '#000080' }}
                                                    onClick={() => {
                                                        const newSelected = [...new Set([...selectedBranches, ...filteredBranches.map(b => b.name)])];
                                                        setSelectedBranches(newSelected);
                                                    }}
                                                >
                                                    Select All
                                                </Button>
                                                <Button 
                                                    type="default"
                                                    shape="round"
                                                    style={{ color: '#d4af37', borderColor: '#d4af37' }}
                                                    onClick={() => {
                                                        const remaining = selectedBranches.filter(name => !filteredBranches.find(b => b.name === name));
                                                        setSelectedBranches(remaining);
                                                    }}
                                                >
                                                    Deselect All
                                                </Button>
                                            </Space>
                                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {filteredBranches.map(branch => {
                                                    const isSelected = selectedBranches.includes(branch.name);
                                                    return (
                                                        <div 
                                                            key={branch.id}
                                                            style={{
                                                                padding: '8px 12px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                backgroundColor: isSelected ? '#f8fafc' : 'transparent',
                                                                borderRadius: '8px',
                                                                marginBottom: '4px',
                                                                color: '#000080',
                                                                fontWeight: 600
                                                            }}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedBranches(selectedBranches.filter(n => n !== branch.name));
                                                                } else {
                                                                    setSelectedBranches([...selectedBranches, branch.name]);
                                                                }
                                                            }}
                                                        >
                                                            {branch.name}
                                                            {isSelected && <CheckCircleFilled style={{ color: '#d4af37' }} />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <div className="reports-input-group">
                            <Text strong className="reports-input-label">Credit/Debit</Text>
                            <Select
                                placeholder="Select Credit/Debit"
                                style={{ width: "100%" }}
                                value={transactionType}
                                onChange={setTransactionType}
                                size="large"
                                className="reports-premium-select"
                            >
                                <Option value="Credit/Debit">Credit/Debit</Option>
                                <Option value="Credit">Credit</Option>
                                <Option value="Debit">Debit</Option>
                            </Select>
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <div className="reports-input-group">
                            <Text strong className="reports-input-label">Category</Text>
                            <Select
                                mode="multiple"
                                placeholder="Select Categories"
                                style={{ width: "100%" }}
                                value={selectedCategory}
                                onChange={(vals) => {
                                    setSelectedCategory(vals);
                                    setSelectedSubCategory([]); // Reset sub-categories when main changes
                                }}
                                maxTagCount={0}
                                maxTagPlaceholder={() => `${selectedCategory.length} selected`}
                                size="large"
                                className="reports-premium-select reports-branch-select"
                                loading={loadingCategories}
                                dropdownRender={(menu) => {
                                    const allCats = Object.keys(groupedCategories);
                                    const filteredCats = allCats.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase()));
                                    
                                    return (
                                        <div style={{ padding: '8px' }}>
                                            <Input
                                                placeholder="Search categories..."
                                                prefix={<SearchOutlined />}
                                                value={categorySearch}
                                                onChange={e => setCategorySearch(e.target.value)}
                                                style={{ marginBottom: 8, borderRadius: '20px' }}
                                                onKeyDown={e => e.stopPropagation()}
                                            />
                                            <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Button 
                                                    type="default" 
                                                    shape="round"
                                                    style={{ color: '#000080', borderColor: '#000080' }}
                                                    onClick={() => {
                                                        const newSelected = [...new Set([...selectedCategory, ...filteredCats])];
                                                        setSelectedCategory(newSelected);
                                                    }}
                                                >
                                                    Select All
                                                </Button>
                                                <Button 
                                                    type="default"
                                                    shape="round"
                                                    style={{ color: '#d4af37', borderColor: '#d4af37' }}
                                                    onClick={() => {
                                                        const remaining = selectedCategory.filter(name => !filteredCats.includes(name));
                                                        setSelectedCategory(remaining);
                                                    }}
                                                >
                                                    Deselect All
                                                </Button>
                                            </Space>
                                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {filteredCats.map((cat, index) => {
                                                    const isSelected = selectedCategory.includes(cat);
                                                    return (
                                                        <div 
                                                            key={index}
                                                            style={{
                                                                padding: '8px 12px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                backgroundColor: isSelected ? '#f8fafc' : 'transparent',
                                                                borderRadius: '8px',
                                                                marginBottom: '4px',
                                                                color: '#000080',
                                                                fontWeight: 600
                                                            }}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedCategory(selectedCategory.filter(n => n !== cat));
                                                                    setSelectedSubCategory([]);
                                                                } else {
                                                                    setSelectedCategory([...selectedCategory, cat]);
                                                                    setSelectedSubCategory([]);
                                                                }
                                                            }}
                                                        >
                                                            {cat}
                                                            {isSelected && <CheckCircleFilled style={{ color: '#d4af37' }} />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                        </div>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <div className="reports-input-group">
                            <Text strong className="reports-input-label">Sub Category</Text>
                            <Select
                                mode="multiple"
                                placeholder="Select Sub Categories"
                                style={{ width: "100%" }}
                                value={selectedSubCategory}
                                onChange={setSelectedSubCategory}
                                maxTagCount="responsive"
                                size="large"
                                className="reports-premium-select"
                                loading={loadingCategories}
                            >
                                {availableSubCategories.map((sub, index) => (
                                    <Option key={index} value={sub}>{sub}</Option>
                                ))}
                            </Select>
                        </div>
                    </Col>

                </Row>

                <div className="reports-btn-container">
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        size="large"
                        onClick={handleDownload}
                        loading={downloading}
                        className="reports-download-btn"
                    >
                        Download Report
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default Reports;