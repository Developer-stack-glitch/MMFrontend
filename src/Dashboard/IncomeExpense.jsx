import React, { useEffect, useState } from "react";
import {
    Plus,
    SlidersHorizontal,
    Utensils,
    Pencil,
    Wallet,
} from "lucide-react";
import { Select, Button, Tooltip } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import Filters from "../Filters/Filters";
import Modals from "./Modals";
import { getExpenseCategoriesApi, getExpensesApi, getIncomeApi, getIncomeCategoriesApi } from "../../Api/action";
import * as Icons from "lucide-react";


export default function IncomeExpense() {
    const [activeTab, setActiveTab] = useState("expense");
    const [openModal, setOpenModal] = useState(null);
    // ✅ FORM FIELDS
    const [branch, setBranch] = useState("Select Branch");
    const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [total, setTotal] = useState("");
    const [mainCategory, setMainCategory] = useState("Select Main Category");
    const [subCategory, setSubCategory] = useState("Select Category");
    const [description, setDescription] = useState("");

    // ✅ FILTERS
    const [showFilters, setShowFilters] = useState(false);
    const [filterCategory, setFilterCategory] = useState("All");
    const [filterAmount, setFilterAmount] = useState("");
    const [searchText, setSearchText] = useState("");
    const [expenseCategories, setExpenseCategories] = useState({});
    const [incomeCategories, setIncomeCategories] = useState([]);
    const [expenseData, setExpenseData] = useState([]);
    const [incomeData, setIncomeData] = useState([]);
    const [filters, setFilters] = useState({
        filterType: "year",
        compareMode: false,
        value: dayjs(),
    });


    const applyFilters = (items) => {
        if (!filters.value) return items;

        const type = filters.filterType;

        // ✅ Normal (not compare)
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

        // ✅ Compare Mode
        if (!Array.isArray(filters.value) || filters.value.length !== 2) return items;

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
            setIncomeCategories(inc.map(item => item.name));
        }

        loadCategories();
    }, []);

    useEffect(() => {
        async function loadData() {
            const expenses = await getExpensesApi();
            const income = await getIncomeApi();

            setExpenseData(expenses);
            setIncomeData(income);

            console.log("Expenses:", expenses);
            console.log("Income:", income);
        }

        loadData();
    }, []);

    useEffect(() => {
        const reload = () => {
            getExpensesApi().then(setExpenseData);
            getIncomeApi().then(setIncomeData);
        };

        window.addEventListener("incomeExpenseUpdated", reload);
        return () => window.removeEventListener("incomeExpenseUpdated", reload);
    }, []);



    // ✅ RESET CATEGORY WHEN TAB SWITCHES
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setMainCategory("Select Main Category");
        setSubCategory("Select Category");
    };

    const filteredExpenseData = applyFilters(expenseData);
    const filteredIncomeData = applyFilters(incomeData);

    const baseRows =
        activeTab === "expense"
            ? filteredExpenseData.map(item => {
                const DynamicIcon = Icons[item.icon] || Icons.Circle;

                return {
                    date: dayjs(item.date).format("DD/MM/YYYY"),
                    title: item.sub_category,
                    merchant: item.user_name,
                    amount: `₹${item.total}`,
                    report: item.branch,
                    status: "Approved",
                    icon: <DynamicIcon size={20} />,
                    color: item.color
                };
            })
            : filteredIncomeData.map(item => {
                const DynamicIcon = Icons[item.icon] || Icons.Circle;

                return {
                    date: dayjs(item.date).format("DD/MM/YYYY"),
                    title: item.category,
                    merchant: item.user_name || "Unknown",
                    amount: `₹${item.total}`,
                    report: item.branch,
                    status: "Received",
                    icon: <DynamicIcon size={20} />,
                    color: item.color
                };
            });


    // ✅ FILTER
    let filteredRows = [...baseRows];

    if (searchText.trim()) {
        filteredRows = filteredRows.filter((r) =>
            `${r.title} ${r.merchant} ${r.date} ${r.report}`
                .toLowerCase()
                .includes(searchText.toLowerCase())
        );
    }

    if (filterCategory !== "All") {
        filteredRows = filteredRows.filter((r) =>
            r.title.toLowerCase().includes(filterCategory.toLowerCase())
        );
    }

    if (filterAmount === "low") {
        filteredRows.sort(
            (a, b) =>
                parseFloat(a.amount.replace(/[^0-9.-]/g, "")) -
                parseFloat(b.amount.replace(/[^0-9.-]/g, ""))
        );
    } else if (filterAmount === "high") {
        filteredRows.sort(
            (a, b) =>
                parseFloat(b.amount.replace(/[^0-9.-]/g, "")) -
                parseFloat(a.amount.replace(/[^0-9.-]/g, ""))
        );
    }

    const clearAllFilters = () => {
        setFilterCategory("All");
        setFilterAmount("");
        setSearchText("");
    };

    return (
        <>
            <Filters onFilterChange={setFilters} />

            <div className="expense-container">

                {/* ✅ Tabs */}
                <div className="tabs-wrapper">
                    <button
                        className={`premium-tab ${activeTab === "income" ? "active" : ""}`}
                        onClick={() => handleTabChange("income")}
                    >
                        Income
                    </button>

                    <button
                        className={`premium-tab ${activeTab === "expense" ? "active" : ""}`}
                        onClick={() => handleTabChange("expense")}
                    >
                        Expense
                    </button>
                </div>

                {/* ✅ Header */}
                <div className="expense-header">
                    <h1>{activeTab === "expense" ? "Expenses" : "Income"}</h1>

                    <div className="expense-actions">
                        <button
                            className="btn-primary"
                            onClick={() => setOpenModal(activeTab)}
                        >
                            <Plus size={16} /> New {activeTab}
                        </button>
                        <Tooltip title="Filters">
                            <button
                                className="btn-icon"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <SlidersHorizontal size={16} />

                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* ✅ Filters */}
                {showFilters && (
                    <div className="filter-dropdown">
                        {activeTab === "expense" && (
                            <div className="filter-item">
                                <label>Main Category</label>
                                <Select
                                    value={filterCategory}
                                    onChange={(v) => setFilterCategory(v)}
                                    style={{ width: 180 }}
                                    options={[
                                        { value: "All", label: "All" },
                                        ...Object.keys(expenseCategories).map((cat) => ({
                                            value: cat,
                                            label: cat,
                                        })),
                                    ]}
                                />
                            </div>
                        )}

                        <div className="filter-item">
                            <label>Amount</label>
                            <Select
                                value={filterAmount}
                                onChange={(v) => setFilterAmount(v)}
                                style={{ width: 180 }}
                                options={[
                                    { value: "", label: "None" },
                                    { value: "low", label: "Low → High" },
                                    { value: "high", label: "High → Low" },
                                ]}
                            />
                        </div>

                        <div className="filter-item">
                            <label>Search (Name / Branch / Category)</label>
                            <input
                                type="text"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Search owner or category"
                                style={{
                                    width: 240,
                                    padding: "8px 10px",
                                    border: "1px solid #ccc",
                                    borderRadius: 6,
                                    height: 40
                                }}
                            />
                        </div>

                        <div className="filter-item">
                            <Button className="clear-btn" onClick={clearAllFilters}>Clear All</Button>
                        </div>
                    </div>
                )}

                {/* ✅ TABLE */}
                <div className="expense-table">
                    <div className="expense-row expense-header-row">
                        <div></div>
                        <div>DETAILS</div>
                        <div>EMPLOYEE NAME</div>
                        <div>AMOUNT</div>
                        <div>BRANCH</div>
                        <div>STATUS</div>
                    </div>

                    {filteredRows.length === 0 ? (
                        <div className="no-data-box">
                            <img
                                src="https://cdn-icons-png.flaticon.com/512/4076/4076503.png"
                                alt="no data"
                                className="no-data-img"
                            />
                            <h3>No Data Found</h3>
                            <p>No approval requests available.</p>
                        </div>
                    ) : (
                        filteredRows.map((row, i) => (
                            <div key={i} className="expense-row">
                                <div><input type="checkbox" /></div>

                                <div className="col details-col">
                                    <div
                                        className="icon-circles"
                                        style={{
                                            backgroundColor: row.color,
                                            width: 40,
                                            height: 40,
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        {row.icon}
                                    </div>

                                    <div className="details-text">
                                        <span className="date">{row.date}</span>
                                        <span className="title">{row.title}</span>
                                    </div>
                                </div>

                                <div>{row.merchant}</div>
                                <div>{row.amount}</div>
                                <div>{row.report}</div>

                                <div>
                                    <span
                                        className={`status-badge ${row.status === "Submitted" ||
                                            row.status === "Received"
                                            ? "submitted"
                                            : "not-submitted"
                                            }`}
                                    >
                                        {row.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* ✅ MODAL */}
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

            </div>
        </>
    );
}
