import React, { useState, useEffect, useMemo } from "react";
import { Table, Button, Upload, Card, Row, Col, Typography, Tabs, Checkbox, message, Progress, Popover, Input } from "antd";
import dayjs from "dayjs";
import { UploadOutlined, DollarOutlined, ArrowDownOutlined, ArrowUpOutlined, EditOutlined } from "@ant-design/icons";
import { FileText, Trash2 } from "lucide-react";
import Filters from "../Filters/Filters";
import {
    getBankTransactionsApi, getCashStatementsApi, uploadCashStatementApi, getCashStatementSummaryApi, API_BASE_URL, getBanksApi, getAllBanksSummaryApi,
    addTransactionActionApi, updateTransactionActionApi, deleteTransactionActionApi, getReconciliationSummaryApi, createCashTransactionActionApi
} from "../../Api/action";
import "../css/Statement.css";

const { Title, Text } = Typography;

const ActionCheckbox = ({ record, onActionUpdate }) => {
    const existingAction = record.action || null;
    const [purpose, setPurpose] = useState(existingAction ? existingAction.purpose : '');
    const [visible, setVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setPurpose(existingAction ? existingAction.purpose : '');
    }, [existingAction, visible]);

    const handleSave = async () => {
        const trimmed = purpose.trim();
        if (!trimmed) {
            message.error("Purpose cannot be empty");
            return;
        }

        setSaving(true);
        try {
            let res;
            if (existingAction) {
                res = await updateTransactionActionApi(record.id, { purpose: trimmed });
            } else {
                res = await addTransactionActionApi({ bank_transaction_id: record.id, purpose: trimmed });
            }
            if (res.success) {
                message.success("Transaction purpose saved successfully");
                setVisible(false);
                onActionUpdate(record.id, res.data || res.action);
            }
        } catch (error) {
            if (error.status === 409) {
                message.error("This transaction already has an action.");
            } else {
                message.error(error.message || "Failed to save action");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setSaving(true);
        try {
            const res = await deleteTransactionActionApi(record.id);
            if (res.success) {
                message.success("Action removed");
                setVisible(false);
                onActionUpdate(record.id, null);
            }
        } catch (error) {
            message.error(error.message || "Failed to remove action");
        } finally {
            setSaving(false);
        }
    };

    const content = (
        <div style={{ width: 260, padding: "4px" }}>
            <div style={{ marginBottom: 12, fontWeight: 600, color: "#333", fontSize: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Transaction Purpose</span>
                {existingAction && (
                    <Button type="text" danger icon={<Trash2 size={16} />} onClick={handleDelete} loading={saving} size="small" />
                )}
            </div>
            <Input
                placeholder="Enter purpose..."
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                style={{ marginBottom: 12 }}
                disabled={saving}
                onPressEnter={handleSave}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button size="small" onClick={() => setVisible(false)} disabled={saving}>Cancel</Button>
                <Button size="small" type="primary" onClick={handleSave} loading={saving}>
                    {existingAction ? 'Update' : 'Save'}
                </Button>
            </div>
        </div>
    );

    return (
        <Popover
            content={content}
            trigger="click"
            open={visible}
            onOpenChange={setVisible}
            placement="left"
            overlayInnerStyle={{ borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
        >
            <div style={{ display: 'inline-flex', padding: '4px', cursor: 'pointer', alignItems: 'center', gap: '8px' }}>
                <Checkbox checked={!!existingAction} />
                {existingAction && (
                    <EditOutlined style={{ color: '#1890ff', fontSize: '15px' }} />
                )}
            </div>
        </Popover>
    );
};

const Statements = () => {
    const [filterData, setFilterData] = useState(null);
    const [activeTab, setActiveTab] = useState("1");
    const [apiTransactions, setApiTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [bankData, setBankData] = useState([]);
    const [banksLoading, setBanksLoading] = useState(false);
    const [summaryDataList, setSummaryDataList] = useState([]);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [reconciliationData, setReconciliationData] = useState([]);

    const fetchTransactions = async (bankId) => {
        setLoading(true);
        try {
            const isCash = String(bankId) === "10";

            const res = isCash
                ? await getCashStatementsApi()
                : await getBankTransactionsApi(bankId);

            if (res.success && res.data) {
                const formatDateTime = (iso) => {
                    if (!iso) return "--";
                    const d = new Date(iso);
                    if (isNaN(d)) return iso;
                    const pad = (n) => n.toString().padStart(2, '0');
                    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                };

                const formattedData = res.data.map((item, index) => {

                    const formatDateTime = (iso) => {
                        if (!iso) return "--";

                        const d = new Date(iso);

                        if (isNaN(d)) return iso;

                        const pad = (n) => String(n).padStart(2, "0");

                        return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                    };

                    const formatDate = (iso) => {
                        if (!iso) return "--";

                        const d = new Date(iso);

                        if (isNaN(d)) return iso;

                        const pad = (n) => String(n).padStart(2, "0");

                        return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
                    };

                    // CASH
                    if (isCash) {
                        return {
                            key: item.id || index.toString(),

                            id: item.id,

                            txnDate: formatDate(item.transaction_date),

                            rawTxnDate: item.transaction_date,

                            sale_executive: item.sale_executive,
                            student_name: item.student_name,
                            student_number: item.student_number,
                            course: item.course,
                            purpose: item.purpose,

                            cr_amount: item.cr_amount,
                            dr_amount: item.dr_amount,

                            balance: item.balance,

                            handover_to: item.handover_to,

                            handover_date: formatDate(item.handover_date),

                            rawHandoverDate: item.handover_date,

                            action: item.action
                        };
                    }

                    // BANK
                    return {
                        key: item.id || index.toString(),

                        id: item.id,

                        txnDate: formatDateTime(item.transaction_date),

                        rawTxnDate: item.transaction_date,

                        valueDate: formatDate(item.value_date),

                        description: item.description,

                        refNo: item.reference_number,

                        amount: item.amount,

                        type: item.transaction_type,

                        balance: item.balance,

                        action: item.action
                    };
                });
                setApiTransactions(formattedData);
            } else {
                setApiTransactions([]);
            }
        } catch (error) {
            console.error("Failed to fetch transactions", error);
            setApiTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchBanks = async () => {
            try {
                setBanksLoading(true);

                const res = await getBanksApi();

                if (res?.success && Array.isArray(res.banks)) {
                    const formattedBanks = res.banks.map((bank) => ({
                        key: String(bank.id),
                        bankId: bank.id,
                        bankName: bank.bank_name,
                    }));

                    setBankData(formattedBanks);
                } else {
                    setBankData([]);
                }
            } catch (error) {
                console.error("Failed to fetch banks:", error);
                message.error("Failed to load banks");
                setBankData([]);
            } finally {
                setBanksLoading(false);
            }
        };

        fetchBanks();
    }, []);

    useEffect(() => {
        fetchTransactions(activeTab);
    }, [activeTab]);

    const filteredTransactions = useMemo(() => {
        if (!filterData || !filterData.value || !filterData.value[0] || !filterData.value[1]) {
            return apiTransactions;
        }

        const start = dayjs(filterData.value[0]).startOf('day').valueOf();
        const end = dayjs(filterData.value[1]).endOf('day').valueOf();

        return apiTransactions.filter(txn => {
            if (!txn.rawTxnDate) return true; // keep if no date
            const txnTime = new Date(txn.rawTxnDate).getTime();
            return txnTime >= start && txnTime <= end;
        });
    }, [apiTransactions, filterData]);

    const fetchReconciliationSummary = async () => {
        if (!filterData || !filterData.value || !filterData.value[0] || !filterData.value[1]) {
            return;
        }
        try {
            const start = dayjs(filterData.value[0]).startOf('day').format('YYYY-MM-DD');
            const end = dayjs(filterData.value[1]).endOf('day').format('YYYY-MM-DD');
            const res = await getReconciliationSummaryApi(start, end);
            if (res?.success && res?.data) {
                setReconciliationData(res.data);
            } else {
                setReconciliationData([]);
            }
        } catch (error) {
            console.error("Failed to fetch reconciliation summary data", error);
        }
    };

    useEffect(() => {
        const fetchSummary = async () => {
            if (!filterData || !filterData.value || !filterData.value[0] || !filterData.value[1]) {
                return;
            }
            try {
                setSummaryLoading(true);
                const start = dayjs(filterData.value[0]).startOf('day').format('YYYY-MM-DD');
                const end = dayjs(filterData.value[1]).endOf('day').format('YYYY-MM-DD');

                const res = await getAllBanksSummaryApi(start, end);
                if (res?.success && res?.data) {
                    setSummaryDataList(res.data);
                } else {
                    setSummaryDataList([]);
                }
            } catch (error) {
                console.error("Failed to fetch summary data", error);
                message.error("Failed to fetch summary data");
                setSummaryDataList([]);
            } finally {
                setSummaryLoading(false);
            }
        };

        fetchSummary();
        fetchReconciliationSummary();
    }, [filterData]);

    const handleActionUpdate = (transactionId, newAction) => {
        setApiTransactions(prev => prev.map(txn =>
            txn.id === transactionId ? { ...txn, action: newAction } : txn
        ));
        fetchReconciliationSummary();
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val || 0);
    };

    const allBanksData = bankData.some(b => b.bankName?.toUpperCase() === 'CASH')
        ? bankData
        : bankData.concat([{ key: "10", bankName: "CASH" }]);

    const formattedReconciliationData = allBanksData.map((bankItem) => {
        const recItem = reconciliationData.find(r => r.bank_name === bankItem.bankName);
        return {
            ...bankItem,
            dr: recItem ? recItem.dr : 0,
            cr: recItem ? recItem.cr : 0
        };
    });

    const columns = [
        {
            title: "Bank Name",
            dataIndex: "bankName",
            key: "bankName",
            render: (text) => <Text strong style={{ color: "#333", fontSize: "15px" }}>{text}</Text>,
        },
        {
            title: "Action",
            key: "action",
            align: "right",
            render: (_, record) => {

                const isCash =
                    record.bankName?.toUpperCase() === "CASH";

                if (isCash) {
                    return (
                        <Upload
                            showUploadList={false}
                            beforeUpload={async (file) => {
                                try {
                                    setIsUploading(true);
                                    setUploadProgress(30);

                                    const res =
                                        await uploadCashStatementApi(file);

                                    setUploadProgress(100);

                                    if (res?.success) {
                                        message.success(
                                            "Cash statement uploaded successfully"
                                        );

                                        if (String(activeTab) === String(record.key)) {
                                            await fetchTransactions(record.key);
                                        }
                                    }

                                } catch (error) {
                                    console.error(
                                        "Cash upload failed:",
                                        error
                                    );

                                    message.error(
                                        error?.message ||
                                        "Cash statement upload failed"
                                    );
                                } finally {
                                    setTimeout(() => {
                                        setIsUploading(false);
                                        setUploadProgress(0);
                                    }, 500);
                                }

                                return false;
                            }}
                        >
                            <Button
                                type="primary"
                                icon={<UploadOutlined />}
                                className="statement-upload-btn"
                            >
                                Upload
                            </Button>
                        </Upload>
                    );
                }

                // Existing bank upload
                return (
                    <Upload
                        showUploadList={false}
                        name="statement"
                        action={`${API_BASE_URL}/api/transactions/bank-statements/upload`}
                        data={{ bank_id: record.key }}
                        headers={{
                            Authorization:
                                `Bearer ${localStorage.getItem("AccessToken")}`
                        }}
                        onChange={(info) => {
                            // keep your existing bank upload logic
                        }}
                    >
                        <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            className="statement-upload-btn"
                        >
                            Upload
                        </Button>
                    </Upload>
                );
            }
        },
    ];

    const transactionColumns = [
        { title: 'Transaction Date', dataIndex: 'txnDate' },
        { title: 'Value Date', dataIndex: 'valueDate' },
        {
            title: 'Description',
            dataIndex: 'description',
            render: (text) => (
                <Text style={{ maxWidth: 200, display: 'inline-block' }} ellipsis={{ tooltip: text }}>
                    {text || "--"}
                </Text>
            )
        },
        { title: 'Chq / Ref No.', dataIndex: 'refNo' },
        {
            title: 'Dr',
            key: 'dr',
            align: 'right',
            render: (_, record) => record.type === 'DR' ? record.amount : '--'
        },
        {
            title: 'Cr',
            key: 'cr',
            align: 'right',
            render: (_, record) => record.type === 'CR' ? record.amount : '--'
        },
        { title: 'Balance', dataIndex: 'balance', align: 'right' },
        {
            title: 'Action',
            dataIndex: 'action',
            align: 'center',
            render: (_, record) => <ActionCheckbox record={record} onActionUpdate={handleActionUpdate} />
        },
    ];

    const cashTransactionColumns = [
        {
            title: "Date",
            dataIndex: "txnDate",
        },

        {
            title: "Sale Executive",
            dataIndex: "sale_executive",
            render: (value) => value || "--",
        },

        {
            title: "Stu Name",
            dataIndex: "student_name",
            render: (value) => value || "--",
        },

        {
            title: "Stu Number",
            dataIndex: "student_number",
            render: (value) => value || "--",
        },

        {
            title: "Course",
            dataIndex: "course",
            render: (value) => (
                <Text style={{ maxWidth: 150, display: 'inline-block' }} ellipsis={{ tooltip: value }}>
                    {value || "--"}
                </Text>
            ),
        },

        {
            title: "Purpose",
            dataIndex: "purpose",
            render: (value) => (
                <Text style={{ maxWidth: 150, display: 'inline-block' }} ellipsis={{ tooltip: value }}>
                    {value || "--"}
                </Text>
            ),
        },

        {
            title: "CR",
            key: "cr",
            align: "right",
            render: (_, record) =>
                Number(record.cr_amount) > 0
                    ? Number(record.cr_amount).toFixed(2)
                    : "--",
        },

        {
            title: "DR",
            key: "dr",
            align: "right",
            render: (_, record) =>
                Number(record.dr_amount) > 0
                    ? Number(record.dr_amount).toFixed(2)
                    : "--",
        },

        {
            title: "Balance",
            dataIndex: "balance",
            align: "right",
            render: (value) =>
                Number(value || 0).toFixed(2),
        },

        {
            title: "Handover To",
            dataIndex: "handover_to",
            render: (value) => value || "--",
        },

        {
            title: "Handover date",
            dataIndex: "handover_date",
            render: (value) => value || "--",
        },

        {
            title: "Action",
            key: "action",
            align: "center",
            render: (_, record) => (
                <ActionCheckbox
                    record={record}
                    onActionUpdate={handleActionUpdate}
                />
            ),
        },
    ];

    const [cashSummary, setCashSummary] = useState({
        opening_balance: 0,
        income: 0,
        expenses: 0,
        balance: 0,
    });

    useEffect(() => {
        const fetchCashSummary = async () => {
            try {
                if (
                    !filterData?.value?.[0] ||
                    !filterData?.value?.[1]
                ) {
                    return;
                }

                const startDate = dayjs(filterData.value[0])
                    .startOf("day")
                    .format("YYYY-MM-DD");

                const endDate = dayjs(filterData.value[1])
                    .add(1, "day")
                    .startOf("day")
                    .format("YYYY-MM-DD");

                const response = await getCashStatementSummaryApi(
                    startDate,
                    endDate
                );

                if (response?.success && response?.data) {
                    setCashSummary(response.data);
                }
            } catch (error) {
                console.error("Cash summary error:", error);
            }
        };

        fetchCashSummary();
    }, [filterData]);


    const combinedSummaryList = useMemo(() => {
        const list = [...summaryDataList];
        if (cashSummary) {
            list.push({
                bank_id: "cash",
                bank_name: "CASH",
                ...cashSummary
            });
        }
        return list;
    }, [summaryDataList, cashSummary]);

    return (
        <div className="statements-page-container" style={{ position: 'relative' }}>
            {/* Green Upload Progress Popup */}
            {isUploading && (
                <div style={{
                    position: 'fixed',
                    top: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#fff',
                    padding: '16px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    minWidth: '320px',
                    border: '1px solid #f0f0f0'
                }}>
                    <div style={{ fontWeight: 600, color: '#333', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Uploading Statement...</span>
                        <span style={{ color: '#52c41a' }}>{uploadProgress}%</span>
                    </div>
                    <Progress
                        percent={uploadProgress}
                        status="active"
                        strokeColor="#52c41a"
                        showInfo={false}
                        size="small"
                    />
                </div>
            )}

            <div className="statements-header" style={{ alignItems: "center" }}>
                <h2 className="statements-page-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "24px", color: "#333" }}>
                    <FileText size={28} color="#d4af37" /> Statements
                </h2>
                <div>
                    <Filters onFilterChange={(data) => setFilterData(data)} />
                </div>
            </div>

            <div className="statements-content">
                <Row justify="center" gutter={[24, 24]}>
                    {/* Bank Statements Upload Table */}
                    <Col xs={24} md={18} lg={14}>
                        <Card
                            title="Bank Statements"
                            variant="borderless"
                            className="statement-card premium-card"
                            style={{ margin: "0 auto" }}
                        >
                            <Table
                                columns={columns}
                                dataSource={bankData}
                                pagination={false}
                                size="small"
                                scroll={{ y: 300 }}
                                className="statement-table"
                            />
                        </Card>
                    </Col>
                </Row>

                {/* 5 Summary Tables Grid */}
                <div className="statements-cards-top-row">
                    <Card title="Opening Balance" bordered={false} className="statement-single-card summary-table-card">
                        <Table size="small" pagination={false} dataSource={combinedSummaryList} loading={summaryLoading} rowKey="bank_id" columns={[
                            { title: 'Bank', dataIndex: 'bank_name' },
                            { title: 'Amount', dataIndex: 'opening_balance', align: 'right', render: (val) => formatCurrency(val) }
                        ]} />
                    </Card>
                    <Card title="Income" bordered={false} className="statement-single-card summary-table-card">
                        <Table size="small" pagination={false} dataSource={combinedSummaryList} loading={summaryLoading} rowKey="bank_id" columns={[
                            { title: 'Bank', dataIndex: 'bank_name' },
                            { title: 'Amount', dataIndex: 'income', align: 'right', render: (val) => formatCurrency(val) }
                        ]} />
                    </Card>
                    <Card title="Expenses" bordered={false} className="statement-single-card summary-table-card">
                        <Table size="small" pagination={false} dataSource={combinedSummaryList} loading={summaryLoading} rowKey="bank_id" columns={[
                            { title: 'Bank', dataIndex: 'bank_name' },
                            { title: 'Amount', dataIndex: 'expenses', align: 'right', render: (val) => formatCurrency(val) }
                        ]} />
                    </Card>
                </div>
                <div className="statements-cards-bottom-row">
                    <Card title="Balance" bordered={false} className="statement-single-card summary-table-card">
                        <Table size="small" pagination={false} dataSource={combinedSummaryList} loading={summaryLoading} rowKey="bank_id" columns={[
                            { title: 'Bank', dataIndex: 'bank_name' },
                            { title: 'Amount', dataIndex: 'balance', align: 'right', render: (val) => formatCurrency(val) }
                        ]} />
                    </Card>
                    <Card title="Not Reconciliation" bordered={false} className="statement-single-card summary-table-card">
                        <Table size="small" pagination={false} dataSource={formattedReconciliationData} rowKey="key" columns={[
                            { title: 'Bank', dataIndex: 'bankName' },
                            { title: 'Dr', dataIndex: 'dr', align: 'right', render: (val) => formatCurrency(val) },
                            { title: 'Cr', dataIndex: 'cr', align: 'right', render: (val) => formatCurrency(val) }
                        ]} />
                    </Card>
                </div>

                {/* Bank Tabs Transaction Section */}
                <Card bordered={false} className="premium-card" style={{ marginTop: '24px' }}>
                    <Tabs defaultActiveKey="1" activeKey={activeTab} onChange={setActiveTab} className="bank-tabs">
                        {allBanksData.map(bank => (
                            <Tabs.TabPane tab={bank.bankName} key={bank.key}>
                                <Table
                                    columns={bank.bankName?.toUpperCase() === 'CASH' ? cashTransactionColumns : transactionColumns}
                                    dataSource={filteredTransactions}
                                    pagination={false}
                                    size="small"
                                    loading={loading}
                                    className="statement-table"
                                />
                            </Tabs.TabPane>
                        ))}
                    </Tabs>
                </Card>
            </div>
        </div>
    );
};

export default Statements;