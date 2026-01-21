import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Skeleton } from "antd";
dayjs.extend(isBetween);

export default function AmountDetails({
    filteredExpenses,
    originalExpenses,
    filteredIncome,
    originalIncome,
    filters,
    loading,
    user,
    walletEntries = [],
    useFilteredIncome = false
}) {
    const navigate = useNavigate();
    const isUser = user?.role === "user";

    const walletSummary = {
        income: useFilteredIncome
            ? (originalIncome || []).reduce((sum, e) => sum + Number(e.total || e.amount || 0), 0)
            : walletEntries
                .filter(e => (e.type || "").toLowerCase() === 'income')
                .reduce((sum, e) => sum + Number(e.amount), 0),
        expense: useFilteredIncome
            ? (originalExpenses || []).reduce((sum, e) => sum + Number(e.total || e.amount || 0), 0)
            : (walletEntries
                .filter(e => (e.type || "").toLowerCase() === 'expense')
                .reduce((sum, e) => sum + Number(e.amount), 0)) +
            (isUser ? 0 : (originalExpenses || []).reduce((sum, e) => sum + Number(e.total), 0)),
        get wallet() { return this.income - this.expense }
    };

    if (loading) {
        return (
            <div className="stats-grid">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="stat-card">
                        <Skeleton
                            active
                            title={{ width: 120 }}
                            paragraph={{ rows: 3, width: ["80%", "60%", "50%"] }}
                        />
                    </div>
                ))}
            </div>
        );
    }

    const filteredWallet = walletEntries.filter((entry) => {
        const d = dayjs(entry.date);
        if (!filters.value) return true;
        if (!filters.compareMode) {
            if (filters.filterType === "date")
                return d.isSame(filters.value, "day");
            if (filters.filterType === "week")
                return d.isSame(filters.value, "week");
            if (filters.filterType === "month")
                return d.isSame(filters.value, "month");
            if (filters.filterType === "year")
                return d.isSame(filters.value, "year");
        }
        if (filters.compareMode && Array.isArray(filters.value)) {
            const [start, end] = filters.value;
            return d.isBetween(start, end, "day", "[]");
        }
        return true;
    });

    // Calculate totals from filtered wallet entries + filtered expenses (only if not User)
    const calculateTotals = (wEntries, eEntries = [], iEntries = []) => {
        const income = useFilteredIncome
            ? iEntries.reduce((sum, e) => sum + Number(e.total || e.amount || 0), 0)
            : wEntries
                .filter(e => (e.type || "").toLowerCase() === 'income')
                .reduce((sum, e) => sum + Number(e.amount), 0);

        const expense = useFilteredIncome
            ? eEntries.reduce((sum, e) => sum + Number(e.total || e.amount || 0), 0)
            : (wEntries
                .filter(e => (e.type || "").toLowerCase() === 'expense')
                .reduce((sum, e) => sum + Number(e.amount), 0)) +
            (isUser ? 0 : eEntries.reduce((sum, e) => sum + Number(e.total), 0));

        return { income, expense, balance: income - expense };
    };

    const currentTotals = calculateTotals(filteredWallet, filteredExpenses, filteredIncome);

    // Calculate Previous Period Totals
    let lastTotals = { income: 0, expense: 0, balance: 0 };

    if (filters.value && !filters.compareMode) {
        const type = filters.filterType;
        const selected = dayjs(filters.value);
        let prevStart = null;
        let prevEnd = null;

        if (type === "date") {
            prevStart = selected.subtract(1, "day");
            prevEnd = selected.subtract(1, "day");
        } else if (type === "week") {
            prevStart = selected.subtract(1, "week").startOf("week");
            prevEnd = selected.subtract(1, "week").endOf("week");
        } else if (type === "month") {
            prevStart = selected.subtract(1, "month").startOf("month");
            prevEnd = selected.subtract(1, "month").endOf("month");
        } else if (type === "year") {
            prevStart = selected.subtract(1, "year").startOf("year");
            prevEnd = selected.subtract(1, "year").endOf("year");
        }

        if (prevStart && prevEnd) {
            const prevWallet = walletEntries.filter((w) =>
                dayjs(w.date).isBetween(prevStart, prevEnd, "day", "[]")
            );
            const prevExpenses = (originalExpenses || []).filter((e) =>
                dayjs(e.date).isBetween(prevStart, prevEnd, "day", "[]")
            );
            const prevIncome = (originalIncome || []).filter((i) =>
                dayjs(i.date).isBetween(prevStart, prevEnd, "day", "[]")
            );
            lastTotals = calculateTotals(prevWallet, prevExpenses, prevIncome);
        }
    }

    const diffText = (current, previous) => {
        if (!filters.value) return "";
        if (current === previous) return "No Datas";

        // Get the previous period month name
        const type = filters.filterType;
        const selected = dayjs(filters.value);
        let prevPeriod = "";

        if (type === "date") {
            prevPeriod = selected.subtract(1, "day").format("MMMM");
        } else if (type === "week") {
            prevPeriod = selected.subtract(1, "week").format("MMMM");
        } else if (type === "month") {
            prevPeriod = selected.subtract(1, "month").format("MMMM");
        } else if (type === "year") {
            prevPeriod = selected.subtract(1, "year").format("YYYY");
        }

        const diff = current - previous;
        const periodText = prevPeriod ? ` (${prevPeriod})` : "";

        return diff > 0
            ? `+ ₹${diff.toLocaleString()} compared to previous period${periodText}`
            : `- ₹${Math.abs(diff).toLocaleString()} compared to previous period${periodText}`;
    };

    // Get current period text for stat titles
    const getPeriodText = () => {
        if (!filters.value) return "";
        const selected = dayjs(filters.value);
        const type = filters.filterType;

        if (filters.compareMode && Array.isArray(filters.value)) {
            const [start, end] = filters.value;
            return ` (${dayjs(start).format("MMM DD")} - ${dayjs(end).format("MMM DD")})`;
        }

        if (type === "date") {
            return ` (${selected.format("MMM DD, YYYY")})`;
        } else if (type === "week") {
            return ` (${selected.startOf("week").format("MMM DD")} - ${selected.endOf("week").format("MMM DD")})`;
        } else if (type === "month") {
            return ` (${selected.format("MMMM YYYY")})`;
        } else if (type === "year") {
            return ` (${selected.format("YYYY")})`;
        }
        return "";
    };

    const periodText = getPeriodText();

    let stats = [];
    if (user?.role === "admin") {
        stats = [
            {
                title: `Overall Balance${periodText}`,
                value: filters.value ? currentTotals.balance : walletSummary.wallet,
                diff: diffText(currentTotals.balance, lastTotals.balance),
            },
            {
                title: `Total Received${periodText}`,
                value: filters.value ? currentTotals.income : walletSummary.income,
                diff: diffText(currentTotals.income, lastTotals.income),
            },
            {
                title: `Overall Expenses${periodText}`,
                value: filters.value ? currentTotals.expense : walletSummary.expense,
                diff: diffText(currentTotals.expense, lastTotals.expense),
            },
        ];
    }

    if (user?.role === "user") {
        stats = [
            {
                title: `Balance`,
                value: filters.value ? currentTotals.balance : walletSummary.wallet,
                diff: diffText(currentTotals.balance, lastTotals.balance),
            },
            {
                title: `Received`,
                value: filters.value ? currentTotals.income : walletSummary.income,
                diff: diffText(currentTotals.income, lastTotals.income),
            },
            {
                title: `Expenses`,
                value: filters.value ? currentTotals.expense : walletSummary.expense,
                diff: diffText(currentTotals.expense, lastTotals.expense),
            },
        ];
    }

    return (
        <div className="stats-grid">
            {stats.map((stat, i) => (
                <motion.div
                    key={i}
                    className="stat-card"

                    initial="hidden"
                    animate="visible"
                >
                    <div className="stat-header">
                        <h4 style={{ fontSize: 16, marginBottom: 10 }}>
                            {stat.title}
                        </h4>
                        <span
                            onClick={() => navigate("/approved-expense")}
                            className="detail-link"
                        >
                            See Detail →
                        </span>
                    </div>
                    <h2>₹ {stat.value.toLocaleString()}</h2>
                    {stat.diff && (
                        <p
                            className={`stat-change ${stat.diff.startsWith("+")
                                ? "green"
                                : stat.diff.startsWith("-")
                                    ? "red"
                                    : "neutral"
                                }`}
                        >
                            {stat.diff}
                        </p>
                    )}
                </motion.div>
            ))}
        </div>
    );
}
