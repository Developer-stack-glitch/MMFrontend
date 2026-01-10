import React, { useEffect, useState, useRef } from "react";
import { Plus } from "lucide-react";
import { Select, Button } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import Filters from "../Filters/Filters";
import Modals from "./Modals";
import {
    getExpenseCategoriesApi,
    getUserAllExpensesApi,
    getApprovalsApi,
    safeGetLocalStorage
} from "../../Api/action";

import * as Icons from "lucide-react";
import { FullPageLoader } from "../../Common/FullPageLoader";
import InvoicePreviewModal from "../Common/InvoicePreviewModal";

export default function IncomeExpense() {
    const userDetails = safeGetLocalStorage("loginDetails", {});
    const userId = userDetails?.id;
    const userRole = userDetails?.role;

    const [activeTab, setActiveTab] = useState("approval");
    const [openModal, setOpenModal] = useState(null);
    const [editData, setEditData] = useState(null);

    // FORM (Used for resetting, state passed to Modal)
    const [branch, setBranch] = useState("Select Branch");
    const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [total, setTotal] = useState("");
    const [mainCategory, setMainCategory] = useState("Select Main Category");
    const [subCategory, setSubCategory] = useState("Select Category");
    const [description, setDescription] = useState("");
    const [vendorNumber, setVendorNumber] = useState("");

    const [vendorName, setVendorName] = useState("");

    // Invoice Modal
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [currentInvoices, setCurrentInvoices] = useState([]);

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
    const [refreshKey, setRefreshKey] = useState(0);

    // -------------------------------------
    // Load Wallet (Only if needed, maybe keeping for legacy compatibility or if Admin checks wallet)
    // -------------------------------------
    useEffect(() => {
        const loadWallet = () => {
            if (userRole === "user" && userId) {
            }
        };
        // loadWallet(); 
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
            // If it's base64, return as-is
            if (str.startsWith("data:")) return str;
            // If it already has the full path, return as-is
            if (str.startsWith("http") || str.startsWith("/uploads")) return str.startsWith("http") ? str : `${BASE}${str}`;
            // Otherwise, assume it's just a filename
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
        setShowInvoiceModal(true);
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

    // -------------------------------------
    // Load categories
    // -------------------------------------
    useEffect(() => {
        async function loadCategories() {
            const exp = await getExpenseCategoriesApi();
            const grouped = exp.reduce((acc, item) => {
                const main = item.main_category;
                const sub = item.sub_category;
                if (!acc[main]) acc[main] = [];
                acc[main].push(sub);
                return acc;
            }, {});

            setExpenseCategories(grouped);
        }
        loadCategories();

        window.addEventListener("refreshCategories", loadCategories);
        return () => {
            window.removeEventListener("refreshCategories", loadCategories);
        };
    }, []);

    // -------------------------------------
    // Load Income + Expense + Approval
    // -------------------------------------
    useEffect(() => {
        async function loadData() {
            setLoading(true);

            let expenses = { data: [], total: 0 };
            let income = { data: [], total: 0 };

            const res = await getUserAllExpensesApi();

            let pendingApprovals = [];
            pendingApprovals = await getApprovalsApi().catch(() => []);
            expenses = { data: res.expenses || [], total: res.expenses?.length || 0 };
            let combinedApprovals = [...(res.approvals || []), ...pendingApprovals];

            if (userRole === "admin") {
                combinedApprovals = combinedApprovals.filter(item => item.status !== "pending");
            }

            income = { data: combinedApprovals, total: combinedApprovals.length };

            setExpenseData(expenses.data || []);
            setIncomeData(income.data || []);
            if (activeTab === "expense") {
                setPageTotal(expenses.total);
            } else {
                setPageTotal(income.total);
            }

            setLoading(false);
        }

        loadData();
    }, [page, activeTab, userRole, refreshKey]);

    useEffect(() => {
        const reload = () => {
            setRefreshKey((prev) => prev + 1);
        };
        window.addEventListener("incomeExpenseUpdated", reload);
        window.addEventListener("summaryUpdated", reload);
        return () => {
            window.removeEventListener("incomeExpenseUpdated", reload);
            window.removeEventListener("summaryUpdated", reload);
        };
    }, []);

    const resetForm = () => {
        setBranch("Select Branch");
        setDate(dayjs().format("YYYY-MM-DD"));
        setTotal("");
        setMainCategory("Select Main Category");
        setSubCategory("Select Category");
        setDescription("");

        setVendorName("");
        setVendorNumber("");
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        resetForm();
    };

    const filteredExpenseData = applyFilters(expenseData);
    const filteredApprovalsData = applyFilters(incomeData);

    const openEditModal = (item) => {
        const resolvedId = item.original_expense_id || item.id;
        setEditData({
            ...item,
            id: resolvedId
        });
        setBranch(item.branch || "Select Branch");
        setDate(item.date ? dayjs(item.date).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"));
        setTotal(item.total || item.amount || "");
        setMainCategory(item.main_category || "Select Main Category");
        setSubCategory(item.sub_category || "Select Category");
        setDescription(item.description || item.role || "");
        setVendorName(item.vendor_name || "");
        setVendorNumber(item.vendor_number || "");
        setOpenModal(activeTab === "expense" ? "expense" : "edit-approval");

    };

    // Helper to safely display
    const getRowData = () => {
        if (activeTab === "expense") {
            return filteredExpenseData.map((item) => {
                const DynamicIcon = Icons[item.icon] || Icons.Circle;
                return {
                    date: dayjs(item.date).format("DD/MM/YYYY"),
                    title: item.sub_category,
                    description: item.description,
                    merchant: item.user_name,
                    amount: `₹${item.total}`,
                    report: item.branch,
                    status: item.status === "pending" ? "Pending" : item.status === "approved" ? "Approved" : item.status,
                    icon: <DynamicIcon size={20} />,
                    invoice: item.invoice,
                    color: item.color,
                    vendorName: item.vendor_name,
                    vendorNumber: item.vendor_number,
                    spendMode: item.spend_mode,
                    original_expense_id: item.original_expense_id,
                    gst: item.gst,
                    transaction_from: item.transaction_from,
                    transaction_to: item.transaction_to,
                    originalItem: { ...item, id: item.id },
                };
            });
        }
        {
            return filteredApprovalsData.map((item) => {
                const DynamicIcon = Icons[item.icon] || Icons.Circle;
                return {
                    date: dayjs(item.date).format("DD/MM/YYYY"),
                    title: item.sub_category || item.category,
                    note: item.role || item.description || "-",
                    merchant: item.user_name || userDetails.name || "You",
                    amount: `₹${item.total || item.amount}`,
                    report: item.branch || "-",
                    status: item.status,
                    icon: <DynamicIcon size={20} />,
                    invoice: item.invoice,
                    color: item.color || item.categoryColor,
                    gst: item.gst,
                    vendorName: item.vendor_name,
                    vendorNumber: item.vendor_number,
                    transaction_to: item.transaction_to,
                    end_date: item.end_date ? dayjs(item.end_date).format("DD/MM/YYYY") : "-",
                    originalItem: { ...item, id: item.id },
                    is_edit: item.is_edit
                };
            });
        }
    };

    const baseRows = getRowData();

    // -------------------------------------
    // SEARCH / CATEGORY / SORT
    // -------------------------------------
    const allNames = [...new Set(baseRows.map(r => r.merchant))].filter(Boolean);
    const allBranches = [...new Set(baseRows.map(r => r.report))].filter(Boolean);
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
        filteredRows.sort((a, b) => parseInt(a.amount.replace(/\D/g, "")) - parseInt(b.amount.replace(/\D/g, "")));
    } else if (filterAmount === "high") {
        filteredRows.sort((a, b) => parseInt(b.amount.replace(/\D/g, "")) - parseInt(a.amount.replace(/\D/g, "")));
    }

    // Calculate Total Approved Value
    const totalApproved = filteredRows.reduce((acc, row) => {
        if (String(row.status).toLowerCase() === "approved") {
            const val = parseFloat(String(row.amount).replace(/[^0-9.-]+/g, "")) || 0;
            return acc + val;
        }
        return acc;
    }, 0);

    const clearAllFilters = () => {
        setFilterCategory("All");
        setFilterAmount("");
        setSearchText("");
        setFilterName("All");
        setFilterBranch("All");
    };

    const handleExportCSV = () => {
        if (!filteredRows.length) return;

        let headers = [];
        let rowMapper = (row) => [];

        if (activeTab === "approval") {
            headers = ["Date", "Category", "Description", "Branch", "Vendor", "Amount", "GST", "End Date", "Status"];
            rowMapper = (row) => [
                row.date,
                row.title,
                row.note || "-",
                row.report || "-",
                row.vendorName ? `${row.vendorName} ${row.vendorNumber ? `(${row.vendorNumber})` : ""}` : (row.transaction_to || "-"),
                row.amount,
                row.gst || "No",
                row.end_date || "-",
                row.status
            ];
        } else {
            headers = ["Date", "Category", "Description", "Vendor", "Transaction From", "Transaction To", "Mode", "Amount", "Branch", "Status"];
            rowMapper = (row) => [
                row.date,
                row.title,
                row.description || "-",
                row.vendorName ? `${row.vendorName} ${row.vendorNumber ? `(${row.vendorNumber})` : ""}` : (row.transaction_to || "-"),
                row.transaction_from || "-",
                row.transaction_to || "-",
                row.spendMode || "-",
                row.amount,
                row.report || "-",
                row.status
            ];
        }

        const csvContent = [
            headers.join(","),
            ...filteredRows.map(row => rowMapper(row).map(e => `"${String(e).replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${activeTab}_export_${dayjs().format("YYYY-MM-DD")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };



    const handleCloseModal = () => {
        setOpenModal(null);
        setEditData(null);
        resetForm();
    };

    const isApprovalTab = activeTab === "approval";
    const gridStyle = { gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 0fr" };
    const approvalGridStyle = {
        gridTemplateColumns: userRole === "admin"
            ? "1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
            : "1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 0.8fr"
    };

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
                                className={`premium-tab ${activeTab === "approval" ? "active" : ""}`}
                                onClick={() => handleTabChange("approval")}
                            >
                                {userRole === "admin" ? "Approve" : "Approve"}
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
                                    {activeTab === "expense" ? "Expenses" : "Approvals"}
                                </h1>
                                <div className="expense-actions">
                                    <button
                                        onClick={handleExportCSV}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "8px 14px",
                                            backgroundColor: "#fff",
                                            border: "1px solid #e0e0e0",
                                            borderRadius: "8px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: 500,
                                            transition: "all 0.2s",
                                            marginRight: "8px",
                                            color: "#333"
                                        }}
                                    >
                                        <Icons.Download size={16} /> Export CSV
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={() => {
                                            setOpenModal(activeTab);
                                            resetForm();
                                            setEditData(null);
                                        }}
                                    >
                                        <Plus size={16} /> New {activeTab === "approval" ? "Approval" : "Expense"}
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
                                    <label>Name</label>
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
                                        placeholder="Search..."
                                        style={{
                                            width: 240,
                                            padding: "8px 10px",
                                            border: "1px solid #ccc",
                                            borderRadius: 6,
                                            height: 40,
                                        }}
                                    />
                                </div>
                                <div className="filter-item" style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ height: 24 }}></div> {/* Spacer to align with inputs having labels */}
                                    <Button className="clear-btn" onClick={clearAllFilters} style={{ marginTop: 0 }}>
                                        Clear All
                                    </Button>
                                </div>

                                {/* TOTAL STAT PILL */}
                                <div className={`simple-stat-pill ${activeTab === "expense" ? "expense" : "approved"}`}>
                                    <span style={{ fontSize: 16, color: "#2a2a2a" }}>{activeTab === "expense" ? "Total Expense" : "Total Approved"}:</span>
                                    <strong>{fmtAmt(totalApproved)}</strong>
                                </div>
                            </div>

                            {/* TABLE */}
                            <div className="table-scroll-wrapper">
                                <div className="expense-table-wrapper">
                                    <div className="expense-table">
                                        <div
                                            className="expense-row expense-header-row"
                                            style={isApprovalTab ? approvalGridStyle : gridStyle}
                                        >
                                            <div>DETAILS</div>
                                            {isApprovalTab ? (
                                                <>
                                                    <div>DESCRIPTION</div>
                                                    <div>BRANCH</div>
                                                    <div>VENDOR</div>
                                                    <div>AMOUNT</div>
                                                    <div>GST</div>
                                                    <div>END DATE</div>
                                                    <div>STATUS</div>
                                                    {userRole !== "admin" && <div>ACTION</div>}
                                                </>
                                            ) : (
                                                <>
                                                    <div>DESCRIPTION</div>
                                                    <div>VENDOR</div>
                                                    <div>TRANSACTION</div>
                                                    <div>MODE</div>
                                                    <div>AMOUNT</div>
                                                    <div>BRANCH</div>
                                                    <div>STATUS</div>
                                                    {/* <div>ACTION</div> */}
                                                </>
                                            )}
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
                                                    style={isApprovalTab ? approvalGridStyle : gridStyle}
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
                                                            {/* Invoice Button */}
                                                            {row.invoice && String(row.invoice).trim() !== "" && String(row.invoice).trim() !== "[]" && (
                                                                <button
                                                                    className="view-invoice-btn"
                                                                    onClick={() => handleViewInvoice(row.invoice)}
                                                                    style={{ marginTop: 5 }}
                                                                >
                                                                    View Invoice
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {isApprovalTab ? (
                                                        <>
                                                            <div>{row.note}</div>
                                                            <div>{row.report}</div>
                                                            <div className="vendor-col">
                                                                {row.vendorName ? (
                                                                    <>
                                                                        <span className="title">{row.vendorName}</span>
                                                                        {row.vendorNumber && <span className="date">{row.vendorNumber}</span>}
                                                                    </>
                                                                ) : row.transaction_to || "-"}
                                                            </div>
                                                            <div>{row.amount}<br></br>
                                                                {Boolean(row.is_edit) && <span className="editable-pill">Editable</span>}
                                                            </div>
                                                            <div>{row.gst === 'Yes' ? <span className="status-badge" style={{ background: '#d4377f', color: 'white' }}>GST</span> : '-'}</div>
                                                            <div>{row.end_date}</div>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                    <span className={row.status === "approved" ? "status-approved" : row.status === "pending" ? "status-pending" : "status-rejected"}>
                                                                        {row.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {userRole !== "admin" && (
                                                                <div>
                                                                    {/* Action for Approval */}
                                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                                        <button className="edit-btn" onClick={() => openEditModal(row.originalItem || row)}>
                                                                            <Icons.Edit size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="vendor-col">
                                                                {row.description || "-"}
                                                            </div>
                                                            <div className="vendor-col">
                                                                {row.vendorName ? (
                                                                    <>
                                                                        <span className="title">{row.vendorName}</span>
                                                                        {row.vendorNumber && <span className="date">{row.vendorNumber}</span>}
                                                                    </>
                                                                ) : row.transaction_to || "-"}
                                                            </div>
                                                            <div className="vendor-col">
                                                                {row.transaction_from ? (
                                                                    <>
                                                                        <span className="title">From: {row.transaction_from}</span>
                                                                        <span className="date">To: {row.transaction_to}</span>
                                                                    </>
                                                                ) : "-"}
                                                            </div>
                                                            <div>{row.spendMode}</div>
                                                            <div>{row.amount}</div>
                                                            <div>{row.report}</div>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                    <span className={row.status === "approved" ? "status-approved" : row.status === "pending" ? "status-pending" : "status-rejected"}>
                                                                        {row.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* MODAL */}
                            <AnimatePresence>
                                {openModal && (
                                    <Modals
                                        open={!!openModal}
                                        type={openModal}
                                        isEdit={openModal === "edit-approval" || (openModal === "expense" && editData)}
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
                <InvoicePreviewModal
                    open={showInvoiceModal}
                    onClose={() => setShowInvoiceModal(false)}
                    invoices={currentInvoices}
                />
            )}
        </>
    );
}
