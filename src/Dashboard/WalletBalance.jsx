import React, { useEffect, useState } from "react";
import { Table, Button, Input, Spin, Empty } from "antd";
import { getAllWalletDetailsApi, getWalletEntriesApi } from "../../Api/action";
import { Wallet2, Plus } from "lucide-react";
import WalletSkeleton, { WalletTableSkeleton } from "./WalletSkeleton";


import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekOfYear from "dayjs/plugin/weekOfYear";
import Filters from "../Filters/Filters";

dayjs.extend(isBetween);
dayjs.extend(weekOfYear);

const fmtAmt = (n) => {
    const val = Number(String(n ?? 0).replace(/[^0-9.-]+/g, "")) || 0;
    return `₹${val.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

export default function WalletBalanceTable({ onAddWallet, reloadTrigger }) {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [expandedData, setExpandedData] = useState({});
    const [expandingRows, setExpandingRows] = useState({});
    const [filterParams, setFilterParams] = useState(null);

    // Load Wallet Details
    useEffect(() => {
        async function loadWalletDetails() {
            try {
                setLoading(true);
                let filters = {};

                if (filterParams && filterParams.value) {
                    const { filterType, compareMode, value } = filterParams;
                    let start, end;

                    if (compareMode && Array.isArray(value) && value.length === 2) {
                        start = value[0];
                        end = value[1];
                    } else if (!compareMode && value) {
                        const unit = filterType === 'date' ? 'day' : filterType;
                        start = dayjs(value).startOf(unit);
                        end = dayjs(value).endOf(unit);
                    }

                    if (start && end) {
                        filters.start_date = start.format("YYYY-MM-DD");
                        filters.end_date = end.format("YYYY-MM-DD");
                    }
                }

                const walletData = await getAllWalletDetailsApi(filters);
                setUsers(walletData);
                setFilteredUsers(walletData);
                setLoading(false);
            } catch (err) {
                console.log(err);
                setLoading(false);
            }
        }
        loadWalletDetails();
    }, [reloadTrigger, filterParams]);

    // Apply Filters (ONLY SEARCH)
    useEffect(() => {
        let data = [...users];

        if (searchText.trim()) {
            data = data.filter(u =>
                u.name.toLowerCase().includes(searchText.toLowerCase()) ||
                (u.email || "").toLowerCase().includes(searchText.toLowerCase())
            );
        }
        setFilteredUsers(data);
    }, [searchText, users]);

    const handleExpand = async (expanded, record) => {
        if (expanded && !expandedData[record.id]) {
            setExpandingRows(prev => ({ ...prev, [record.id]: true }));
            try {
                const data = await getWalletEntriesApi(record.id);
                setExpandedData(prev => ({ ...prev, [record.id]: data }));
            } catch (err) {
                console.error("Error fetching wallet entries:", err);
            } finally {
                setExpandingRows(prev => ({ ...prev, [record.id]: false }));
            }
        }
    };

    const expandedRowRender = (record) => {
        const fullData = expandedData[record.id];
        const isExpanding = expandingRows[record.id];

        if (isExpanding) {
            return <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Spin /></div>;
        }

        let entries = fullData?.entries || [];

        // Apply Filters
        if (filterParams && entries.length > 0) {
            const { filterType, compareMode, value } = filterParams;
            if (value) {
                entries = entries.filter((item) => {
                    const itemDate = dayjs(item.date);
                    if (compareMode && Array.isArray(value) && value.length === 2) {
                        const start = value[0].startOf('day');
                        const end = value[1].endOf('day');
                        return itemDate.isBetween(start, end, null, '[]');
                    } else if (!compareMode && value) {
                        if (filterType === "date") return itemDate.isSame(value, 'day');
                        if (filterType === "week") return itemDate.isSame(value, 'week');
                        if (filterType === "month") return itemDate.isSame(value, 'month');
                        if (filterType === "year") return itemDate.isSame(value, 'year');
                    }
                    return true;
                });
            }
        }

        // Filter out expenses as per user request
        entries = entries.filter(e => e.type.toLowerCase() !== 'expense');

        const filteredIncome = entries
            .filter(e => e.type.toLowerCase() === 'income')
            .reduce((sum, e) => sum + Number(e.amount), 0);

        if (!entries || entries.length === 0) {
            return <Empty description="No transaction history for selected period" />;
        }

        const historyColumns = [
            {
                title: "Date",
                dataIndex: "date",
                key: "date",
                render: (date) => dayjs(date).format("DD MMM, YYYY"),
            },
            {
                title: "Type",
                dataIndex: "type",
                key: "type",
                render: (type) => (
                    <span style={{
                        textTransform: "capitalize",
                        color: type.toLowerCase() === 'income' ? 'green' : 'red',
                        fontWeight: 500
                    }}>
                        Recieved
                    </span>
                ),
            },
            {
                title: "Category",
                dataIndex: "category",
                key: "category",
                render: (val, item) => item.main_category || item.category || "-",
            },
            {
                title: "Description",
                dataIndex: "note",
                key: "note",
            },
            {
                title: "Amount",
                dataIndex: "amount",
                key: "amount",
                render: (amount, item) => (
                    <span style={{
                        fontWeight: "bold",
                        color: (item.type || "").toLowerCase() === 'income' ? 'green' : 'red'
                    }}>
                        {item.type.toLowerCase() === 'expense' ? '-' : '+'}{fmtAmt(amount)}
                    </span>
                ),
            },
        ];

        return (
            <div style={{ margin: 0, background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '0px', marginTop: '0px', color: '#555' }}>Transaction History</h4>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '8px' }}>
                    {/* <div style={{ background: 'white', padding: '10px 15px', borderRadius: '6px', border: '1px solid #eee' }}>
                        <span style={{ color: '#888', display: 'block', fontSize: '12px' }}>Total Income</span>
                        <span style={{ color: 'green', fontWeight: 'bold', fontSize: '16px' }}>₹{filteredIncome.toLocaleString()}</span>
                    </div>

                    <div style={{ background: 'white', padding: '10px 15px', borderRadius: '6px', border: '1px solid #eee' }}>
                        <span style={{ color: '#888', display: 'block', fontSize: '12px' }}>Wallet Balance</span>
                        <span style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '16px' }}>₹{Number(fullData.wallet).toLocaleString()}</span>
                    </div> */}
                </div>
                <Table
                    columns={historyColumns}
                    dataSource={entries}
                    pagination={{ pageSize: 5 }}
                    rowKey="id"
                    size="small"
                    bordered
                />
            </div >
        );
    };

    const columns = [
        {
            title: "User",
            dataIndex: "name",
            key: "name",
            render: (text, record) => (
                <div className="wallet-user-flex">
                    <div className="wallet-avatar">{record.name.charAt(0)}</div>
                    <div className="wallet-user-info">
                        <div className="wallet-user-name">{record.name}</div>
                        <div className="wallet-user-email">{record.email || "No Email"}</div>
                    </div>
                </div>
            ),
        },
        {
            title: "Received",
            dataIndex: "received",
            key: "received",
            render: (amount) => {
                return (
                    <span
                        style={{
                            fontWeight: 500,
                            fontSize: "16px",
                            color: "#28a745",
                        }}
                    >
                        {fmtAmt(amount)}
                    </span>
                );
            },
        },
        {
            title: "Spend",
            dataIndex: "spend",
            key: "spend",
            render: (amount) => {
                return (
                    <span
                        style={{
                            fontWeight: 500,
                            fontSize: "16px",
                            color: "#dc3545",
                        }}
                    >
                        {fmtAmt(amount)}
                    </span>
                );
            },
        },
        {
            title: "Balance",
            dataIndex: "balance",
            key: "balance",
            render: (amount) => {
                const num = Number(amount);
                return (
                    <span
                        className="wallet-amount"
                        style={{
                            fontWeight: 500,
                            fontSize: "16px",
                            color:
                                num > 0 ? "green" :
                                    num < 0 ? "red" :
                                        "#555",
                        }}
                    >
                        {fmtAmt(amount)}
                    </span>
                );
            },
        },
        {
            title: "Action",
            key: "action",
            fixed: 'right',
            width: 150,
            render: (_, record) => (
                <Button
                    type="primary"
                    className="wallet-add-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddWallet(record);
                    }}
                >
                    <Plus size={16} />
                    Add Wallet
                </Button>
            ),
        },
    ];


    return (

        <div className="wallet-table-container">
            <h2 className="wallet-table-title">
                <Wallet2 size={24} color="#d4af37" /> User Wallet List
            </h2>
            <div style={{ marginBottom: 20 }}>
                <Filters onFilterChange={setFilterParams} style={{ background: "transparent", padding: 0 }} />
            </div>
            <div className="wallet-filter-box">
                <Input
                    placeholder="Search name or email"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="wallet-filter-input"
                />
            </div>
            {loading ? (
                <WalletTableSkeleton />
            ) : (
                <Table
                    className="wallet-table"
                    loading={loading}
                    columns={columns}
                    dataSource={filteredUsers}
                    rowKey={(record) => record.id}
                    pagination={{ pageSize: 8 }}
                    expandable={{
                        expandedRowRender,
                        onExpand: handleExpand,
                        rowExpandable: (record) => true,
                    }}
                />
            )}
        </div>
    );
}

