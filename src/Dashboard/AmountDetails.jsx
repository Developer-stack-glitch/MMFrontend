import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Skeleton } from "antd";
import { getWalletEntriesApi } from "../../Api/action";

dayjs.extend(isBetween);

export default function AmountDetails({
    filteredIncome,
    filteredExpenses,
    originalIncome,
    originalExpenses,
    filters,
    loading,
    user,
}) {
    const navigate = useNavigate();

    const [walletEntries, setWalletEntries] = useState([]);

    // ===============================================================
    // FETCH ALL WALLET ENTRIES FOR USER
    // ===============================================================
    useEffect(() => {
        if (user?.role === "user") {
            getWalletEntriesApi(user.id).then((res) => {
                setWalletEntries(res || []);
            });
        }
    }, [user]);

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

    // ===============================================================
    // FILTER WALLET FOR SELECTED PERIOD
    // ===============================================================
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

    const walletTotal = filteredWallet.reduce(
        (sum, entry) => sum + Number(entry.amount),
        0
    );

    // ===============================================================
    // CURRENT TOTALS
    // ===============================================================
    const totalIncome =
        user?.role === "admin"
            ? filteredIncome.reduce((a, b) => a + Number(b.total), 0)
            : 0;

    const totalExpenses = filteredExpenses.reduce(
        (a, b) => a + Number(b.total),
        0
    );

    const balance =
        user?.role === "admin"
            ? totalIncome - totalExpenses
            : walletTotal - totalExpenses;

    // ===============================================================
    // PREVIOUS PERIOD CALCULATION
    // ===============================================================
    let lastIncome = 0;
    let lastExpenses = 0;
    let lastWallet = 0;
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
                .filter((i) =>
                    dayjs(i.date).isBetween(prevStart, prevEnd, "day", "[]")
                )
                .reduce((a, b) => a + Number(b.total), 0);

            lastExpenses = originalExpenses
                .filter((e) =>
                    dayjs(e.date).isBetween(prevStart, prevEnd, "day", "[]")
                )
                .reduce((a, b) => a + Number(b.total), 0);

            lastWallet = walletEntries
                .filter((w) =>
                    dayjs(w.date).isBetween(prevStart, prevEnd, "day", "[]")
                )
                .reduce((a, b) => a + Number(b.amount), 0);

            lastBalance =
                user?.role === "admin"
                    ? lastIncome - lastExpenses
                    : lastWallet - lastExpenses;
        }
    }

    // ===============================================================
    // DIFF TEXTER
    // ===============================================================
    const diffText = (current, previous) => {
        if (!filters.value) return "";
        if (current === previous) return "No Datas";

        const diff = current - previous;

        return diff > 0
            ? `+ ₹${diff.toLocaleString()} compared to previous period`
            : `- ₹${Math.abs(diff).toLocaleString()} compared to previous period`;
    };

    // Wallet diff text
    const walletDiff = diffText(walletTotal, lastWallet);

    // ===============================================================
    // ROLE BASED UI DATA
    // ===============================================================
    let stats = [];

    if (user?.role === "admin") {
        stats = [
            {
                title: "Balance",
                value: balance,
                diff: diffText(balance, lastBalance),
            },
            {
                title: "Income",
                value: totalIncome,
                diff: diffText(totalIncome, lastIncome),
            },
            {
                title: "Expenses",
                value: totalExpenses,
                diff: diffText(totalExpenses, lastExpenses),
            },
        ];
    }

    if (user?.role === "user") {
        stats = [
            {
                title: "Balance",
                value: balance,
                diff: diffText(balance, lastBalance),
            },
            {
                title: "Wallet",
                value: walletTotal,
                diff: walletDiff,
            },
            {
                title: "Expenses",
                value: totalExpenses,
                diff: diffText(totalExpenses, lastExpenses),
            },
        ];
    }

    // ===============================================================
    // ANIMATION
    // ===============================================================
    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6 },
        },
    };

    return (
        <div className="stats-grid">
            {stats.map((stat, i) => (
                <motion.div
                    key={i}
                    className="stat-card"
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                >
                    <div className="stat-header">
                        <h4 style={{ fontSize: 16, marginBottom: 10 }}>
                            {stat.title}
                        </h4>
                        <span
                            onClick={() => navigate("/income-expense")}
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
