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
    // Raw DB Data (fetched once)
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
    const [invoiceSrc, setInvoiceSrc] = useState(null);

    const [branch, setBranch] = useState("Select Branch");
    const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [total, setTotal] = useState("");
    const [mainCategory, setMainCategory] = useState("Select Main Category");
    const [subCategory, setSubCategory] = useState("Select Category");
    const [description, setDescription] = useState("");

    const [filters, setFilters] = useState({
        filterType: "date",
        compareMode: false,
        value: dayjs(),
    });

    const user = JSON.parse(localStorage.getItem("loginDetails")) || {};

    // -------------------------
    // Single loader for all APIs
    // -------------------------
    const fetchOriginalData = useCallback(async () => {
        try {
            setLoading(true);

            // fetch categories in parallel
            const [expCat, incCat] = await Promise.all([
                getExpenseCategoriesApi(),
                getIncomeCategoriesApi(),
            ]).catch(() => [[], []]); // tolerate failures

            // group expense categories
            const grouped = (expCat || []).reduce((acc, item) => {
                const main = item.main_category;
                const sub = item.sub_category;
                if (!acc[main]) acc[main] = [];
                acc[main].push(sub);
                return acc;
            }, {});

            setExpenseCategories(grouped);
            setIncomeCategories((incCat || []).map((i) => i.name));

            // fetch incomes and expenses in parallel
            const [incomes, expenses] = await Promise.all([
                getIncomeApi().catch(() => []),
                getExpensesApi().catch(() => []),
            ]);

            setOriginalIncome(incomes || []);
            setOriginalExpenses(expenses || []);

            // wallet only for user role
            if (user?.role === "user") {
                const wallets = await getWalletEntriesApi(user.id).catch(() => []);
                setWalletEntries(wallets || []);
            } else {
                setWalletEntries([]);
            }
        } catch (err) {
            console.error("fetchOriginalData error:", err);
        } finally {
            setLoading(false);
        }
    }, [user?.role, user?.id]);

    // load once on mount
    useEffect(() => {
        fetchOriginalData();
    }, [fetchOriginalData]);

    // reload hooks used by other parts of app
    useEffect(() => {
        const reloadData = () => fetchOriginalData();

        window.addEventListener("incomeExpenseUpdated", reloadData);
        window.addEventListener("summaryUpdated", reloadData);

        return () => {
            window.removeEventListener("incomeExpenseUpdated", reloadData);
            window.removeEventListener("summaryUpdated", reloadData);
        };
    }, [fetchOriginalData]);

    // open modal triggers
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

    const handleViewInvoice = (fileName) => {
        if (!fileName) return;
        const url = `${import.meta.env.VITE_API_URL}/uploads/invoices/${fileName}`;

        if (fileName.toLowerCase().endsWith(".pdf")) {
            window.open(url, "_blank");
            return;
        }
        setInvoiceSrc(url);
        setShowInvoiceModal(true);
    };

    // -------------------------
    // Filtering (memoized)
    // -------------------------
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

            // compare mode expects an array [start, end]
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

    // derive filtered arrays via memo (fast)
    const filteredIncome = useMemo(() => applyFilters(originalIncome), [originalIncome, applyFilters]);
    const filteredExpenses = useMemo(() => applyFilters(originalExpenses), [originalExpenses, applyFilters]);
    const filteredWalletEntries = useMemo(() => (user?.role === "user" ? applyFilters(walletEntries) : []), [walletEntries, applyFilters, user?.role]);

    // reflect filtered arrays into local state used by child components
    useEffect(() => {
        setIncomeData(filteredIncome);
        setExpenseDataDb(filteredExpenses);

        let latestIncomeOrWallet = [];

        if (user.role === "admin") {
            // ADMIN → show Income
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
            // USER → show Wallet
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

    // -------------------------
    // UI animation
    // -------------------------
    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6 },
        },
    };

    return (
        <>
            {loading ? (
                <FullPageLoader />
            ) : (
                <>
                    <Filters onFilterChange={setFilters} />

                    <div className="dashboard-container">
                        {/* TOP CARDS */}
                        <AmountDetails
                            filteredIncome={incomeData}
                            filteredExpenses={expenseDataDb}
                            originalIncome={originalIncome}
                            originalExpenses={originalExpenses}
                            filters={filters}
                            loading={loading}
                            user={user}
                        />

                        {/* QUICK ADD */}
                        <motion.div
                            className="quick-access-card"
                            variants={fadeUp}
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
                            {/* Cash Flow (Income for admin, Wallet for user) */}
                            <motion.div className="chart-card" variants={fadeUp} initial="hidden" animate="visible">
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
                                />
                            </AnimatePresence>

                            {/* Expense Breakdown */}
                            <motion.div className="chart-card" variants={fadeUp} initial="hidden" animate="visible">
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
                        <motion.div className="transactions-card" variants={fadeUp} initial="hidden" animate="visible">
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
                                                                "-"
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
                                                                "-"
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
            {showInvoiceModal && (
                <div className="invoice-modal-backdrop" onClick={() => setShowInvoiceModal(false)}>
                    <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Invoice Preview</h3>
                        <div style={{ right: 15, top: 0, position: "absolute" }}>
                            <button className="close-modal-btn" onClick={() => setShowInvoiceModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <img src={invoiceSrc} alt="Invoice" style={{ width: "70%", borderRadius: 10 }} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
