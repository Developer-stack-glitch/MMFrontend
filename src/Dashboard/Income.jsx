import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
    Edit,
    Trash2,
    MoreHorizontal,
    Minimize2
} from "lucide-react";
import "../css/Dashboard.css";
import { Popconfirm, Dropdown, Menu } from "antd";
import "../css/Calendar.css";
import AmountDetails from "./AmountDetails";
import Filters from "../Filters/Filters";
import {
    getExpenseCategoriesApi,
    getIncomeApi,
    safeGetLocalStorage,
    getIncomeCategoriesApi,
    deleteIncomeApi,
    getDashboardStatsApi,
    getDashboardChartsApi
} from "../../Api/action";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import IncomeSkeleton from "./IncomeSkeleton";

import Modals from "./Modals";
import { CommonToaster } from "../../Common/CommonToaster";
import InvoicePreviewModal from "../Common/InvoicePreviewModal";
dayjs.extend(isBetween);
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

const fmtAmt = (n) => {
    const val = Number(String(n ?? 0).replace(/[^0-9.-]+/g, "")) || 0;
    return `₹${val.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

export default function Income() {
    const [incomeTransactions, setIncomeTransactions] = useState([]);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [walletChartData, setWalletChartData] = useState([]);
    const [expenseData, setExpenseData] = useState([]);

    const [expenseCategories, setExpenseCategories] = useState({});
    const [incomeCategories, setIncomeCategories] = useState([]);

    const [openModal, setOpenModal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [currentInvoices, setCurrentInvoices] = useState([]);

    // Modal State
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

    const [isEdit, setIsEdit] = useState(false);
    const [editData, setEditData] = useState(null);
    const [showAllBreakdown, setShowAllBreakdown] = useState(false);
    const user = safeGetLocalStorage("loginDetails", {});
    const isFirstRun = useRef(true);

    // Load categories once
    const loadCategories = async () => {
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
        } catch (err) {
            console.error("loadCategories error:", err);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const refreshIncomeData = useCallback(async () => {
        if (!filters.value) return;
        setLoading(true);
        try {
            let startDate, endDate, prevStartDate, prevEndDate;

            if (filters.compareMode && Array.isArray(filters.value)) {
                startDate = filters.value[0].format("YYYY-MM-DD");
                endDate = filters.value[1].format("YYYY-MM-DD");
            } else {
                const selected = dayjs(filters.value);
                const type = filters.filterType;

                if (type === "date") {
                    startDate = selected.format("YYYY-MM-DD");
                    endDate = selected.format("YYYY-MM-DD");
                    prevStartDate = selected.subtract(1, "day").format("YYYY-MM-DD");
                    prevEndDate = selected.subtract(1, "day").format("YYYY-MM-DD");
                } else if (type === "week") {
                    startDate = selected.startOf("week").format("YYYY-MM-DD");
                    endDate = selected.endOf("week").format("YYYY-MM-DD");
                    prevStartDate = selected.subtract(1, "week").startOf("week").format("YYYY-MM-DD");
                    prevEndDate = selected.subtract(1, "week").endOf("week").format("YYYY-MM-DD");
                } else if (type === "month") {
                    startDate = selected.subtract(1, "month").date(26).format("YYYY-MM-DD");
                    endDate = selected.date(25).format("YYYY-MM-DD");
                    prevStartDate = selected.subtract(2, "month").date(26).format("YYYY-MM-DD");
                    prevEndDate = selected.subtract(1, "month").date(25).format("YYYY-MM-DD");
                } else if (type === "year") {
                    startDate = selected.startOf("year").format("YYYY-MM-DD");
                    endDate = selected.endOf("year").format("YYYY-MM-DD");
                    prevStartDate = selected.subtract(1, "year").startOf("year").format("YYYY-MM-DD");
                    prevEndDate = selected.subtract(1, "year").endOf("year").format("YYYY-MM-DD");
                }
            }

            const queryFilters = { startDate, endDate, prevStartDate, prevEndDate };

            const [stats, charts, income] = await Promise.all([
                getDashboardStatsApi(queryFilters),
                getDashboardChartsApi({ startDate, endDate }),
                getIncomeApi(1, 500, { startDate, endDate }) // Fetch up to 500 for the list
            ]);

            setDashboardStats(stats);
            setWalletChartData(charts.walletData || []);
            setExpenseData(charts.expenseData || []);
            setIncomeTransactions(income.data || []);

        } catch (err) {
            console.error("refreshIncomeData error:", err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        refreshIncomeData();
    }, [refreshIncomeData]);


    const expensePieData = useMemo(() => {
        const sortedEntries = (expenseData || [])
            .sort((a, b) => b.value - a.value);

        const totalCategories = sortedEntries.length;
        const displayedEntries = showAllBreakdown ? sortedEntries : sortedEntries.slice(0, 5);

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
    }, [expenseData, showAllBreakdown]);

    useEffect(() => {
        const reloadData = () => refreshIncomeData();
        window.addEventListener("incomeExpenseUpdated", reloadData);
        window.addEventListener("summaryUpdated", reloadData);
        return () => {
            window.removeEventListener("incomeExpenseUpdated", reloadData);
            window.removeEventListener("summaryUpdated", reloadData);
        };
    }, [refreshIncomeData]);

    const handleViewInvoice = (invoiceData) => {
        if (!invoiceData) return;
        const BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
        let invoicesArray = [];
        const normalize = (item) => {
            if (!item) return null;
            let str = String(item).trim().replace(/^"+|"+$/g, "");
            if (str.startsWith("data:")) return str;
            if (str.startsWith("http") || str.startsWith("/uploads")) return str.startsWith("http") ? str : `${BASE}${str}`;
            return `${BASE}/uploads/invoices/${str}`;
        };
        if (Array.isArray(invoiceData)) {
            invoicesArray = invoiceData.map(normalize).filter(Boolean);
        } else if (typeof invoiceData === "string" && invoiceData.startsWith("[")) {
            try {
                const parsed = JSON.parse(invoiceData);
                if (Array.isArray(parsed)) invoicesArray = parsed.map(normalize).filter(Boolean);
            } catch { }
        }
        if (!invoicesArray.length) invoicesArray = [normalize(invoiceData)].filter(Boolean);
        if (!invoicesArray.length) return;
        setCurrentInvoices(invoicesArray);
        setShowInvoiceModal(true);
    };

    const handleEditIncome = (income) => {
        setEditData(income);
        setBranch(income.branch);
        setDate(dayjs(income.date).format("YYYY-MM-DD"));
        setTotal(income.total);
        setMainCategory(income.category);
        setDescription(income.description);
        setIsEdit(true);
        setOpenModal("edit-income");
    };

    const handleDeleteIncome = async (id) => {
        try {
            await deleteIncomeApi(id);
            CommonToaster("Income deleted successfully", "success");
            refreshIncomeData();
        } catch (err) {
            CommonToaster(err.message || "Failed to delete income", "error");
        }
    };

    const NoDataBox = ({ title = "No Data Found", subtitle = "" }) => (
        <div className="no-data-box">
            <img src="https://cdn-icons-png.flaticon.com/512/4076/4076503.png" alt="no data" className="no-data-img" />
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
                        stats={dashboardStats}
                        filters={filters}
                        loading={loading}
                        user={user}
                    />

                    {/* ACTIONS */}
                    <motion.div className="quick-access-card" initial="hidden" animate="visible">
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
                            <div className="chart-wrapper">
                                {walletChartData.length === 0 ? (
                                    <NoDataBox title="No Data Found" subtitle="No Income Data available." />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={walletChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#009688" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#009688" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} tickFormatter={(val) => Math.round(val)} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: "#1c2431", borderRadius: "8px", border: "none", color: "#fff" }}
                                                itemStyle={{ color: "#fff" }}
                                                formatter={(val) => [fmtAmt(val), "Income"]}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#009688" strokeWidth={3} fill="url(#colorIncome)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </motion.div>

                        <motion.div className="chart-card" initial="hidden" animate="visible">
                            <div className="chart-header">
                                <h3>
                                    <PieChart size={18} style={{ marginRight: 8, color: "#d4af37" }} />
                                    Expense Breakdown
                                </h3>
                                {expensePieData.hasMore && (
                                    <button
                                        onClick={() => setShowAllBreakdown(!showAllBreakdown)}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "#6b7280",
                                            display: "flex",
                                            alignItems: "center"
                                        }}
                                        title={showAllBreakdown ? "Show Less" : "Show All"}
                                    >
                                        {showAllBreakdown ? <Minimize2 size={18} /> : <MoreHorizontal size={18} />}
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
                                                    labels: { color: "#1c2431", font: { size: 13 }, padding: 16, usePointStyle: true, pointStyle: "circle" },
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

                    {/* TRANSACTIONS */}
                    <motion.div className="transactions-card" initial="hidden" animate="visible">
                        <div className="transactions-header">
                            <h3>
                                <CreditCard size={18} style={{ marginRight: 8, color: "#d4af37" }} />
                                Income Transactions
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
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {incomeTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="no-data">
                                                <NoDataBox title="No Income Data Found" />
                                            </td>
                                        </tr>
                                    ) : (
                                        incomeTransactions.map((t, i) => (
                                            <motion.tr key={t.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.02 }}>
                                                <td>{dayjs(t.date).format("DD MMM YYYY")}</td>
                                                <td>{t.category}</td>
                                                <td>{t.branch}</td>
                                                <td>{t.user_name}</td>
                                                <td className="positive">{fmtAmt(t.total)}</td>
                                                <td>
                                                    {t.invoice && String(t.invoice).trim() !== "" && String(t.invoice).trim() !== "[]" ? (
                                                        <button className="view-invoice-btn" onClick={() => handleViewInvoice(t.invoice)}>View</button>
                                                    ) : (
                                                        <span className="no-invoice">No Invoice</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ display: "flex", gap: "8px" }}>
                                                        <button className="edit-btn" onClick={() => handleEditIncome(t)}><Edit size={16} /></button>
                                                        <Popconfirm title="Delete this item?" onConfirm={() => handleDeleteIncome(t.id)} okText="Yes" cancelText="No">
                                                            <button className="edit-btn" style={{ color: '#ff4d4f' }}><Trash2 size={16} /></button>
                                                        </Popconfirm>
                                                    </div>
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

            {/* MODALS */}
            <AnimatePresence>
                {openModal && (
                    <Modals
                        open={!!openModal}
                        type={openModal}
                        onClose={() => {
                            setOpenModal(null);
                            setIsEdit(false);
                            setEditData(null);
                        }}
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
                        isEdit={isEdit}
                        editData={editData}
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
