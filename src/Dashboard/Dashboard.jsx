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
    X,
    ChevronRight,
    ChevronLeft,
    FileText
} from "lucide-react";
import "../css/Dashboard.css";
import AmountDetails from "./AmountDetails";
import Filters from "../Filters/Filters";
import {
    getIncomeApi,
    getExpensesApi,
    getExpenseCategoriesApi,
    getIncomeCategoriesApi,
    getWalletEntriesApi,
} from "../../Api/action";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { FullPageLoader } from "../../Common/FullPageLoader";
import Modals from "./Modals";
import { CommonToaster } from "../../Common/CommonToaster";
dayjs.extend(isBetween);
ChartJS.register(ArcElement, ChartTooltip, Legend);

export default function Dashboard() {
    const [originalIncome, setOriginalIncome] = useState([]);
    const [originalExpenses, setOriginalExpenses] = useState([]);
    const [walletEntries, setWalletEntries] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState({});
    const [incomeCategories, setIncomeCategories] = useState([]);
    // Derived / UI state
    const [incomeData, setIncomeData] = useState([]);
    const [expenseDataDb, setExpenseDataDb] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState({ income: [], expense: [] });
    const [openModal, setOpenModal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("expense");
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [currentInvoices, setCurrentInvoices] = useState([]);
    const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState(0);
    const [branch, setBranch] = useState("Select Branch");
    const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [total, setTotal] = useState("");
    const [mainCategory, setMainCategory] = useState("Select Main Category");
    const [subCategory, setSubCategory] = useState("Select Category");
    const [description, setDescription] = useState("");
    const [vendorName, setVendorName] = useState("");
    const [vendorNumber, setVendorNumber] = useState("");
    const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [filters, setFilters] = useState({
        filterType: "date",
        compareMode: false,
        value: dayjs(),
    });
    const user = JSON.parse(localStorage.getItem("loginDetails")) || {};

    const isPDF = (src) => {
        if (!src || typeof src !== "string") return false;

        let clean = src.replace(/^"+|"+$/g, "").trim();

        return (
            clean.startsWith("data:application/pdf") ||
            clean.toLowerCase().endsWith(".pdf")
        );
    };

    // -------------------------
    // Single loader for all APIs
    // -------------------------
    const fetchOriginalData = async () => {
        try {
            setLoading(true);
            const [expCat, incCat] = await Promise.all([
                getExpenseCategoriesApi(),
                getIncomeCategoriesApi(),
            ]).catch(() => [[], []]);
            const grouped = (expCat || []).reduce((acc, item) => {
                const main = item.main_category;
                const sub = item.sub_category;
                if (!acc[main]) acc[main] = [];
                acc[main].push(sub);
                return acc;
            }, {});
            setExpenseCategories(grouped);
            setIncomeCategories((incCat || []).map((i) => i.name));
            const [incomes, expenses] = await Promise.all([
                getIncomeApi().catch(() => []),
                getExpensesApi().catch(() => []),
            ]);
            setOriginalIncome((incomes?.data) || []);
            setOriginalExpenses((expenses?.data) || []);
            if (user?.role === "user") {
                const wallets = await getWalletEntriesApi(user.id).catch(() => ({ entries: [] }));
                setWalletEntries(wallets.entries || []);
            } else {
                setWalletEntries([]);
            }
        } catch (err) {
            console.error("fetchOriginalData error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOriginalData();
    }, []);

    useEffect(() => {
        const reloadData = () => fetchOriginalData();

        window.addEventListener("incomeExpenseUpdated", reloadData);
        window.addEventListener("summaryUpdated", reloadData);
        return () => {
            window.removeEventListener("incomeExpenseUpdated", reloadData);
            window.removeEventListener("summaryUpdated", reloadData);
        };
    }, []);

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
        const BASE = import.meta.env.VITE_API_URL;
        let invoicesArray = [];
        const normalize = (item) => {
            if (!item) return null;

            let str = String(item).trim().replace(/^"+|"+$/g, "");

            if (str.startsWith("data:")) return str;
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
        setCurrentInvoiceIndex(0);
        setShowInvoiceModal(true);
    };

    const handleNextInvoice = () => {
        setCurrentInvoiceIndex((prev) =>
            prev < currentInvoices.length - 1 ? prev + 1 : prev
        );
    };

    const handlePrevInvoice = () => {
        setCurrentInvoiceIndex((prev) => (prev > 0 ? prev - 1 : prev));
    };

    const applyFilters = useCallback(
        (items) => {
            if (!filters.value || !items?.length) return items || [];
            const type = filters.filterType;
            if (!filters.compareMode) {
                return items.filter((item) => {
                    const d = dayjs(item.date);
                    if (type === "date") return d.isSame(filters.value, "day");
                    if (type === "week") return d.isSame(filters.value, "week");
                    if (type === "month") return d.isSame(filters.value, "month");
                    if (type === "year") return d.isSame(filters.value, "year");
                    return true;
                });
            }
            if (!Array.isArray(filters.value)) return items;
            const [start, end] = filters.value;
            return items.filter((item) => {
                const d = dayjs(item.date);
                if (type === "date") return d.isBetween(start, end, "day", "[]");
                if (type === "week") return d.isBetween(start, end, "week", "[]");
                if (type === "month") return d.isBetween(start, end, "month", "[]");
                if (type === "year") return d.isBetween(start, end, "year", "[]");
                return true;
            });
        },
        [filters]
    );
    const filteredIncome = useMemo(() => applyFilters(originalIncome), [originalIncome, applyFilters]);
    const filteredExpenses = useMemo(() => applyFilters(originalExpenses), [originalExpenses, applyFilters]);
    const filteredWalletEntries = useMemo(() => (user?.role === "user" ? applyFilters(walletEntries) : []), [walletEntries, applyFilters, user?.role]);

    useEffect(() => {
        setIncomeData(filteredIncome);
        setExpenseDataDb(filteredExpenses);
        let latestIncomeOrWallet = [];
        if (user.role === "admin") {
            latestIncomeOrWallet = [...filteredIncome]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map((i) => ({
                    type: "Income",
                    date: i.date,
                    amount: Number(i.total),
                    branch: i.branch,
                    category: i.category,
                    method: i.invoice,
                    description: i.description || "-",
                    color: "#B6F3C0",
                }));
        } else {
            latestIncomeOrWallet = [...filteredWalletEntries]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map((w) => ({
                    type: "Wallet",
                    date: w.date,
                    amount: Number(w.amount),
                    branch: w.branch || "-",
                    category: w.note || "Wallet",
                    method: "",
                    description: w.note || "-",
                    color: "#00C49F",
                }));
        }

        const latestExpense = [...filteredExpenses]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5)
            .map((e) => ({
                type: "Expense",
                date: e.date,
                amount: -Math.abs(Number(e.total)),
                category: e.sub_category,
                branch: e.branch,
                method: e.invoice,
                description: e.description || "-",
                color: "#FFB0B0",
            }));

        setRecentTransactions({
            income: latestIncomeOrWallet,
            expense: latestExpense,
        });
    }, [filteredIncome, filteredExpenses, filteredWalletEntries]);

    // -------------------------
    // Charts (memoized)
    // -------------------------
    const incomeChartData = useMemo(() => {
        const map = {};
        (filteredIncome || []).forEach((item) => {
            const month = dayjs(item.date).format("MMM");
            map[month] = (map[month] || 0) + Number(item.total);
        });

        return Object.keys(map).map((m) => ({ month: m, value: map[m] }));
    }, [filteredIncome]);

    const walletChartData = useMemo(() => {
        if (!user || user.role !== "user") return [];
        const map = {};
        (filteredWalletEntries || []).forEach((item) => {
            const month = dayjs(item.date).format("MMM");
            map[month] = (map[month] || 0) + Number(item.amount);
        });

        return Object.keys(map).map((m) => ({ month: m, value: map[m] }));
    }, [filteredWalletEntries, user]);

    const expensePieData = useMemo(() => {
        const latestFive = [...expenseDataDb]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        const map = {};
        latestFive.forEach((item) => {
            const cat = item.sub_category || "Other";
            map[cat] = (map[cat] || 0) + Number(item.total);
        });

        return {
            labels: Object.keys(map),
            datasets: [
                {
                    data: Object.values(map),
                    backgroundColor: [
                        "#4BC0C0",
                        "#FFCD56",
                        "#FF6384",
                        "#36A2EB",
                        "#d4af37",
                    ],
                    borderColor: "#fff",
                    borderWidth: 2,
                },
            ],
        };
    }, [expenseDataDb]);

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
            {loading ? (
                <FullPageLoader />
            ) : (
                <>
                    <Filters onFilterChange={setFilters} />
                    <div className="dashboard-container">
                        <AmountDetails
                            filteredIncome={incomeData}
                            filteredExpenses={expenseDataDb}
                            originalIncome={originalIncome}
                            originalExpenses={originalExpenses}
                            filters={filters}
                            loading={loading}
                            user={user}
                            walletEntries={walletEntries}
                        />

                        {/* QUICK ADD */}
                        <motion.div
                            className="quick-access-card"
                            initial="hidden"
                            animate="visible"
                        >
                            <h3 className="quick-access-title">Add New Records</h3>
                            <div className="quick-access-grid">
                                {[
                                    {
                                        icon: <Wallet size={18} />,
                                        label: "+ New Expense",
                                        bg: "#ff1b1bff",
                                        action: () => {
                                            setOpenModal("expense");
                                            setMainCategory("Select Main Category");
                                            setSubCategory("Select Category");
                                        },
                                    },
                                    {
                                        icon: <Receipt size={18} />,
                                        label: "+ New Income",
                                        bg: "#006b29ff",
                                        action: () => {
                                            const currentUser = JSON.parse(localStorage.getItem("loginDetails"));
                                            if (currentUser?.role !== "admin") {
                                                return CommonToaster("You do not have permission to add income", "error");
                                            }
                                            setOpenModal("income");
                                            setMainCategory("Select Main Category");
                                        },
                                    },
                                ].map((item, i) => (
                                    <div key={i} className="quick-access-item" onClick={item.action}>
                                        <div className="quick-access-icon" style={{ background: item.bg }}>
                                            {item.icon}
                                        </div>
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* CHARTS */}
                        <div className="graphs-grid">
                            <motion.div className="chart-card" initial="hidden" animate="visible">
                                <div className="chart-header">
                                    <h3>
                                        <TrendingUp size={18} style={{ marginRight: 8, color: "#d4af37" }} />
                                        {user.role === "admin" ? "Income Cash Flow" : "Wallet Cash Flow"}
                                    </h3>
                                </div>
                                {user.role === "admin" ? (
                                    incomeChartData.length === 0 ? (
                                        <NoDataBox title="No Data Found" subtitle="No Income Data available." />
                                    ) : (
                                        <ResponsiveContainer width="100%" height={260}>
                                            <AreaChart data={incomeChartData}>
                                                <defs>
                                                    <linearGradient id="incomeCashFlow" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#d4af37" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#d4af37" stopOpacity={0.1} />
                                                    </linearGradient>
                                                </defs>

                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                                                <XAxis dataKey="month" stroke="#1c2431" fontSize={12} tickLine={false} />
                                                <YAxis stroke="#1c2431" fontSize={12} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: "#1c2431",
                                                        borderRadius: "10px",
                                                        border: "1px solid #d4af37",
                                                        color: "#fff",
                                                    }}
                                                />
                                                <Area type="monotone" dataKey="value" stroke="#d4af37" strokeWidth={3} fill="url(#incomeCashFlow)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )
                                ) : (
                                    walletChartData.length === 0 ? (
                                        <NoDataBox title="No Data Found" subtitle="No Wallet Data available." />
                                    ) : (
                                        <ResponsiveContainer width="100%" height={260}>
                                            <AreaChart data={walletChartData}>
                                                <defs>
                                                    <linearGradient id="walletCashFlow" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#009688" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#009688" stopOpacity={0.1} />
                                                    </linearGradient>
                                                </defs>

                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                                                <XAxis dataKey="month" stroke="#1c2431" fontSize={12} tickLine={false} />
                                                <YAxis stroke="#1c2431" fontSize={12} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: "#1c2431",
                                                        borderRadius: "10px",
                                                        border: "1px solid #009688",
                                                        color: "#fff",
                                                    }}
                                                />
                                                <Area type="monotone" dataKey="value" stroke="#009688" strokeWidth={3} fill="url(#walletCashFlow)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )
                                )}
                            </motion.div>

                            {/* MODALS */}
                            <AnimatePresence>
                                <Modals
                                    open={openModal}
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
                                    vendorName={vendorName}
                                    setVendorName={setVendorName}
                                    vendorNumber={vendorNumber}
                                    setVendorNumber={setVendorNumber}
                                    endDate={endDate}
                                    setEndDate={setEndDate}
                                />
                            </AnimatePresence>

                            {/* Expense Breakdown */}
                            <motion.div className="chart-card" initial="hidden" animate="visible">
                                <div className="chart-header">
                                    <h3>
                                        <PieChart size={18} style={{ marginRight: 8, color: "#d4af37" }} />
                                        Expense Breakdown
                                    </h3>
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
                                    {user.role === "admin" ? "Income" : "Wallet"}
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
                                                <th>Amount</th>
                                                <th>Invoice</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentTransactions.income.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="no-data">
                                                        <NoDataBox title="No Income Data Found" />
                                                    </td>
                                                </tr>
                                            ) : (
                                                recentTransactions.income.map((t, i) => (
                                                    <motion.tr key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                                                        <td>{dayjs(t.date).format("DD MMM YYYY")}</td>
                                                        <td>{t.category}</td>
                                                        <td>{t.branch}</td>
                                                        <td className="positive">₹{Number(t.amount).toLocaleString()}</td>
                                                        <td>
                                                            {t.method ? (
                                                                <button className="view-invoice-btn" onClick={() => handleViewInvoice(t.method)}>
                                                                    View
                                                                </button>
                                                            ) : (
                                                                <span className="no-invoice">No File</span>
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
                                                <th>Amount</th>
                                                <th>Invoice</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentTransactions.expense.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="no-data">
                                                        <NoDataBox title="No Expense Data Found" />
                                                    </td>
                                                </tr>
                                            ) : (
                                                recentTransactions.expense.map((t, i) => (
                                                    <motion.tr key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                                                        <td>{dayjs(t.date).format("DD MMM YYYY")}</td>
                                                        <td>{t.category}</td>
                                                        <td>{t.branch}</td>
                                                        <td className="negative">-₹{Math.abs(t.amount)}</td>
                                                        <td>
                                                            {t.method ? (
                                                                <button className="view-invoice-btn" onClick={() => handleViewInvoice(t.method)}>
                                                                    View
                                                                </button>
                                                            ) : (
                                                                <span className="no-invoice">No File</span>
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
                </>
            )}
            {showInvoiceModal && currentInvoices.length > 0 && (
                <div
                    className="invoice-modal-backdrop"
                    onClick={() => setShowInvoiceModal(false)}
                >
                    <div
                        className="invoice-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 15
                            }}
                        >
                            <h3>
                                Invoice Preview ({currentInvoiceIndex + 1} of {currentInvoices.length})
                            </h3>
                            <button
                                className="close-modal-btn"
                                onClick={() => setShowInvoiceModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ position: "relative", textAlign: "center" }}>
                            {currentInvoices.length > 1 && currentInvoiceIndex > 0 && (
                                <button
                                    className="invoice-nav-btn-left"
                                    onClick={handlePrevInvoice}
                                >
                                    <ChevronLeft size={24} color="white" />
                                </button>
                            )}
                            {isPDF(currentInvoices[currentInvoiceIndex]) ? (
                                <div
                                    style={{
                                        width: "auto",
                                        height: "500px",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: "#f5f5f5",
                                        borderRadius: 10
                                    }}
                                >
                                    <FileText size={80} color="#666" />
                                    <p style={{ marginTop: 20, fontSize: 16, color: "#666" }}>
                                        PDF Document
                                    </p>
                                    <a
                                        href={currentInvoices[currentInvoiceIndex]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            marginTop: 10,
                                            fontSize: 14,
                                            color: "#d4af37",
                                            textDecoration: "underline",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Open in New Tab
                                    </a>
                                </div>
                            ) : (
                                <img
                                    src={currentInvoices[currentInvoiceIndex]}
                                    alt="Invoice"
                                    style={{
                                        borderRadius: 10,
                                        objectFit: "contain",
                                        width: "500px",
                                        height: "450px"
                                    }}
                                />
                            )}
                            {currentInvoices.length > 1 &&
                                currentInvoiceIndex < currentInvoices.length - 1 && (
                                    <button
                                        className="invoice-nav-btn-right"
                                        onClick={handleNextInvoice}
                                    >
                                        <ChevronRight size={24} color="white" />
                                    </button>
                                )}
                        </div>

                        {/* Dots Indicator */}
                        {currentInvoices.length > 1 && (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    gap: 8,
                                    marginTop: 20
                                }}
                            >
                                {currentInvoices.map((_, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setCurrentInvoiceIndex(idx)}
                                        style={{
                                            width: idx === currentInvoiceIndex ? 24 : 8,
                                            height: 8,
                                            borderRadius: 4,
                                            background:
                                                idx === currentInvoiceIndex ? "#d4af37" : "#ccc",
                                            cursor: "pointer",
                                            transition: "0.3s"
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
