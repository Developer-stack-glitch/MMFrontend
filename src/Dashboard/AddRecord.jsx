import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Chart as ChartJS,
    ArcElement,
    RadialLinearScale,
    Tooltip as ChartTooltip,
    Legend,
} from "chart.js";
import { PolarArea } from "react-chartjs-2";
import "../css/Dashboard.css";
import dayjs from "dayjs";
import {
    Receipt,
    FileText,
    Wallet,
    Plane,
    TrendingUp,
} from "lucide-react";
import {
    BarChart,
    Bar,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import AmountDetails from "./AmountDetails";
import Filters from "../Filters/Filters";
import Modals from "./Modals";
import {
    getExpenseCategoriesApi,
    getIncomeCategoriesApi,
    getExpensesApi,
    getIncomeApi,
} from "../../Api/action";

ChartJS.register(ArcElement, RadialLinearScale, ChartTooltip, Legend);

export default function AddRecord() {
    const [openModal, setOpenModal] = useState(null);
    const [branch, setBranch] = useState("Select Branch");
    const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [total, setTotal] = useState("");
    const [mainCategory, setMainCategory] = useState("Select Main Category");
    const [subCategory, setSubCategory] = useState("Select Category");
    const [description, setDescription] = useState("");
    const [expenseCategories, setExpenseCategories] = useState({});
    const [incomeCategories, setIncomeCategories] = useState([]);

    const [incomeChartData, setIncomeChartData] = useState([]);
    const [expenseChartData, setExpenseChartData] = useState({
        labels: [],
        datasets: [],
    });

    const [incomeData, setIncomeData] = useState([]);
    const [expenseData, setExpenseData] = useState([]);

    const [filters, setFilters] = useState({
        filterType: "year",
        compareMode: false,
        value: dayjs(),
    });

    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    };

    // ✅ FILTER HANDLER
    const applyFilters = (items) => {
        if (!filters.value) return items;

        const type = filters.filterType;

        // ✅ NORMAL MODE
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

        // ✅ COMPARE MODE
        if (!Array.isArray(filters.value) || filters.value.length !== 2) return [];

        const [start, end] = filters.value;

        return items.filter((item) => {
            const d = dayjs(item.date);

            if (type === "date") return d.isBetween(start, end, "day", "[]");
            if (type === "week") return d.isBetween(start, end, "week", "[]");
            if (type === "month") return d.isBetween(start, end, "month", "[]");
            if (type === "year") return d.isBetween(start, end, "year", "[]");

            return true;
        });
    };

    // ✅ LOAD EVERYTHING WHEN FILTER CHANGES
    useEffect(() => {
        async function loadCategories() {
            const exp = await getExpenseCategoriesApi();
            const inc = await getIncomeCategoriesApi();

            const grouped = exp.reduce((acc, item) => {
                const main = item.main_category;
                const sub = item.sub_category;
                if (!acc[main]) acc[main] = [];
                acc[main].push(sub);
                return acc;
            }, {});

            setExpenseCategories(grouped);
            setIncomeCategories(inc.map((item) => item.name));
        }

        async function loadChartData() {
            let incomeRes = await getIncomeApi();
            let expenseRes = await getExpensesApi();

            // ✅ APPLY FILTERS
            incomeRes = applyFilters(incomeRes);
            expenseRes = applyFilters(expenseRes);

            setIncomeData(incomeRes);
            setExpenseData(expenseRes);

            // ✅ INCOME CHART (SAFE)
            const incomeByMonth = incomeRes.reduce((acc, item) => {
                const month = dayjs(item.date).format("MMM");
                acc[month] = (acc[month] || 0) + Number(item.total);
                return acc;
            }, {});

            setIncomeChartData(
                Object.keys(incomeByMonth).map((month) => ({
                    month,
                    amount: incomeByMonth[month],
                }))
            );

            // ✅ EXPENSE CHART (SUPER SAFE)
            const expenseGrouped = expenseRes.reduce((acc, item) => {
                const category = item.main_category;
                acc[category] = (acc[category] || 0) + Number(item.total);
                return acc;
            }, {});

            const labels = Object.keys(expenseGrouped);
            const values = Object.values(expenseGrouped);

            setExpenseChartData(
                labels.length === 0
                    ? { labels: [], datasets: [] }
                    : {
                        labels,
                        datasets: [
                            {
                                label: "Expenses",
                                data: values,
                                backgroundColor: [
                                    "rgb(255, 99, 132)",
                                    "rgb(75, 192, 192)",
                                    "rgb(255, 205, 86)",
                                    "rgb(201, 203, 207)",
                                    "rgb(54, 162, 235)",
                                    "rgb(153, 102, 255)",
                                ],
                                borderColor: "#fff",
                                borderWidth: 2,
                            },
                        ],
                    }
            );
        }

        loadChartData();
        loadCategories();
    }, [filters]);

    return (
        <>
            <Filters onFilterChange={setFilters} />

            <div className="dashboard-container">
                {/* QUICK ACTIONS */}
                <motion.div className="quick-access-card" variants={fadeUp}>
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
                                    setOpenModal("income");
                                    setMainCategory("Select Main Category");
                                },
                            },
                            { icon: <FileText size={18} />, label: "+ Create report", bg: "#392f89" },
                            { icon: <Plane size={18} />, label: "+ Create trip", bg: "#8b1e2d" },
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

                {/* ✅ AMOUNT SUMMARY */}
                <AmountDetails
                    filteredIncome={incomeData}
                    filteredExpenses={expenseData}
                    originalIncome={incomeData}
                    originalExpenses={expenseData}
                    filters={filters}
                />

                {/* ✅ MODALS */}
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

                {/* ✅ CHARTS */}
                <div style={{ gridTemplateColumns: "1fr 1fr" }} className="graphs-grid">

                    {/* ✅ INCOME CHART */}
                    <motion.div className="chart-card" variants={fadeUp}>
                        <div className="chart-header">
                            <h3>
                                <TrendingUp size={18} style={{ marginRight: 8, color: "#d4af37" }} />
                                Income Breakdown
                            </h3>
                        </div>

                        {incomeChartData.length === 0 ? (
                            <div className="no-data-box">
                                <img
                                    src="https://cdn-icons-png.flaticon.com/512/4076/4076503.png"
                                    alt="no data"
                                    className="no-data-img"
                                />
                                <h3>No Data Found</h3>
                                <p>No Income Data available.</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={incomeChartData}>
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
                                        itemStyle={{ color: "#d4af37" }}
                                    />
                                    <Bar dataKey="amount" fill="#d4af37" radius={[6, 6, 0, 0]} barSize={65} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </motion.div>

                    {/* ✅ EXPENSE CHART */}
                    <motion.div className="chart-card" variants={fadeUp}>
                        <div className="chart-header">
                            <h3>
                                <TrendingUp size={18} style={{ marginRight: 8, color: "#d4af37" }} />
                                Expense Breakdown
                            </h3>
                        </div>

                        {expenseChartData.datasets.length === 0 ? (
                            <div className="no-data-box">
                                <img
                                    src="https://cdn-icons-png.flaticon.com/512/4076/4076503.png"
                                    alt="no data"
                                    className="no-data-img"
                                />
                                <h3>No Data Found</h3>
                                <p>No Expense Data available.</p>
                            </div>
                        ) : (
                            <div className="chart-wrapper">
                                <PolarArea
                                    data={expenseChartData}
                                    options={{
                                        scales: {
                                            r: {
                                                ticks: { color: "#1c2431" },
                                                grid: { color: "rgba(0,0,0,0.1)" },
                                            },
                                        },
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
                                        },
                                        responsive: true,
                                        maintainAspectRatio: false,
                                    }}
                                />
                            </div>
                        )}
                    </motion.div>

                </div>
            </div>
        </>
    );
}
