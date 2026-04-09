import React, { useEffect, useState } from "react";
import { Table, Button, Input, Spin, Empty } from "antd";
import { getAllWalletDetailsApi, getWalletEntriesApi, getAllWalletTransactionsApi } from "../../Api/action";
import { Wallet2, Plus, Download } from "lucide-react";
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
    const [exportLoading, setExportLoading] = useState(false);

    const [expandedPages, setExpandedPages] = useState({});

    const getDatesFromFilter = (params) => {
        if (!params || !params.value) return { startDate: null, endDate: null };
        const { filterType, compareMode, value } = params;
        let start, end;

        if (compareMode && Array.isArray(value) && value.length === 2) {
            start = value[0].startOf('day');
            end = value[1].endOf('day');
        } else {
            const selected = dayjs(value);
            if (filterType === "date") {
                start = selected.startOf("day");
                end = selected.endOf("day");
            } else if (filterType === "week") {
                start = selected.startOf("week");
                end = selected.endOf("week");
            } else if (filterType === "month") {
                // Billing cycle: 26th of previous month to 25th of current month
                start = selected.subtract(1, "month").date(26).startOf("day");
                end = selected.date(25).endOf("day");
            } else if (filterType === "year") {
                start = selected.startOf("year");
                end = selected.endOf("year");
            }
        }
        return {
            startDate: start ? start.format("YYYY-MM-DD") : null,
            endDate: end ? end.format("YYYY-MM-DD") : null
        };
    };

    // Load Wallet Details
    useEffect(() => {
        async function loadWalletDetails() {
            try {
                setLoading(true);
                const { startDate, endDate } = getDatesFromFilter(filterParams);

                let filters = {};
                if (startDate && endDate) {
                    filters.start_date = startDate;
                    filters.end_date = endDate;
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

        // Clear expanded data cache when period changes so it re-fetches for the new period
        setExpandedData({});
        setExpandedPages({});
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

    const handleExpand = async (expanded, record, page = 1) => {
        const currentPage = page || expandedPages[record.id] || 1;
        if (expanded) {
            setExpandingRows(prev => ({ ...prev, [record.id]: true }));
            try {
                const { startDate, endDate } = getDatesFromFilter(filterParams);
                let filters = {};
                if (startDate && endDate) {
                    filters.startDate = startDate;
                    filters.endDate = endDate;
                }

                const data = await getWalletEntriesApi(record.id, currentPage, 10, filters);
                setExpandedData(prev => ({ ...prev, [record.id]: data }));
                setExpandedPages(prev => ({ ...prev, [record.id]: currentPage }));
            } catch (err) {
                console.error("Error fetching wallet entries:", err);
            } finally {
                setExpandingRows(prev => ({ ...prev, [record.id]: false }));
            }
        }
    };

    const handleExport = async (record) => {
        try {
            setExportLoading(true);
            const { startDate, endDate } = getDatesFromFilter(filterParams);
            let filters = {};
            if (startDate && endDate) {
                filters.startDate = startDate;
                filters.endDate = endDate;
            }

            // Fetch ALL entries for export (using a large limit)
            const data = await getWalletEntriesApi(record.id, 1, 10000, filters);
            const entries = data?.entries || [];

            if (entries.length === 0) {
                alert("No transactions found to export.");
                return;
            }

            // Define CSV Headers
            const headers = ["Date", "Type", "Category", "Description", "Amount"];

            // Map entries to CSV Rows
            const csvRows = entries.map(entry => {
                const date = dayjs(entry.date).format("DD MMM, YYYY");
                const type = entry.type.toLowerCase() === 'income' ? 'Received' : 'Spent';
                const category = entry.main_category || entry.category || "-";
                const amount = entry.type.toLowerCase() === 'expense' ? `-${entry.amount}` : `+${entry.amount}`;

                return [
                    `"${date}"`,
                    `"${type}"`,
                    `"${category.replace(/"/g, '""')}"`,
                    `"${(entry.note || "").replace(/"/g, '""')}"`,
                    `"${amount}"`
                ].join(",");
            });

            // Combine Headers and Rows
            const csvString = [headers.join(","), ...csvRows].join("\n");

            // Create and trigger download
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `transaction_history_${record.name.replace(/\s+/g, '_')}_${dayjs().format("YYYY-MM-DD")}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            console.error("Export error:", err);
            alert("Failed to export history.");
        } finally {
            setExportLoading(false);
        }
    };

    const expandedRowRender = (record) => {
        const fullData = expandedData[record.id];
        const isExpanding = expandingRows[record.id];
        const currentPage = expandedPages[record.id] || 1;

        if (isExpanding) {
            return <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Spin /></div>;
        }

        let entries = fullData?.entries || [];

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
                        {type.toLowerCase() === 'income' ? 'Received' : 'Spent'}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, color: '#555' }}>Transaction History</h4>
                    <Button
                        icon={<Download size={14} />}
                        size="small"
                        onClick={() => handleExport(record)}
                        loading={exportLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                        Export History
                    </Button>
                </div>
                <Table
                    columns={historyColumns}
                    dataSource={entries}
                    pagination={{
                        current: currentPage,
                        pageSize: 10,
                        total: fullData?.total || 0,
                        onChange: (page) => handleExpand(true, record, page),
                        showSizeChanger: false
                    }}
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

    const handleGlobalExport = async () => {
        try {
            setExportLoading(true);
            const { startDate, endDate } = getDatesFromFilter(filterParams);

            // Fetch all transactions
            const res = await getAllWalletTransactionsApi();
            let entries = res?.entries || [];

            // Filter for income only
            entries = entries.filter(e => e.type.toLowerCase() === 'income');

            // Apply date filters if active
            if (startDate && endDate) {
                const start = dayjs(startDate);
                const end = dayjs(endDate);
                entries = entries.filter(e => {
                    const d = dayjs(e.date);
                    return d.isBetween(start, end, 'day', '[]');
                });
            }

            if (entries.length === 0) {
                alert("No income transactions found to export.");
                return;
            }

            // Define CSV Headers
            const headers = ["User", "Date", "Category", "Description", "Amount", "Branch"];

            // Map entries to CSV Rows
            const csvRows = entries.map(entry => {
                const user = entry.name || "-";
                const date = dayjs(entry.date).format("DD MMM, YYYY");
                const category = entry.main_category || entry.category || "-";
                const amount = entry.amount;

                return [
                    `"${user.replace(/"/g, '""')}"`,
                    `"${date}"`,
                    `"${category.replace(/"/g, '""')}"`,
                    `"${(entry.note || "").replace(/"/g, '""')}"`,
                    `"${amount}"`,
                    `"${(entry.branch || "").replace(/"/g, '""')}"`
                ].join(",");
            });

            // Combine Headers and Rows
            const csvString = [headers.join(","), ...csvRows].join("\n");

            // Create and trigger download
            const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `overall_income_history_${dayjs().format("YYYY-MM-DD")}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            console.error("Global Export error:", err);
            alert("Failed to export overall history.");
        } finally {
            setExportLoading(false);
        }
    };

    return (

        <div className="wallet-table-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 className="wallet-table-title" style={{ margin: 0 }}>
                    <Wallet2 size={24} color="#d4af37" /> User Wallet List
                </h2>
                <Button
                    type="primary"
                    icon={<Download size={16} />}
                    onClick={handleGlobalExport}
                    loading={exportLoading}
                    style={{ background: '#d4af37', borderColor: '#d4af37' }}
                >
                    Export Overall Received History
                </Button>
            </div>
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
                    pagination={{ pageSize: 10 }}
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

