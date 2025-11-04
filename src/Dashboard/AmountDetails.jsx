import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Skeleton } from "antd";   // ✅ ADD
dayjs.extend(isBetween);

export default function AmountDetails({
    filteredIncome,
    filteredExpenses,
    originalIncome,
    originalExpenses,
    filters,
    loading   // ✅ RECEIVE LOADING
}) {
    const navigate = useNavigate();

    // ✅ ANT DESIGN SKELETON UI
    if (loading) {
        return (
            <div className="stats-grid">
                {[1, 2, 3].map(i => (
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

    // ✅ CURRENT PERIOD TOTAL
    const totalIncome = filteredIncome.reduce((a, b) => a + Number(b.total), 0);
    const totalExpenses = filteredExpenses.reduce((a, b) => a + Number(b.total), 0);
    const balance = totalIncome - totalExpenses;

    let lastIncome = 0;
    let lastExpenses = 0;
    let lastBalance = 0;

    if (filters.value && !filters.compareMode) {
        const type = filters.filterType;
        const selected = dayjs(filters.value);
        let prevStart = null;
        let prevEnd = null;

        if (type === "date") {
            prevStart = selected.subtract(1, "day");
            prevEnd = selected.subtract(1, "day");
        }
        if (type === "week") {
            prevStart = selected.subtract(1, "week").startOf("week");
            prevEnd = selected.subtract(1, "week").endOf("week");
        }
        if (type === "month") {
            prevStart = selected.subtract(1, "month").startOf("month");
            prevEnd = selected.subtract(1, "month").endOf("month");
        }
        if (type === "year") {
            prevStart = selected.subtract(1, "year").startOf("year");
            prevEnd = selected.subtract(1, "year").endOf("year");
        }

        if (prevStart && prevEnd) {
            lastIncome = originalIncome
                .filter(i => dayjs(i.date).isBetween(prevStart, prevEnd, "day", "[]"))
                .reduce((a, b) => a + Number(b.total), 0);

            lastExpenses = originalExpenses
                .filter(e => dayjs(e.date).isBetween(prevStart, prevEnd, "day", "[]"))
                .reduce((a, b) => a + Number(b.total), 0);

            lastBalance = lastIncome - lastExpenses;
        }
    }

    if (filters.compareMode && filters.value) {
        if (Array.isArray(filters.value) && filters.value.length === 2) {
            const [start, end] = filters.value;
            const durationMs = end.diff(start);

            const prevStart = dayjs(start).subtract(durationMs, "ms");
            const prevEnd = dayjs(start).subtract(1, "day");

            lastIncome = originalIncome
                .filter(i => dayjs(i.date).isBetween(prevStart, prevEnd, "day", "[]"))
                .reduce((a, b) => a + Number(b.total), 0);

            lastExpenses = originalExpenses
                .filter(e => dayjs(e.date).isBetween(prevStart, prevEnd, "day", "[]"))
                .reduce((a, b) => a + Number(b.total), 0);

            lastBalance = lastIncome - lastExpenses;
        }
    }

    const getDifferenceText = (current, previous) => {
        if (!filters.value) return "No values selected to compare";
        if (current === previous) return "No change";

        const diff = current - previous;
        const formatted = Math.abs(diff).toLocaleString();

        return diff > 0
            ? `+ ₹${formatted} compared to previous period`
            : `- ₹${formatted} compared to previous period`;
    };

    const stats = [
        { title: "Balance", value: balance, diff: getDifferenceText(balance, lastBalance) },
        { title: "Income", value: totalIncome, diff: getDifferenceText(totalIncome, lastIncome) },
        { title: "Expenses", value: totalExpenses, diff: getDifferenceText(totalExpenses, lastExpenses) }
    ];

    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    };

    return (
        <div className="stats-grid">
            {stats.map((stat, i) => (
                <motion.div key={i} className="stat-card" variants={fadeUp}>
                    <div className="stat-header">
                        <h4>{stat.title}</h4>
                        <span
                            onClick={() => navigate("/income-expense")}
                            className="detail-link"
                        >
                            See Detail →
                        </span>
                    </div>

                    <h2>₹ {stat.value.toLocaleString()}</h2>

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
                </motion.div>
            ))}
        </div>
    );
}
