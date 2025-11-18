// FIXED VERSION — NO "Too many requests" errors
import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Select, Button } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import Filters from "../Filters/Filters";
import Modals from "./Modals";
import {
    getExpenseCategoriesApi,
    getExpensesApi,
    getIncomeApi,
    getIncomeCategoriesApi,
    getWalletEntriesApi
} from "../../Api/action";

import * as Icons from "lucide-react";
import { FullPageLoader } from "../../Common/FullPageLoader";
import { CommonToaster } from "../../Common/CommonToaster";

export default function IncomeExpense() {
    const [activeTab, setActiveTab] = useState("expense");
    const [openModal, setOpenModal] = useState(null);

    // FORM
    const [branch, setBranch] = useState("Select Branch");
    const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [total, setTotal] = useState("");
    const [mainCategory, setMainCategory] = useState("Select Main Category");
    const [subCategory, setSubCategory] = useState("Select Category");
    const [description, setDescription] = useState("");

    // Invoice Modal
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceSrc, setInvoiceSrc] = useState(null);

    // Wallet
    const [walletEntries, setWalletEntries] = useState([]);

    // Filters
    const [filterCategory, setFilterCategory] = useState("All");
    const [filterAmount, setFilterAmount] = useState("");
    const [searchText, setSearchText] = useState("");
    const [filters, setFilters] = useState({
        filterType: "year",
        compareMode: false,
        value: dayjs(),
    });

    const [expenseCategories, setExpenseCategories] = useState({});
    const [incomeCategories, setIncomeCategories] = useState([]);
    const [expenseData, setExpenseData] = useState([]);
    const [incomeData, setIncomeData] = useState([]);
    const [loading, setLoading] = useState(true);

    const userDetails = JSON.parse(localStorage.getItem("loginDetails"));
    const userId = userDetails?.id;
    const userRole = userDetails?.role;


    // -------------------------------------
    // Load Wallet
    // -------------------------------------
    useEffect(() => {
        if (userRole === "user" && userId) {
            getWalletEntriesApi(userId).then((res) => setWalletEntries(res || []));
        }
    }, []);

    // -------------------------------------
    // Invoice
    // -------------------------------------
    const handleViewInvoice = (fileName) => {
        const url = `${import.meta.env.VITE_API_URL}/uploads/invoices/${fileName}`;
        if (fileName.toLowerCase().endsWith(".pdf")) {
            return window.open(url, "_blank");
        }
        setInvoiceSrc(url);
        setShowInvoiceModal(true);
    };

    // -------------------------------------
    // APPLY FILTERS (must be before usage)
    // -------------------------------------
    const applyFilters = (items) => {
        if (!filters.value) return items;

        const type = filters.filterType;

        // Not compare
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

        // Compare mode
        if (!Array.isArray(filters.value) || filters.value.length !== 2) return items;

        const [start, end] = filters.value;

        return items.filter((item) => {
            const d = dayjs(item.date);
            return d.isBetween(start, end, "day", "[]");
        });
    };

    // -------------------------------------
    // NOW SAFE TO FILTER WALLET
    // -------------------------------------
    const filteredWallet = applyFilters(walletEntries);

    // -------------------------------------
    // Load categories
    // -------------------------------------
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
            setIncomeCategories(inc.map((i) => i.name));
        }
        loadCategories();
    }, []);

    // -------------------------------------
    // Load Income + Expense
    // -------------------------------------
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const expenses = await getExpensesApi();
            const income = await getIncomeApi();
            setExpenseData(expenses);
            setIncomeData(income);
            setLoading(false);
        }
        loadData();
    }, []);

    // -------------------------------------
    // Live reload listener
    // -------------------------------------
    useEffect(() => {
        const reload = () => {
            getExpensesApi().then(setExpenseData);
            getIncomeApi().then(setIncomeData);
        };

        window.addEventListener("incomeExpenseUpdated", reload);
        return () => window.removeEventListener("incomeExpenseUpdated", reload);
    }, []);

    // -------------------------------------
    // Open modals via window event
    // -------------------------------------
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

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setMainCategory("Select Main Category");
        setSubCategory("Select Category");
    };

    const filteredExpenseData = applyFilters(expenseData);
    const filteredIncomeData = applyFilters(incomeData);

    // -------------------------------------
    // BUILD TABLE ROWS
    // -------------------------------------
    let baseRows = [];

    if (activeTab === "expense") {
        baseRows = filteredExpenseData.map((item) => {
            const DynamicIcon = Icons[item.icon] || Icons.Circle;
            return {
                date: dayjs(item.date).format("DD/MM/YYYY"),
                title: item.sub_category,
                merchant: item.user_name,
                amount: `₹${item.total}`,
                report: item.branch,
                status: "Approved",
                icon: <DynamicIcon size={20} />,
                invoice: item.invoice,
                color: item.color,
            };
        });
    } else {
        // INCOME TAB
        if (userDetails.role === "admin") {
            baseRows = filteredIncomeData.map((item) => {
                const DynamicIcon = Icons[item.icon] || Icons.Circle;
                return {
                    date: dayjs(item.date).format("DD/MM/YYYY"),
                    title: item.category,
                    merchant: item.user_name || "Unknown",
                    amount: `₹${item.total}`,
                    report: item.branch,
                    status: "Received",
                    icon: <DynamicIcon size={20} />,
                    invoice: item.invoice,
                    color: item.color,
                };
            });
        } else {
            // USER → WALLET
            baseRows = filteredWallet.map((item) => ({
                date: dayjs(item.date).format("DD/MM/YYYY"),
                title: item.note || "Wallet Entry",
                merchant: userDetails.name || "You",
                amount: `₹${item.amount}`,
                report: item.branch || "-",
                status: "Received",
                icon: <Icons.Wallet size={20} />,
                invoice: "",
                color: "#00C49F",
            }));
        }
    }

    // -------------------------------------
    // SEARCH / CATEGORY / SORT
    // -------------------------------------
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
                parseInt(a.amount.replace(/\D/g, "")) -
                parseInt(b.amount.replace(/\D/g, ""))
        );
    } else if (filterAmount === "high") {
        filteredRows.sort(
            (a, b) =>
                parseInt(b.amount.replace(/\D/g, "")) -
                parseInt(a.amount.replace(/\D/g, ""))
        );
    }

    const clearAllFilters = () => {
        setFilterCategory("All");
        setFilterAmount("");
        setSearchText("");
    };

    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    };

    // -------------------------------------
    // UI
    // -------------------------------------
    return (
        <>
            {loading ? (
                <FullPageLoader />
            ) : (
                <>
                    <Filters onFilterChange={setFilters} />

                    <div className="expense-container">
                        {/* TABS */}
                        <div className="tabs-wrapper">
                            <button
                                className={`premium-tab ${activeTab === "income" ? "active" : ""
                                    }`}
                                onClick={() => handleTabChange("income")}
                            >
                                {userDetails.role === "admin" ? "Income" : "Wallet"}
                            </button>

                            <button
                                className={`premium-tab ${activeTab === "expense" ? "active" : ""
                                    }`}
                                onClick={() => handleTabChange("expense")}
                            >
                                Expense
                            </button>
                        </div>

                        <motion.div variants={fadeUp} initial="hidden" animate="visible">
                            {/* HEADER */}
                            <div className="expense-header">
                                <h1>
                                    {activeTab === "expense"
                                        ? "Expenses"
                                        : userDetails.role === "admin"
                                            ? "Income"
                                            : "Wallet"}
                                </h1>

                                <div className="expense-actions">
                                    <button
                                        className="btn-primary"
                                        onClick={() => {
                                            const currentUser =
                                                JSON.parse(
                                                    localStorage.getItem(
                                                        "loginDetails"
                                                    )
                                                );

                                            if (
                                                activeTab === "income" &&
                                                currentUser?.role !== "admin"
                                            ) {
                                                return CommonToaster(
                                                    "You do not have permission to add income",
                                                    "error"
                                                );
                                            }

                                            setOpenModal(activeTab);
                                        }}
                                    >
                                        <Plus size={16} /> New {activeTab}
                                    </button>
                                </div>
                            </div>

                            {/* FILTER UI */}
                            <div className="filter-dropdown">
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
                                    <label>Search</label>
                                    <input
                                        type="text"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        placeholder="Search"
                                        style={{
                                            width: 240,
                                            padding: "8px 10px",
                                            border: "1px solid #ccc",
                                            borderRadius: 6,
                                            height: 40,
                                        }}
                                    />
                                </div>

                                <div className="filter-item">
                                    <Button className="clear-btn" onClick={clearAllFilters}>
                                        Clear All
                                    </Button>
                                </div>
                            </div>

                            {/* TABLE */}
                            <div className="table-scroll-wrapper">
                                <div className="expense-table-wrapper">
                                    <div className="expense-table">
                                        <div className="expense-row expense-header-row">
                                            <div></div>
                                            <div>DETAILS</div>
                                            <div>EMPLOYEE NAME</div>
                                            <div>AMOUNT</div>
                                            <div>BRANCH</div>
                                            <div>INVOICE</div>
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
                                            </div>
                                        ) : (
                                            filteredRows.map((row, i) => (
                                                <div key={i} className="expense-row">
                                                    <div>
                                                        <input type="checkbox" />
                                                    </div>

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
                                                                justifyContent: "center",
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
                                                        {row.invoice ? (
                                                            <button
                                                                className="view-invoice-btn"
                                                                onClick={() =>
                                                                    handleViewInvoice(row.invoice)
                                                                }
                                                            >
                                                                View
                                                            </button>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </div>
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
                                </div>
                            </div>

                            {/* MODAL */}
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
                        </motion.div>
                    </div>
                </>
            )}

            {showInvoiceModal && (
                <div
                    className="invoice-modal-backdrop"
                    onClick={() => setShowInvoiceModal(false)}
                >
                    <div
                        className="invoice-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>Invoice Preview</h3>
                        <button
                            className="close-modal-btn"
                            onClick={() => setShowInvoiceModal(false)}
                        >
                            <Icons.X size={20} />
                        </button>

                        <div style={{ textAlign: "center" }}>
                            <img
                                src={invoiceSrc}
                                alt="Invoice"
                                style={{ width: "70%", borderRadius: 10 }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
