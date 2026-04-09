import React, { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip as ChartTooltip,
    Legend,
} from "chart.js";
import { Pie } from "react-chartjs-2";
import {
    TrendingUp,
    PieChart,
    CreditCard,
    Wallet,
    Receipt,
    MoreHorizontal,
    Minimize2,
    Upload,
    Download
} from "lucide-react";
import "../css/Dashboard.css";
import "../css/Calendar.css";
import AmountDetails from "./AmountDetails";
import Filters from "../Filters/Filters";
import {
    getExpenseCategoriesApi,
    getWalletEntriesApi,
    getUserAllExpensesApi,
    getAllWalletTransactionsApi,
    safeGetLocalStorage,
    getIncomeCategoriesApi,
    getDashboardStatsApi,
    getDashboardChartsApi,
    getRecentTransactionsApi,
    bulkUploadExpensesApi,
    downloadExpenseTemplateApi
} from "../../Api/action";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

import Modals from "./Modals";
import InvoicePreviewModal from "../Common/InvoicePreviewModal";
dayjs.extend(isBetween);
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);
import DashboardSkeleton from "./DashboardSkeleton";
import { CommonToaster } from "../../Common/CommonToaster";

const fmtAmt = (n) => {
    const val = Number(String(n ?? 0).replace(/[^0-9.-]+/g, "")) || 0;
    return `₹${val.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};


export default function Dashboard() {
    const [expenseCategories, setExpenseCategories] = useState({});
    const [incomeCategories, setIncomeCategories] = useState([]);

    // Optimized Dashboard State
    const [dashboardStats, setDashboardStats] = useState(null);
    const [chartData, setChartData] = useState({ walletData: [], expenseData: [] });
    const [recentTransactions, setRecentTransactions] = useState({ income: [], expense: [] });
    const [walletEntries, setWalletEntries] = useState([]);

    const [openModal, setOpenModal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("expense");
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [currentInvoices, setCurrentInvoices] = useState([]);
    const [branch, setBranch] = useState("Select Branch");
    const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [total, setTotal] = useState("");
    const [mainCategory, setMainCategory] = useState("Select Main Category");
    const [subCategory, setSubCategory] = useState("Select Category");
    const [description, setDescription] = useState("");
    const [showAllCategories, setShowAllCategories] = useState(false);

    const [filters, setFilters] = useState({
        filterType: "date",
        compareMode: false,
        value: dayjs(),
    });
    const user = safeGetLocalStorage("loginDetails", {});

    // -------------------------
    // Utility to get date ranges for APIs
    // -------------------------
    const getDateRanges = (f) => {
        if (!f.value) return {};
        const type = f.filterType;
        let start, end, pStart, pEnd;

        if (!f.compareMode) {
            const selected = dayjs(f.value);
            if (type === "date") {
                start = selected.startOf("day");
                end = selected.endOf("day");
                pStart = selected.subtract(1, "day").startOf("day");
                pEnd = selected.subtract(1, "day").endOf("day");
            } else if (type === "week") {
                start = selected.startOf("week");
                end = selected.endOf("week");
                pStart = selected.subtract(1, "week").startOf("week");
                pEnd = selected.subtract(1, "week").endOf("week");
            } else if (type === "month") {
                start = selected.subtract(1, "month").date(26).startOf("day");
                end = selected.date(25).endOf("day");
                pStart = selected.subtract(2, "month").date(26).startOf("day");
                pEnd = selected.subtract(1, "month").date(25).endOf("day");
            } else if (type === "year") {
                start = selected.startOf("year");
                end = selected.endOf("year");
                pStart = selected.subtract(1, "year").startOf("year");
                pEnd = selected.subtract(1, "year").endOf("year");
            }
        } else if (Array.isArray(f.value)) {
            [start, end] = f.value;
        }

        return {
            startDate: start?.format("YYYY-MM-DD"),
            endDate: end?.format("YYYY-MM-DD"),
            prevStartDate: pStart?.format("YYYY-MM-DD"),
            prevEndDate: pEnd?.format("YYYY-MM-DD"),
        };
    };

    // -------------------------
    // Load Static / Initial Data
    // -------------------------
    const fetchStaticData = async () => {
        try {
            const [expCat, incCat] = await Promise.all([
                getExpenseCategoriesApi(),
                getIncomeCategoriesApi()
            ]).catch(() => [[], []]);

            const grouped = (expCat || []).reduce((acc, item) => {
                const main = item.main_category;
                const sub = item.sub_category;
                if (!acc[main]) acc[main] = [];
                acc[main].push(sub);
                return acc;
            }, {});
            setExpenseCategories(grouped);
            setIncomeCategories(incCat || []);

            // Also load wallet entries once for overall context if needed, 
            // but we'll prioritize the optimized stats for the main view.
            if (user?.role === "user") {
                const wallets = await getWalletEntriesApi(user.id).catch(() => ({ entries: [] }));
                setWalletEntries(wallets.entries || []);
            } else if (user?.role === "admin" || user?.role === "superadmin") {
                const allWallets = await getAllWalletTransactionsApi().catch(() => ({ entries: [] }));
                setWalletEntries(allWallets.entries || []);
            }
        } catch (err) {
            console.error("fetchStaticData error:", err);
        }
    };

    // -------------------------
    // Fetch Dashboard Data on filter change
    // -------------------------
    const refreshDashboard = async () => {
        try {
            setLoading(true);
            const ranges = getDateRanges(filters);

            const [stats, charts, recent] = await Promise.all([
                getDashboardStatsApi(ranges),
                getDashboardChartsApi(ranges),
                getRecentTransactionsApi()
            ]);

            setDashboardStats(stats);
            setChartData(charts);
            setRecentTransactions({
                income: recent.approvals.map(a => ({ ...a, amount: Number(a.amount) })),
                expense: recent.expenses.map(e => ({ ...e, amount: -Math.abs(Number(e.amount)) }))
            });
        } catch (err) {
            console.error("refreshDashboard error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const formData = new FormData();
        files.forEach(file => {
            formData.append("files", file); // Use "files" to match backend router
        });

        try {
            setLoading(true);
            const res = await bulkUploadExpensesApi(formData);
            CommonToaster(res.message, "success");
            refreshDashboard();
        } catch (err) {
            CommonToaster(err.message || "Bulk upload failed", "error");
        } finally {
            setLoading(false);
            e.target.value = ""; // Reset input
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await downloadExpenseTemplateApi();
            CommonToaster("Template downloaded", "success");
        } catch (err) {
            CommonToaster("Failed to download template", "error");
        }
    };

    useEffect(() => {
        fetchStaticData();
    }, []);

    useEffect(() => {
        refreshDashboard();
    }, [filters]);

    useEffect(() => {
        const reloadData = () => {
            fetchStaticData();
            refreshDashboard();
        };

        window.addEventListener("incomeExpenseUpdated", reloadData);
        window.addEventListener("summaryUpdated", reloadData);
        return () => {
            window.removeEventListener("incomeExpenseUpdated", reloadData);
            window.removeEventListener("summaryUpdated", reloadData);
        };
    }, [filters]);

    useEffect(() => {
        const openIncome = () => setOpenModal("income");
        const openExpense = () => setOpenModal("expense");

        window.addEventListener("openIncomeModal", openIncome);
        window.addEventListener("openExpenseModal", openExpense);

        return () => {
            window.removeEventListener("openIncomeModal", openIncome);
            window.removeEventListener("openExpenseModal", openExpense);
        };
    }, []);


    const handleViewInvoice = (invoiceData) => {
        if (!invoiceData) return;
        const BASE = import.meta.env.VITE_API_URL.replace(/\/$/, "");
        let invoicesArray = [];
        const normalize = (item) => {
            if (!item) return null;

            let str = String(item).trim().replace(/^"+|"+$/g, "");

            // If it's base64, return as-is
            if (str.startsWith("data:")) return str;
            // If it already has the full path, return as-is
            if (str.startsWith("http") || str.startsWith("/uploads")) return str.startsWith("http") ? str : `${BASE}${str}`;
            // Otherwise, assume it's just a filename
            return `${BASE}/uploads/invoices/${str}`;
        };
        if (Array.isArray(invoiceData)) {
            invoicesArray = invoiceData.map(normalize).filter(Boolean);
        }
        else if (typeof invoiceData === "string" && invoiceData.startsWith("[")) {
            try {
                const parsed = JSON.parse(invoiceData);
                if (Array.isArray(parsed)) {
                    invoicesArray = parsed.map(normalize).filter(Boolean);
                }
            } catch { }
        }
        if (!invoicesArray.length) {
            invoicesArray = [normalize(invoiceData)].filter(Boolean);
        }
        if (!invoicesArray.length) return;
        setCurrentInvoices(invoicesArray);
        setShowInvoiceModal(true);
    };

    const walletChartData = useMemo(() => {
        return chartData.walletData || [];
    }, [chartData]);

    const expensePieData = useMemo(() => {
        const sortedEntries = (chartData.expenseData || [])
            .sort((a, b) => b.value - a.value);

        const totalCategories = sortedEntries.length;
        const displayedEntries = showAllCategories ? sortedEntries : sortedEntries.slice(0, 5);

        const baseColors = [
            "#4BC0C0", "#FFCD56", "#FF6384", "#36A2EB", "#d4af37",
            "#8e5ea2", "#3cba9f", "#e8c3b9", "#c45850", "#7e57c2",
            "#ff9f40", "#ffcd56", "#4bc0c0", "#36a2eb", "#9966ff"
        ];

        return {
            labels: displayedEntries.map(e => e.name),
            datasets: [
                {
                    data: displayedEntries.map(e => e.value),
                    backgroundColor: displayedEntries.map((_, i) => baseColors[i % baseColors.length]),
                    borderColor: "#fff",
                    borderWidth: 2,
                },
            ],
            hasMore: totalCategories > 5
        };
    }, [chartData, showAllCategories]);

    // -------------------------
    // Small helper for "no data" box
    // -------------------------
    const NoDataBox = ({ title = "No Data Found", subtitle = "" }) => (
        <div className="no-data-box">
            <img
                src="https://cdn-icons-png.flaticon.com/512/4076/4076503.png"
                alt="no data"
                className="no-data-img"
            />
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
        </div>
    );

    return (
        <>
            <Filters onFilterChange={setFilters} />
            {loading ? (
                <DashboardSkeleton />
            ) : (
                <div className="dashboard-container">
                    <AmountDetails
                        stats={dashboardStats}
                        filters={filters}
                        loading={loading}
                        user={user}
                    />

                    {/* QUICK ADD SECTION */}
                    <motion.div
                        className="quick-access-card"
                        initial="hidden"
                        animate="visible"
                    >
                        <h3 className="quick-access-title">Add New Records</h3>
                        <div className="quick-access-grid">
                            {(user?.role !== "admin" && user?.role !== "superadmin") && (
                                <div
                                    className="quick-access-item"
                                    onClick={() => {
                                        setOpenModal("approval");
                                        setMainCategory("Select Main Category");
                                        setSubCategory("Select Category");
                                    }}
                                >
                                    <div className="quick-access-icon" style={{ background: "#006b29ff" }}>
                                        <Receipt size={18} />
                                    </div>
                                    <span>+ New Approve</span>
                                </div>
                            )}
                            <div
                                className="quick-access-item"
                                onClick={() => {
                                    setOpenModal("expense");
                                    setMainCategory("Select Main Category");
                                    setSubCategory("Select Category");
                                }}
                            >
                                <div className="quick-access-icon" style={{ background: "#ff1b1bff" }}>
                                    <Wallet size={18} />
                                </div>
                                <span>+ New Expense</span>
                            </div>

                            <div
                                className="quick-access-item"
                                onClick={() => document.getElementById("bulk-upload-input-dash").click()}
                                style={{ border: "1.5px dashed #d4af37" }}
                            >
                                <div className="quick-access-icon" style={{ background: "#d4af37" }}>
                                    <Upload size={18} />
                                </div>
                                <span>Bulk Upload</span>
                            </div>

                            <div
                                className="quick-access-item"
                                onClick={handleDownloadTemplate}
                                style={{ border: "1.5px dashed #555" }}
                            >
                                <div className="quick-access-icon" style={{ background: "#555" }}>
                                    <Download size={18} />
                                </div>
                                <span>Download Template</span>
                            </div>
                        </div>
                        <input
                            type="file"
                            id="bulk-upload-input-dash"
                            style={{ display: "none" }}
                            accept=".csv, .xlsx, .xls, image/*"
                            multiple
                            onChange={handleBulkUpload}
                        />
                    </motion.div>

                    {/* CHARTS SECTION */}
                    <div className="graphs-grid">
                        {/* CASH FLOW (Wallet) */}
                        <motion.div className="chart-card" initial="hidden" animate="visible">
                            <div className="chart-header">
                                <h3>
                                    <TrendingUp size={18} style={{ marginRight: 8, color: "#d4af37" }} />
                                    Wallet Cash Flow
                                </h3>
                            </div>
                            <div className="chart-wrapper">
                                {walletChartData.length === 0 ? (
                                    <NoDataBox title="No Data Found" subtitle="No Wallet data recorded." />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={walletChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorWallet" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#009688" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#009688" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis
                                                dataKey="month"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: "#6b7280", fontSize: 12 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: "#6b7280", fontSize: 12 }}
                                                tickFormatter={(val) => Math.round(val)}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: "#1c2431",
                                                    borderRadius: "8px",
                                                    border: "none",
                                                    color: "#fff",
                                                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                                }}
                                                itemStyle={{ color: "#fff" }}
                                                labelStyle={{ color: "#9ca3af", marginBottom: "4px" }}
                                                formatter={(val) => [fmtAmt(val), "Income"]}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#009688"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorWallet)"
                                                activeDot={{ r: 6, strokeWidth: 0, fill: "#009688" }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </motion.div>

                        {/* CATEGORY BREAKDOWN (Expense) */}
                        <motion.div className="chart-card" initial="hidden" animate="visible">
                            <div className="chart-header">
                                <h3>
                                    <PieChart size={18} style={{ marginRight: 8, color: "#d4af37" }} />
                                    Expense Breakdown
                                </h3>
                                {expensePieData.hasMore && (
                                    <button
                                        onClick={() => setShowAllCategories(!showAllCategories)}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "#6b7280",
                                            display: "flex",
                                            alignItems: "center"
                                        }}
                                        title={showAllCategories ? "Show Less" : "Show All"}
                                    >
                                        {showAllCategories ? <Minimize2 size={18} /> : <MoreHorizontal size={18} />}
                                    </button>
                                )}
                            </div>
                            <div className="chart-wrapper">
                                {expensePieData.labels.length === 0 ? (
                                    <NoDataBox title="No Data Found" subtitle="No Expense Data available." />
                                ) : (
                                    <Pie
                                        data={expensePieData}
                                        options={{
                                            cutout: "65%",
                                            plugins: {
                                                legend: {
                                                    position: "bottom",
                                                    labels: {
                                                        color: "#1c2431",
                                                        font: { size: 13 },
                                                        padding: 16,
                                                        usePointStyle: true,
                                                        pointStyle: "circle",
                                                    },
                                                },
                                                tooltip: {
                                                    backgroundColor: "#1c2431",
                                                    titleColor: "#fff",
                                                    bodyColor: "#fff",
                                                },
                                            },
                                            responsive: true,
                                            maintainAspectRatio: false,
                                        }}
                                    />
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* RECENT TRANSACTIONS */}
                    <motion.div className="transactions-card" initial="hidden" animate="visible">
                        <div className="transactions-header">
                            <h3>
                                <CreditCard size={18} style={{ marginRight: 8, color: "#d4af37" }} />
                                Recent Transactions
                            </h3>
                        </div>
                        <div className="rt-tabs">
                            <button
                                className={`rt-tab ${activeTab === "income" ? "active" : ""}`}
                                onClick={() => setActiveTab("income")}
                            >
                                {(user.role === "admin" || user.role === "superadmin") ? "Wallet" : "Wallet"}
                            </button>
                            <button
                                className={`rt-tab ${activeTab === "expense" ? "active" : ""}`}
                                onClick={() => setActiveTab("expense")}
                            >
                                Expense
                            </button>
                        </div>
                        <div className="rt-content">
                            {activeTab === "income" ? (
                                <table className="transactions-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Category</th>
                                            <th>Branch</th>
                                            <th>Name</th>
                                            <th>Amount</th>
                                            <th>Invoice</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentTransactions.income.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="no-data">
                                                    <NoDataBox title="No Wallet Data Found" />
                                                </td>
                                            </tr>
                                        ) : (
                                            recentTransactions.income.map((t, i) => (
                                                <motion.tr key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                                                    <td>{dayjs(t.date).format("DD MMM YYYY")}</td>
                                                    <td>{t.category}</td>
                                                    <td>{t.branch}</td>
                                                    <td>{t.user_name}</td>
                                                    <td className="positive">{fmtAmt(t.amount)}</td>
                                                    <td>
                                                        {t.method && String(t.method).trim() !== "" && String(t.method).trim() !== "[]" ? (
                                                            <button className="view-invoice-btn" onClick={() => handleViewInvoice(t.method)}>
                                                                View
                                                            </button>
                                                        ) : (
                                                            <span className="no-invoice">No Invoice</span>
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="transactions-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Category</th>
                                            <th>Branch</th>
                                            <th>Spender Name</th>
                                            <th>Amount</th>
                                            <th>Invoice</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentTransactions.expense.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="no-data">
                                                    <NoDataBox title="No Expense Data Found" />
                                                </td>
                                            </tr>
                                        ) : (
                                            recentTransactions.expense.map((t, i) => (
                                                <motion.tr key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                                                    <td>{dayjs(t.date).format("DD MMM YYYY")}</td>
                                                    <td>{t.category}</td>
                                                    <td>{t.branch}</td>
                                                    <td>{t.user_name}</td>
                                                    <td className="negative">-{fmtAmt(Math.abs(t.amount))}</td>
                                                    <td>
                                                        {t.method && String(t.method).trim() !== "" && String(t.method).trim() !== "[]" ? (
                                                            <button className="view-invoice-btn" onClick={() => handleViewInvoice(t.method)}>
                                                                View
                                                            </button>
                                                        ) : (
                                                            <span className="no-invoice">No Invoice</span>
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* MODALS */}
            <AnimatePresence>
                {openModal && (
                    <Modals
                        open={!!openModal}
                        type={openModal}
                        onClose={() => setOpenModal(null)}
                        branch={branch}
                        setBranch={setBranch}
                        date={date}
                        setDate={setDate}
                        total={total}
                        setTotal={setTotal}
                        mainCategory={mainCategory}
                        setMainCategory={setMainCategory}
                        subCategory={subCategory}
                        setSubCategory={setSubCategory}
                        description={description}
                        setDescription={setDescription}
                        expenseCategories={expenseCategories}
                        incomeCategories={incomeCategories}
                    />
                )}
            </AnimatePresence>

            {showInvoiceModal && currentInvoices.length > 0 && (
                <InvoicePreviewModal
                    open={showInvoiceModal}
                    onClose={() => setShowInvoiceModal(false)}
                    invoices={currentInvoices}
                />
            )}
        </>
    );
}
