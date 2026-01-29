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
} from "lucide-react";
import "../css/Dashboard.css";
import "../css/Calendar.css";
import AmountDetails from "./AmountDetails";
import Filters from "../Filters/Filters";
import {
    getExpenseCategoriesApi,
    getWalletEntriesApi,
    getIncomeApi,
    getExpensesApi,
    getAllWalletTransactionsApi,
    safeGetLocalStorage,
    getIncomeCategoriesApi
} from "../../Api/action";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import IncomeSkeleton from "./IncomeSkeleton";

import Modals from "./Modals";
import { CommonToaster } from "../../Common/CommonToaster";
import InvoicePreviewModal from "../Common/InvoicePreviewModal";
dayjs.extend(isBetween);
ChartJS.register(ArcElement, ChartTooltip, Legend);

export default function Income() {
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
    const [activeTab, setActiveTab] = useState("income");
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [currentInvoices, setCurrentInvoices] = useState([]);
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
    const user = safeGetLocalStorage("loginDetails", {});

    // -------------------------
    // Single loader for all APIs
    // -------------------------
    const fetchOriginalData = async () => {
        try {
            setLoading(true);
            const [incomeRes, expenseRes, expCat, incCat] = await Promise.all([
                getIncomeApi(1, 10000),
                getExpensesApi(1, 10000),
                getExpenseCategoriesApi(),
                getIncomeCategoriesApi()
            ]).catch(() => [{}, {}, {}, []]);

            const grouped = (expCat || []).reduce((acc, item) => {
                const main = item.main_category;
                const sub = item.sub_category;
                if (!acc[main]) acc[main] = [];
                acc[main].push(sub);
                return acc;
            }, {});
            setExpenseCategories(grouped);
            setIncomeCategories(incCat || []);

            setOriginalIncome(incomeRes.data || []);
            setOriginalExpenses(expenseRes.data || []);

            // Wallet entries logic kept for reference, though Income page now focuses on Income API
            if (user?.role === "user") {
                const wallets = await getWalletEntriesApi(user.id).catch(() => ({ entries: [] }));
                setWalletEntries(wallets.entries || []);
            } else if (user?.role === "admin") {
                const allWallets = await getAllWalletTransactionsApi().catch(() => ({ entries: [] }));
                setWalletEntries(allWallets.entries || []);
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
    const filteredWalletEntries = useMemo(() => applyFilters(walletEntries), [walletEntries, applyFilters]);

    useEffect(() => {
        setIncomeData(filteredIncome);
        setExpenseDataDb(filteredExpenses);
        let latestIncomeOrWallet = [];

        // Filter only approved approvals for the Wallet/Income tab


        let latestExpense = [];

        if (user.role === "admin") {
            // Admin: Use filtered income from API
            latestIncomeOrWallet = [...filteredIncome]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map((i) => ({
                    type: "Income",
                    date: i.date,
                    amount: Number(i.total),
                    branch: i.branch,
                    category: i.category || "-",
                    method: i.invoice,
                    description: i.description || "-",
                    user_name: i.user_name || "-",
                    color: "#B6F3C0",
                }));
        } else {
            // User: Use filtered income from API
            latestIncomeOrWallet = [...filteredIncome]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map((w) => ({
                    type: "Income",
                    date: w.date,
                    amount: Number(w.total),
                    branch: w.branch || "-",
                    category: w.category || "Income",
                    method: w.invoice || "",
                    description: w.description || "-",
                    user_name: w.user_name || "-",
                    color: "#00C49F",
                }));

            // Revert to showing only Expenses table data for "Expense" tab
            latestExpense = [...filteredExpenses]
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
                    user_name: e.user_name || "-",
                    color: "#FFB0B0",
                }));
        }

        setRecentTransactions({
            income: latestIncomeOrWallet,
            expense: user.role === "admin" ? [...filteredExpenses]
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
                    user_name: e.user_name || "-",
                    color: "#FFB0B0",
                })) : latestExpense,
        });
    }, [filteredIncome, filteredExpenses, filteredWalletEntries]);

    // -------------------------
    // Charts (memoized)
    // -------------------------
    const walletChartData = useMemo(() => {
        const map = {};
        (filteredIncome || [])
            .forEach((item) => {
                const month = dayjs(item.date).format("MMM");
                map[month] = (map[month] || 0) + Number(item.total);
            });

        return Object.keys(map).map((m) => ({ month: m, value: map[m] }));
    }, [filteredIncome]);

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
            <Filters onFilterChange={setFilters} />
            {loading ? (
                <IncomeSkeleton />
            ) : (

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
                        useFilteredIncome={true}
                    />

                    {/* QUICK ADD */}
                    <motion.div
                        className="quick-access-card"
                        initial="hidden"
                        animate="visible"
                    >
                        <h3 className="quick-access-title">Income Actions</h3>
                        <div className="quick-access-grid">
                            <div className="quick-access-item" onClick={() => {
                                setOpenModal("income");
                                setMainCategory("Select Main Category");
                                setSubCategory("Select Category");
                            }}>
                                <div className="quick-access-icon" style={{ background: "#006b29ff" }}>
                                    <Wallet size={18} />
                                </div>
                                <span>+ Add Income</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* CHARTS */}
                    <div className="graphs-grid">
                        <motion.div className="chart-card" initial="hidden" animate="visible">
                            <div className="chart-header">
                                <h3>
                                    <TrendingUp size={18} style={{ marginRight: 8, color: "#d4af37" }} />
                                    Income Flow
                                </h3>
                            </div>
                            {walletChartData.length === 0 ? (
                                <NoDataBox title="No Data Found" subtitle="No Income Data available." />
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

                        {/* Expense Breakdown / Flow */}
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
                                Recent Income Transactions
                            </h3>
                        </div>

                        <div className="rt-content">
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
                                                <NoDataBox title="No Income Data Found" />
                                            </td>
                                        </tr>
                                    ) : (
                                        recentTransactions.income.map((t, i) => (
                                            <motion.tr key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                                                <td>{dayjs(t.date).format("DD MMM YYYY")}</td>
                                                <td>{t.category}</td>
                                                <td>{t.branch}</td>
                                                <td>{t.user_name}</td>
                                                <td className="positive">₹{Number(t.amount).toLocaleString()}</td>
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
                        </div>
                    </motion.div>
                </div>
            )}
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
