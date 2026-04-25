import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Skeleton } from "antd";
dayjs.extend(isBetween);

const fmtAmt = (n) => {
    const val = Number(String(n ?? 0).replace(/[^0-9.-]+/g, "")) || 0;
    return `₹${val.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

export default function AmountDetails({
    stats,
    filters,
    loading,
    user
}) {
    const navigate = useNavigate();

    if (loading || !stats) {
        return (
            <div className="stats-grid">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="stat-card" style={{ height: 140 }}>
                        <Skeleton active title={{ width: 120 }} paragraph={{ rows: 2 }} />
                    </div>
                ))}
            </div>
        );
    }

    const currentTotals = stats.current || { income: 0, expense: 0, balance: 0 };
    const lastTotals = stats.previous || { income: 0, expense: 0, balance: 0 };

    const diffText = (current, previous) => {
        if (!filters.value) return "";
        if (current === previous) return "No Change";

        const diff = current - previous;
        return diff > 0
            ? `+ ${fmtAmt(diff)} compared to previous period`
            : `- ${fmtAmt(Math.abs(diff))} compared to previous period`;
    };

    const getPeriodText = () => {
        if (!filters.value) return "";
        const type = filters.filterType;

        if (Array.isArray(filters.value) && filters.value.length === 2) {
            const [start, end] = filters.value;
            const s = dayjs(start);
            const e = dayjs(end);

            if (type === "date" && s.isSame(e, "day")) return ` (${s.format("MMM DD, YYYY")})`;
            if (type === "year" && s.isSame(e, "year") && s.date() === 1 && s.month() === 0) return ` (${s.format("YYYY")})`;
            
            return ` (${s.format("MMM DD")} - ${e.format("MMM DD")}, ${e.format("YYYY")})`;
        }

        const selected = dayjs(filters.value);
        if (type === "date") return ` (${selected.format("MMM DD, YYYY")})`;
        if (type === "week") return ` (${selected.startOf("week").format("MMM DD")} - ${selected.endOf("week").format("MMM DD")})`;
        if (type === "month") return ` (${selected.format("MMMM YYYY")})`;
        if (type === "year") return ` (${selected.format("YYYY")})`;
        return "";
    };

    const periodText = getPeriodText();

    const statsConfig = [
        {
            title: `Overall Balance${periodText}`,
            value: currentTotals.balance,
            diff: diffText(currentTotals.balance, lastTotals.balance),
        },
        {
            title: `Total Received${periodText}`,
            value: currentTotals.income,
            diff: diffText(currentTotals.income, lastTotals.income),
        },
        {
            title: `Overall Expenses${periodText}`,
            value: currentTotals.expense,
            diff: diffText(currentTotals.expense, lastTotals.expense),
        },
    ];

    return (
        <div className="stats-grid">
            {statsConfig.map((stat, i) => (
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
                    <h2>{fmtAmt(stat.value)}</h2>
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
