import React, { useState, useEffect, useMemo } from "react";
import { Table, Button, Upload, Card, Row, Col, Typography, Tabs, Checkbox, message, Progress, Popover, Input, Popconfirm, Avatar, Select, Pagination } from "antd";
import dayjs from "dayjs";
import { UploadOutlined, DollarOutlined, ArrowDownOutlined, ArrowUpOutlined, EditOutlined, BankOutlined } from "@ant-design/icons";
import { FileText, Trash2 } from "lucide-react";
import Filters from "../Filters/Filters";
import StatementsSkeleton from "./StatementsSkeleton";
import {
    getBankTransactionsApi, getCashStatementsApi, uploadCashStatementApi, getCashStatementSummaryApi, API_BASE_URL, getBanksApi, getAllBanksSummaryApi,
    addTransactionActionApi, updateTransactionActionApi, deleteTransactionActionApi, getReconciliationSummaryApi, createCashTransactionActionApi,
    updateCashTransactionActionApi, deleteCashTransactionActionApi, getCashReconciliationSummaryApi
} from "../../Api/action";
import "../css/Statement.css";
import sbiLogo from "../assets/images/sbi-logo.svg";
import hdfcLogo from "../assets/images/hdfc-logo.svg";
import iciciLogo from "../assets/images/icici-1.svg";
import axisLogo from "../assets/images/axis-logo.svg";
import rblLogo from "../assets/images/RBL_Bank_SVG_Logo.svg";
import kotakLogo from "../assets/images/Kotak-logo.svg";
import bandhanLogo from "../assets/images/Bandhan-bank-logo.svg"
import TransactionActionModal from "./TransactionActionModal";

const { Title, Text } = Typography;

const ActionCheckbox = ({ record, onActionUpdate, isCash = false }) => {
    const existingAction = record.action || null;
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleDelete = async (e) => {
        e.stopPropagation(); // Prevent opening modal
        setSaving(true);
        try {
            let res;
            if (isCash) {
                res = await deleteCashTransactionActionApi(record.id);
            } else {
                res = await deleteTransactionActionApi(record.id);
            }
            if (res.success) {
                message.success("Action removed");
                onActionUpdate(record.id, null);
            }
        } catch (error) {
            message.error(error.message || "Failed to remove action");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div
                style={{ display: 'inline-flex', padding: '4px', cursor: 'pointer', alignItems: 'center', gap: '8px' }}
                onClick={() => setModalVisible(true)}
            >
                <Checkbox checked={!!existingAction} />
                {existingAction && (
                    <EditOutlined style={{ color: '#1890ff', fontSize: '15px' }} />
                )}
                {existingAction && (
                    <Popconfirm
                        title="Delete Action"
                        description="Are you sure you want to remove this transaction action?"
                        onConfirm={handleDelete}
                        onClick={(e) => e.stopPropagation()}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Trash2 size={16} color="red" style={{ marginLeft: 8 }} onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                )}
            </div>

            <TransactionActionModal
                open={modalVisible}
                onClose={() => setModalVisible(false)}
                record={record}
                isCash={isCash}
                onActionUpdate={onActionUpdate}
            />
        </>
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
    const [cashReconciliationData, setCashReconciliationData] = useState({
        dr: 0,
        cr: 0,
    });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

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
        setPage(1);
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
            const bankRes = await getReconciliationSummaryApi(start, end);
            const cashRes = await getCashReconciliationSummaryApi(start, end);

            // Existing bank data
            let combinedData = [];

            if (bankRes?.success && Array.isArray(bankRes.data)) {
                combinedData = [...bankRes.data];
            }

            // Add CASH reconciliation
            if (cashRes?.success && cashRes?.data) {
                const cashData = {
                    bank_name: "CASH",
                    dr: Number(cashRes.data.dr || 0),
                    cr: Number(cashRes.data.cr || 0),
                };

                // Remove CASH if it already exists
                combinedData = combinedData.filter(
                    item => item.bank_name?.toUpperCase() !== "CASH"
                );

                // Add latest CASH data
                combinedData.push(cashData);

                setCashReconciliationData({
                    dr: Number(cashRes.data.dr || 0),
                    cr: Number(cashRes.data.cr || 0),
                });
            } else {
                setCashReconciliationData({
                    dr: 0,
                    cr: 0,
                });
            }

            setReconciliationData(combinedData);

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

    const renderUploadButton = (record) => {
        const isCash = record.bankName?.toUpperCase() === "CASH";

        if (isCash) {
            return (
                <Upload
                    showUploadList={false}
                    beforeUpload={async (file) => {
                        try {
                            setIsUploading(true);
                            setUploadProgress(30);

                            const res = await uploadCashStatementApi(file);

                            setUploadProgress(100);

                            if (res?.success) {
                                message.success("Cash statement uploaded successfully");

                                if (String(activeTab) === String(record.key)) {
                                    await fetchTransactions(record.key);
                                }
                            }
                        } catch (error) {
                            console.error("Cash upload failed:", error);
                            message.error(error?.message || "Cash statement upload failed");
                        } finally {
                            setTimeout(() => {
                                setIsUploading(false);
                                setUploadProgress(0);
                            }, 500);
                        }
                        return false;
                    }}
                >
                    <Button type="primary" icon={<UploadOutlined />} className="statement-upload-btn" style={{ borderRadius: '6px', background: '#d4af37', border: 'none' }}>
                        Upload
                    </Button>
                </Upload>
            );
        }

        return (
            <Upload
                showUploadList={false}
                name="statement"
                action={`${API_BASE_URL}/api/transactions/bank-statements/upload`}
                data={{ bank_id: record.key }}
                headers={{
                    Authorization: `Bearer ${localStorage.getItem("AccessToken")}`
                }}
                onChange={async (info) => {
                    if (info.file.status === 'uploading') {
                        setIsUploading(true);
                        setUploadProgress(Math.round(info.file.percent) || 30);
                    }
                    if (info.file.status === 'done') {
                        setUploadProgress(100);
                        message.success(`${record.bankName} statement uploaded successfully`);
                        if (String(activeTab) === String(record.key)) {
                            await fetchTransactions(record.key);
                        }
                        setTimeout(() => {
                            setIsUploading(false);
                            setUploadProgress(0);
                        }, 500);
                    } else if (info.file.status === 'error') {
                        message.error(info.file.response?.message || `${record.bankName} statement upload failed`);
                        setTimeout(() => {
                            setIsUploading(false);
                            setUploadProgress(0);
                        }, 500);
                    }
                }}
            >
                <Button type="primary" icon={<UploadOutlined />} className="statement-upload-btn" style={{ borderRadius: '6px', background: '#d4af37', border: 'none' }}>
                    Upload
                </Button>
            </Upload>
        );
    };

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
            render: (_, record) => record.type === 'DR' ? <Text style={{ color: '#ff4d4f', fontWeight: 500 }}>{formatCurrency(record.amount)}</Text> : '--'
        },
        {
            title: 'Cr',
            key: 'cr',
            align: 'right',
            render: (_, record) => record.type === 'CR' ? <Text style={{ color: '#52c41a', fontWeight: 500 }}>{formatCurrency(record.amount)}</Text> : '--'
        },
        {
            title: 'Balance',
            dataIndex: 'balance',
            align: 'right',
            render: (val) => <Text style={{ color: '#1890ff', fontWeight: 500 }}>{formatCurrency(val)}</Text>
        },
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
            render: (value) => (
                <Text style={{ maxWidth: 80, display: 'inline-block' }} ellipsis={{ tooltip: value }}>
                    {value || "--"}
                </Text>
            ),
        },

        {
            title: "Stu Name",
            dataIndex: "student_name",
            render: (value) => (
                <Text style={{ maxWidth: 100, display: 'inline-block' }} ellipsis={{ tooltip: value }}>
                    {value || "--"}
                </Text>
            ),
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
                <Text style={{ maxWidth: 100, display: 'inline-block' }} ellipsis={{ tooltip: value }}>
                    {value || "--"}
                </Text>
            ),
        },

        {
            title: "Purpose",
            dataIndex: "purpose",
            render: (value) => (
                <Text style={{ maxWidth: 100, display: 'inline-block' }} ellipsis={{ tooltip: value }}>
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
                    ? <Text style={{ color: '#52c41a', fontWeight: 500 }}>{formatCurrency(record.cr_amount)}</Text>
                    : "--",
        },

        {
            title: "DR",
            key: "dr",
            align: "right",
            render: (_, record) =>
                Number(record.dr_amount) > 0
                    ? <Text style={{ color: '#ff4d4f', fontWeight: 500 }}>{formatCurrency(record.dr_amount)}</Text>
                    : "--",
        },

        {
            title: "Balance",
            dataIndex: "balance",
            align: "right",
            render: (value) =>
                <Text style={{ color: '#1890ff', fontWeight: 500 }}>{formatCurrency(value || 0)}</Text>,
        },

        {
            title: "Handover To",
            dataIndex: "handover_to",
            render: (value) => (
                <Text style={{ maxWidth: 80, display: 'inline-block' }} ellipsis={{ tooltip: value }}>
                    {value || "--"}
                </Text>
            ),
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
                    isCash={true}
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
        // Remove existing CASH row from bank summary
        const list = summaryDataList.filter(
            item => item.bank_name?.toUpperCase() !== "CASH"
        );

        // Add the real CASH summary
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
                {(banksLoading || summaryLoading) ? (
                    <StatementsSkeleton />
                ) : (
                <>
                <Row justify="center" gutter={[24, 24]}>
                    {/* Bank Statements Upload Table */}
                    <Col xs={24} lg={24}>
                        <Card
                            title="Bank Statements"
                            variant="borderless"
                            className="statement-card premium-card"
                            style={{ margin: "0 auto", width: '100%' }}
                        >
                            <div style={{ padding: '10px 0', maxHeight: '450px', overflowY: 'auto', overflowX: 'hidden' }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(5, 1fr)',
                                    gap: '16px',
                                    padding: '8px'
                                }}>
                                    {allBanksData.map((bank) => {
                                        const getBankLogo = (bankName) => {
                                            const name = bankName?.toUpperCase() || "";
                                            if (name.includes('SBI')) return sbiLogo;
                                            if (name.includes('HDFC')) return hdfcLogo;
                                            if (name.includes('ICICI')) return iciciLogo;
                                            if (name.includes('AXIS')) return axisLogo;
                                            if (name.includes('RBL')) return rblLogo;
                                            if (name.includes('BANDHAN')) return bandhanLogo;
                                            if (name.includes('KOTAK')) return kotakLogo;
                                            if (name === 'CASH') return "https://cdn-icons-png.flaticon.com/512/2489/2489756.png";
                                            return null;
                                        };
                                        const logo = getBankLogo(bank.bankName);
                                        return (
                                            <div key={bank.key} style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                padding: '20px 16px',
                                                borderRadius: '12px',
                                                border: '1px solid #eaeaea',
                                                background: '#ffffff',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                                height: '180px',
                                                width: '100%'
                                            }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                                                    e.currentTarget.style.borderColor = '#d4af37';
                                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                                    e.currentTarget.style.borderColor = '#eaeaea';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                {logo ? (
                                                    <div style={{ width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                                        <img src={logo} alt={bank.bankName} style={{ maxWidth: '120px', maxHeight: '100%', objectFit: 'contain' }} />
                                                    </div>
                                                ) : (
                                                    <div style={{ width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                                        <Avatar
                                                            size={48}
                                                            style={{ backgroundColor: bank.bankName?.toUpperCase() === 'CASH' ? '#52c41a' : '#1890ff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                                            icon={bank.bankName?.toUpperCase() === 'CASH' ? <DollarOutlined /> : <BankOutlined />}
                                                        />
                                                    </div>
                                                )}
                                                <div style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                    <Text strong style={{ fontSize: '13px', color: '#333', textAlign: 'center', lineHeight: '1.2' }}>{bank.bankName}</Text>
                                                </div>
                                                <div style={{ marginTop: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
                                                    {renderUploadButton(bank)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* 5 Summary Tables Grid */}
                <div className="statements-cards-top-row">
                    <Card title="Opening Balance" variant="borderless" className="statement-single-card summary-table-card">
                        <Table size="small" pagination={false} dataSource={combinedSummaryList} loading={summaryLoading} rowKey="bank_id" columns={[
                            { title: 'Bank', dataIndex: 'bank_name' },
                            { title: 'Amount', dataIndex: 'opening_balance', align: 'right', render: (val) => formatCurrency(val) }
                        ]} />
                    </Card>
                    <Card title="Income" variant="borderless" className="statement-single-card summary-table-card">
                        <Table size="small" pagination={false} dataSource={combinedSummaryList} loading={summaryLoading} rowKey="bank_id" columns={[
                            { title: 'Bank', dataIndex: 'bank_name' },
                            { title: 'Amount', dataIndex: 'income', align: 'right', render: (val) => formatCurrency(val) }
                        ]} />
                    </Card>
                    <Card title="Expenses" variant="borderless" className="statement-single-card summary-table-card">
                        <Table size="small" pagination={false} dataSource={combinedSummaryList} loading={summaryLoading} rowKey="bank_id" columns={[
                            { title: 'Bank', dataIndex: 'bank_name' },
                            { title: 'Amount', dataIndex: 'expenses', align: 'right', render: (val) => formatCurrency(val) }
                        ]} />
                    </Card>
                </div>
                <div className="statements-cards-bottom-row">
                    <Card title="Balance" variant="borderless" className="statement-single-card summary-table-card">
                        <Table size="small" pagination={false} dataSource={combinedSummaryList} loading={summaryLoading} rowKey="bank_id" columns={[
                            { title: 'Bank', dataIndex: 'bank_name' },
                            { title: 'Amount', dataIndex: 'balance', align: 'right', render: (val) => formatCurrency(val) }
                        ]} />
                    </Card>
                    <Card title="Not Reconciliation" variant="borderless" className="statement-single-card summary-table-card">
                        <Table size="small" pagination={false} dataSource={formattedReconciliationData} rowKey="key" columns={[
                            { title: 'Bank', dataIndex: 'bankName' },
                            { title: 'Dr', dataIndex: 'dr', align: 'right', render: (val) => formatCurrency(val) },
                            { title: 'Cr', dataIndex: 'cr', align: 'right', render: (val) => formatCurrency(val) }
                        ]} />
                    </Card>
                </div>

                {/* Bank Tabs Transaction Section */}
                <Card variant="borderless" className="premium-card" style={{ marginTop: '24px' }}>
                    <Tabs
                        defaultActiveKey="1"
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="bank-tabs"
                        items={allBanksData.map(bank => ({
                            label: bank.bankName,
                            key: String(bank.key),
                            children: (
                                <Table
                                    columns={bank.bankName?.toUpperCase() === 'CASH' ? cashTransactionColumns : transactionColumns}
                                    dataSource={filteredTransactions.slice((page - 1) * pageSize, page * pageSize)}
                                    pagination={false}
                                    size={bank.bankName?.toUpperCase() === 'CASH' ? "small" : "middle"}
                                    loading={loading}
                                    className={bank.bankName?.toUpperCase() === 'CASH' ? "statement-table compact-table" : "statement-table"}
                                />
                            )
                        }))}
                    />
                </Card>
                </>
                )}
            </div>

            {!banksLoading && !summaryLoading && filteredTransactions.length > 0 && (
                <div className="statement-pagination" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', alignItems: 'center', gap: '20px', padding: '10px 0', background: 'transparent' }}>
                    <div className="rows-per-page-container">
                        Rows per page:
                        <Select
                            value={pageSize}
                            onChange={(v) => {
                                setPageSize(v);
                                setPage(1);
                            }}
                            size="small"
                            className="rows-per-page-select"
                            style={{ width: 70, marginLeft: 8 }}
                            options={[
                                { value: 10, label: '10' },
                                { value: 25, label: '25' },
                                { value: 50, label: '50' },
                                { value: 100, label: '100' },
                            ]}
                        />
                    </div>
                    <Pagination
                        current={page}
                        onChange={(p) => setPage(p)}
                        total={filteredTransactions.length}
                        pageSize={pageSize}
                        showSizeChanger={false}
                    />
                </div>
            )}
        </div>
    );
};

export default Statements;