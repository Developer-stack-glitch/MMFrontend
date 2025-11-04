import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";

import "../css/Dashboard.css";
import AmountDetails from "./AmountDetails";
import Filters from "../Filters/Filters";

import { getIncomeApi, getExpensesApi } from "../../Api/action";

import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

ChartJS.register(ArcElement, ChartTooltip, Legend);

export default function Dashboard() {
    const [incomeData, setIncomeData] = useState([]);
    const [expenseDataDb, setExpenseDataDb] = useState([]);

    const [originalIncome, setOriginalIncome] = useState([]);
    const [originalExpenses, setOriginalExpenses] = useState([]);

    const [recentTransactions, setRecentTransactions] = useState([]);

    const [filters, setFilters] = useState({
        filterType: "date",
        compareMode: false,
        value: dayjs(),
    });

    useEffect(() => {
        loadDashboardData();
    }, [filters]);

    const loadDashboardData = async () => {
        let incomes = await getIncomeApi();
        let expenses = await getExpensesApi();

        // Save original
        setOriginalIncome(incomes);
        setOriginalExpenses(expenses);

        // Apply filters
        incomes = applyFilters(incomes);
        expenses = applyFilters(expenses);

        setIncomeData(incomes || []);
        setExpenseDataDb(expenses || []);

        // Build recent transactions
        const latestIncome = incomes
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3)
            .map((i) => ({
                type: "Income",
                date: i.date,
                amount: i.total,
                category: i.category,
                method: "Bank / Card",
                description: i.description,
                color: "#B6F3C0",
            }));

        const latestExpense = expenses
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3)
            .map((e) => ({
                type: "Expense",
                date: e.date,
                amount: -Math.abs(e.total),
                category: e.sub_category,
                method: "Expense",
                description: e.description,
                color: "#FFB0B0",
            }));

        const combined = [...latestIncome, ...latestExpense].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );

        setRecentTransactions(combined);
    };

    const applyFilters = (items) => {
        if (!filters.value) return items;

        const type = filters.filterType;

        // -----------------------------
        // ✅ SIMPLE MODE (NO COMPARE)
        // -----------------------------
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

        if (!Array.isArray(filters.value) || filters.value.length !== 2) {
            return [];
        }

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

    // ✅ Income monthly chart
    const incomeChartData = useMemo(() => {
        const map = {};
        incomeData.forEach((item) => {
            const month = dayjs(item.date).format("MMM");
            map[month] = (map[month] || 0) + Number(item.total);
        });

        return Object.keys(map).map((m) => ({
            month: m,
            value: map[m],
        }));
    }, [incomeData]);

    // ✅ Expense Pie chart
    const expensePieData = useMemo(() => {
        const map = {};
        expenseDataDb.forEach((item) => {
            const cat = item.sub_category;
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

    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    };

    return (
        <>
            <Filters onFilterChange={setFilters} />

            <div className="dashboard-container">
                <AmountDetails
                    filteredIncome={incomeData}
                    filteredExpenses={expenseDataDb}
                    originalIncome={originalIncome}
                    originalExpenses={originalExpenses}
                    filters={filters}
                />

                <div className="graphs-grid">
                    {/* 📈 Income Cash Flow */}
                    <motion.div className="chart-card" variants={fadeUp}>
                        <div className="chart-header">
                            <h3>
                                <TrendingUp
                                    size={18}
                                    style={{ marginRight: 8, color: "#d4af37" }}
                                />
                                Income Cash Flow
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
                                <AreaChart data={incomeChartData}>
                                    <defs>
                                        <linearGradient
                                            id="cashFlowGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="#d4af37"
                                                stopOpacity={0.8}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="#d4af37"
                                                stopOpacity={0.1}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="rgba(0,0,0,0.1)"
                                    />

                                    <XAxis
                                        dataKey="month"
                                        stroke="#1c2431"
                                        fontSize={12}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#1c2431"
                                        fontSize={12}
                                        tickLine={false}
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#1c2431",
                                            borderRadius: "10px",
                                            border: "1px solid #d4af37",
                                            color: "#fff",
                                        }}
                                        itemStyle={{ color: "#d4af37" }}
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#d4af37"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#cashFlowGradient)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </motion.div>

                    {/* 🥧 Expense Breakdown */}
                    <motion.div className="chart-card" variants={fadeUp}>
                        <div className="chart-header">
                            <h3>
                                <PieChart
                                    size={18}
                                    style={{ marginRight: 8, color: "#d4af37" }}
                                />
                                Expense Breakdown
                            </h3>
                        </div>

                        <div className="chart-wrapper">
                            {expensePieData.labels.length === 0 ? (
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

                {/* 💳 Recent Transactions */}
                <motion.div className="transactions-card" variants={fadeUp}>
                    <div className="transactions-header">
                        <h3>
                            <CreditCard
                                size={18}
                                style={{ marginRight: 8, color: "#d4af37" }}
                            />
                            Recent Transactions
                        </h3>
                    </div>

                    <table className="transactions-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Payment Method</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {recentTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="no-data">
                                        <div className="no-data-box">
                                            <img
                                                src="https://cdn-icons-png.flaticon.com/512/4076/4076503.png"
                                                alt="no data"
                                                className="no-data-img"
                                            />
                                            <h3>No Data Found</h3>
                                            <p>No Recent Data available.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                recentTransactions.map((t, i) => (
                                    <motion.tr key={i}>
                                        <td>{dayjs(t.date).format("DD MMM YYYY")}</td>
                                        <td>{t.category}</td>
                                        <td>{t.description}</td>
                                        <td
                                            className={
                                                t.amount < 0 ? "negative" : "positive"
                                            }
                                        >
                                            {t.amount < 0
                                                ? `-₹${Math.abs(t.amount)}`
                                                : `₹${t.amount}`}
                                        </td>
                                        <td>{t.method}</td>
                                        <td>
                                            <span
                                                className="status-pill"
                                                style={{ backgroundColor: t.color }}
                                            >
                                                {t.type}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </motion.div>
            </div>
        </>
    );
}
