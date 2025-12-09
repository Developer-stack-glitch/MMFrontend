import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Select, Button, Pagination } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import Filters from "../Filters/Filters";
import Modals from "./Modals";
import {
    getExpenseCategoriesApi,
    getExpensesApi,
    getIncomeApi,
    getIncomeCategoriesApi,
    getWalletEntriesApi,
    getUserAllExpensesApi
} from "../../Api/action";

import * as Icons from "lucide-react";
import { FullPageLoader } from "../../Common/FullPageLoader";
import { CommonToaster } from "../../Common/CommonToaster";

export default function IncomeExpense() {
    const [activeTab, setActiveTab] = useState("expense");
    const [openModal, setOpenModal] = useState(null);
    const [editData, setEditData] = useState(null);

    // FORM
    const [branch, setBranch] = useState("Select Branch");
    const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [total, setTotal] = useState("");
    const [mainCategory, setMainCategory] = useState("Select Main Category");
    const [subCategory, setSubCategory] = useState("Select Category");
    const [description, setDescription] = useState("");
    const [endDate, setEndDate] = useState(null);
    const [vendorNumber, setVendorNumber] = useState("");
    const [vendorName, setVendorName] = useState("");

    // Invoice Modal
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [currentInvoices, setCurrentInvoices] = useState([]);
    const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState(0);

    // Wallet
    const [walletEntries, setWalletEntries] = useState([]);

    // Filters
    const [filterCategory, setFilterCategory] = useState("All");
    const [filterName, setFilterName] = useState("All");
    const [filterBranch, setFilterBranch] = useState("All");
    const [filterAmount, setFilterAmount] = useState("");
    const [searchText, setSearchText] = useState("");
    const [filters, setFilters] = useState({
        filterType: "year",
        compareMode: false,
        value: dayjs(),
    });

    const [page, setPage] = useState(1);
    const [PageTotal, setPageTotal] = useState(0);

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
        const loadWallet = () => {
            if (userRole === "user" && userId) {
                getWalletEntriesApi(userId).then((res) =>
                    setWalletEntries(res.entries || [])
                );
            }
        };

        loadWallet();
        window.addEventListener("incomeExpenseUpdated", loadWallet);
        window.addEventListener("summaryUpdated", loadWallet);

        return () => {
            window.removeEventListener("incomeExpenseUpdated", loadWallet);
            window.removeEventListener("summaryUpdated", loadWallet);
        };
    }, [userId, userRole]);

    const fmtAmt = (n) =>
        `₹${Number(String(n ?? 0).replace(/[^0-9.-]+/g, "")) || 0}`;
    // -------------------------------------
    // Invoice Slider
    // -------------------------------------
    const handleViewInvoice = (invoiceData) => {
        if (!invoiceData) return;

        const BASE = import.meta.env.VITE_API_URL;
        let invoicesArray = [];

        const normalize = (item) => {
            if (!item) return null;
            let str = String(item).trim().replace(/^"+|"+$/g, "");
            if (str.startsWith("data:")) return str;
            return `${BASE}/uploads/invoices/${str}`;
        };

        if (Array.isArray(invoiceData)) {
            invoicesArray = invoiceData.map(normalize).filter(Boolean);
        } else if (typeof invoiceData === "string" && invoiceData.startsWith("[")) {
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
        setCurrentInvoiceIndex(0);
        setShowInvoiceModal(true);
    };

    const handleNextInvoice = () => {
        setCurrentInvoiceIndex((prev) =>
            prev < currentInvoices.length - 1 ? prev + 1 : prev
        );
    };

    const handlePrevInvoice = () => {
        setCurrentInvoiceIndex((prev) => prev > 0 ? prev - 1 : prev);
    };

    // -------------------------------------
    // APPLY FILTERS
    // -------------------------------------
    const applyFilters = (items) => {
        if (!items || !Array.isArray(items)) return [];
        if (!filters.value) return items;

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

        if (!Array.isArray(filters.value) || filters.value.length !== 2) return items;

        const [start, end] = filters.value;

        return items.filter((item) => {
            const d = dayjs(item.date);
            return d.isBetween(start, end, "day", "[]");
        });
    };

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
    const [refreshKey, setRefreshKey] = useState(0);

    // -------------------------------------
    // Load Income + Expense
    // -------------------------------------
    useEffect(() => {
        async function loadData() {
            setLoading(true);

            let expenses;

            if (userRole === "admin") {
                expenses = await getExpensesApi(page);
            } else {
                const res = await getUserAllExpensesApi();
                expenses = { data: res.all || [], total: res.all?.length || 0 };
            }
            const income = await getIncomeApi(page);
            setExpenseData(expenses.data || []);
            setIncomeData(income.data || []);
            setPageTotal(
                activeTab === "expense"
                    ? expenses.total
                    : income.total
            );

            setLoading(false);
        }

        loadData();
    }, [page, activeTab, userRole, refreshKey]);

    // -------------------------------------
    // Live reload listener
    // -------------------------------------
    useEffect(() => {
        const reload = () => {
            setRefreshKey((prev) => prev + 1);
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

    const resetForm = () => {
        setBranch("Select Branch");
        setDate(dayjs().format("YYYY-MM-DD"));
        setTotal("");
        setMainCategory("Select Main Category");
        setSubCategory("Select Category");
        setDescription("");
        setEndDate(null);
        setVendorName("");
        setVendorNumber("");
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        resetForm();
    };

    const filteredExpenseData = applyFilters(expenseData);
    const filteredIncomeData = applyFilters(incomeData);

    const openEditModal = (item) => {
        const resolvedId = item.original_expense_id || item.id;
        setEditData({
            ...item,
            id: resolvedId
        });
        setBranch(item.branch || "Select Branch");
        setDate(item.date ? dayjs(item.date).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"));
        setTotal(item.total || "");
        setMainCategory(item.main_category || "Select Main Category");
        setSubCategory(item.sub_category || "Select Category");
        setDescription(item.description || "");
        setVendorName(item.vendor_name || "");
        setVendorNumber(item.vendor_number || "");
        setEndDate(item.end_date || null);
        setOpenModal("edit-expense");
    };

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
                status: item.status === "pending" ? "Pending" : "Approved",
                icon: <DynamicIcon size={20} />,
                invoice: item.invoice,
                color: item.color,
                vendorName: item.vendor_name,
                vendorNumber: item.vendor_number,
                spendMode: item.spend_mode,
                original_expense_id: item.original_expense_id,
                originalItem: {
                    ...item,
                    id: item.id
                },
            };
        });
    } else {
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
            baseRows = filteredWallet.map((item) => ({
                date: dayjs(item.date).format("DD/MM/YYYY"),
                title: "Wallet Deposit",
                note: item.note || "-",
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
    const allNames = [...new Set(baseRows.map(r => r.merchant))];
    const allBranches = [...new Set(baseRows.map(r => r.report))];
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

    if (filterName !== "All") {
        filteredRows = filteredRows.filter(r => r.merchant === filterName);
    }

    if (filterBranch !== "All") {
        filteredRows = filteredRows.filter(r => r.report === filterBranch);
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
        setFilterName("All");
        setFilterBranch("All");
    };

    const isPDF = (src) => {
        if (!src || typeof src !== "string") return false;
        const clean = src.replace(/^"+|"+$/g, "").trim();
        return (
            clean.startsWith("data:application/pdf") ||
            clean.toLowerCase().endsWith(".pdf")
        );
    };

    const handleCloseModal = () => {
        setOpenModal(null);
        setEditData(null);
        resetForm();
    };

    const isWalletTab = activeTab === "income" && userDetails?.role === "user";
    const walletGridStyle = isWalletTab ? { gridTemplateColumns: "1.5fr 2fr 1fr 1fr 1fr" } : {};

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
                                className={`premium-tab ${activeTab === "income" ? "active" : ""}`}
                                onClick={() => handleTabChange("income")}
                            >
                                {userDetails.role === "admin" ? "Income" : "Wallet"}
                            </button>

                            <button
                                className={`premium-tab ${activeTab === "expense" ? "active" : ""}`}
                                onClick={() => handleTabChange("expense")}
                            >
                                Expense
                            </button>
                        </div>

                        <motion.div initial="hidden" animate="visible">
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
                                                JSON.parse(localStorage.getItem("loginDetails"));

                                            if (
                                                activeTab === "income" &&
                                                currentUser?.role !== "admin"
                                            ) {
                                                return CommonToaster(
                                                    "You do not have permission to add income",
                                                    "error"
                                                );
                                            }

                                            resetForm();
                                            setEditData(null);
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
                                    <label>Employee Name</label>
                                    <Select
                                        value={filterName}
                                        onChange={setFilterName}
                                        style={{ width: 180 }}
                                        options={[
                                            { value: "All", label: "All" },
                                            ...allNames.map(n => ({ value: n, label: n }))
                                        ]}
                                    />
                                </div>
                                <div className="filter-item">
                                    <label>Branch</label>
                                    <Select
                                        value={filterBranch}
                                        onChange={setFilterBranch}
                                        style={{ width: 180 }}
                                        options={[
                                            { value: "All", label: "All" },
                                            ...allBranches.map(b => ({ value: b, label: b }))
                                        ]}
                                    />
                                </div>
                                <div className="filter-item">
                                    <label>Search</label>
                                    <input
                                        type="text"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        placeholder="Search Category"
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
                                        <div
                                            className="expense-row expense-header-row"
                                            style={walletGridStyle}
                                        >
                                            <div>DETAILS</div>
                                            {isWalletTab && <div>NOTE</div>}
                                            {userDetails.role !== "user" && <div>EMPLOYEE NAME</div>}
                                            <div>AMOUNT</div>
                                            <div>BRANCH</div>
                                            {!isWalletTab && <div>INVOICE</div>}
                                            {!isWalletTab && <div>VENDOR DETAILS</div>}
                                            {!isWalletTab && <div>SPEND MODE</div>}
                                            <div>STATUS</div>
                                            {userDetails.role !== "admin" && !isWalletTab && <div>ACTION</div>}
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
                                                <div
                                                    key={i}
                                                    className="expense-row"
                                                    style={walletGridStyle}
                                                >
                                                    {/* DETAILS */}
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
                                                    {isWalletTab && <div>{row.note}</div>}
                                                    {userDetails.role !== "user" && <div>{row.merchant}</div>}
                                                    <div>
                                                        {/* Amount */}
                                                        <span>{fmtAmt(row.amount)}</span><br></br>
                                                        {/* Editable / Locked Badge */}
                                                        {userDetails.role === "user" && activeTab === "expense" ? (
                                                            row.original_expense_id && (
                                                                <span className="editable-pill">
                                                                    Editable
                                                                </span>
                                                            )
                                                        ) : null}
                                                    </div>
                                                    <div>{row.report}</div>
                                                    {!isWalletTab && (
                                                        <div>
                                                            {row.invoice ? (
                                                                <button
                                                                    className="view-invoice-btn"
                                                                    onClick={() => handleViewInvoice(row.invoice)}
                                                                >
                                                                    View
                                                                </button>
                                                            ) : (
                                                                <span className="no-invoice">No File</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {!isWalletTab && (
                                                        <div className="vendor-col">
                                                            {row.vendorName ? (
                                                                <span className="title">{row.vendorName}</span>
                                                            ) : (
                                                                <span className="title">No Vendor</span>
                                                            )}
                                                            {row.vendorNumber ? (
                                                                <span className="date">{row.vendorNumber}</span>
                                                            ) : (
                                                                <span className="date">No Number</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {!isWalletTab && (
                                                        <div>
                                                            {row.spendMode ? (
                                                                <span
                                                                    className="spend-mode-badge"
                                                                    style={{
                                                                        padding: "4px 12px",
                                                                        borderRadius: "12px",
                                                                        fontSize: "12px",
                                                                        fontWeight: 600,
                                                                        backgroundColor:
                                                                            row.spendMode === "Cash" ? "#c0b4ff" : "#D4E7FF",
                                                                        color:
                                                                            row.spendMode === "Cash" ? "#3c138b" : "#1E3A8A",
                                                                    }}
                                                                >
                                                                    {row.spendMode}
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: "#999" }}>-</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span
                                                            className={
                                                                row.status === "Approved" || row.status === "Received"
                                                                    ? "status-approved"
                                                                    : row.status === "Pending"
                                                                        ? "status-pending"
                                                                        : "status-rejected"
                                                            }
                                                        >
                                                            {row.status}
                                                        </span>
                                                    </div>
                                                    {userDetails.role !== "admin" && !isWalletTab && (
                                                        <div>
                                                            {activeTab === "expense" && (
                                                                <button
                                                                    className="edit-btn"
                                                                    onClick={() => openEditModal(row.originalItem)}
                                                                >
                                                                    <Icons.Edit size={16} /> Edit
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* PAGINATION */}
                            {!(userDetails.role === "user" && activeTab === "income") && (
                                <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
                                    <Pagination
                                        current={page}
                                        total={PageTotal}
                                        pageSize={10}
                                        showSizeChanger={false}
                                        onChange={(p) => setPage(p)}
                                    />
                                </div>
                            )}

                            {/* MODAL */}
                            <AnimatePresence>
                                {openModal && (
                                    <Modals
                                        open={!!openModal}
                                        type={openModal === "income" ? "income" : "expense"}
                                        isEdit={openModal === "edit-expense"}
                                        onClose={handleCloseModal}
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
                                        endDate={endDate}
                                        setEndDate={setEndDate}
                                        vendorNumber={vendorNumber}
                                        setVendorNumber={setVendorNumber}
                                        vendorName={vendorName}
                                        setVendorName={setVendorName}
                                        editData={editData}
                                    />
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </>
            )}

            {showInvoiceModal && currentInvoices.length > 0 && (
                <div
                    className="invoice-modal-backdrop"
                    onClick={() => setShowInvoiceModal(false)}
                >
                    <div
                        className="invoice-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 15
                            }}
                        >
                            <h3>Invoice Preview ({currentInvoiceIndex + 1} of {currentInvoices.length})</h3>
                            <div style={{ display: "flex", gap: 10 }}>
                                <button
                                    className="close-modal-btn"
                                    onClick={() => setShowInvoiceModal(false)}
                                >
                                    <Icons.X size={20} />
                                </button>
                            </div>
                        </div>

                        <div style={{ position: "relative", textAlign: "center" }}>
                            {currentInvoices.length > 1 && currentInvoiceIndex > 0 && (
                                <button
                                    className="invoice-nav-btn-left"
                                    onClick={handlePrevInvoice}
                                >
                                    <Icons.ChevronLeft size={24} color="white" />
                                </button>
                            )}

                            {isPDF(currentInvoices[currentInvoiceIndex]) ? (
                                <div style={{
                                    width: "auto",
                                    height: "500px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "#f5f5f5",
                                    borderRadius: 10
                                }}>
                                    <Icons.FileText size={80} color="#666" />
                                    <p style={{ marginTop: 20, fontSize: 16, color: "#666" }}>
                                        PDF Document
                                    </p>
                                    <a
                                        href={currentInvoices[currentInvoiceIndex]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            marginTop: 10,
                                            fontSize: 14,
                                            color: "#d4af37",
                                            textDecoration: "underline",
                                            cursor: "pointer",
                                            display: "inline-block"
                                        }}
                                    >
                                        Open in New Tab
                                    </a>
                                </div>
                            ) : (
                                <img
                                    src={currentInvoices[currentInvoiceIndex]}
                                    alt={`Invoice ${currentInvoiceIndex + 1}`}
                                    style={{
                                        borderRadius: 10,
                                        objectFit: "contain",
                                        width: "500px",
                                        height: "420px"
                                    }}
                                />
                            )}
                            {currentInvoices.length > 1 && currentInvoiceIndex < currentInvoices.length - 1 && (
                                <button
                                    onClick={handleNextInvoice}
                                    className="invoice-nav-btn-right"
                                >
                                    <Icons.ChevronRight size={24} color="white" />
                                </button>
                            )}
                        </div>

                        {currentInvoices.length > 1 && (
                            <div style={{
                                display: "flex",
                                justifyContent: "center",
                                gap: 8,
                                marginTop: 20
                            }}>
                                {currentInvoices.map((_, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setCurrentInvoiceIndex(idx)}
                                        style={{
                                            width: idx === currentInvoiceIndex ? 24 : 8,
                                            height: 8,
                                            borderRadius: 4,
                                            background: idx === currentInvoiceIndex ? "#d4af37" : "#ccc",
                                            cursor: "pointer",
                                            transition: "all 0.3s ease"
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
