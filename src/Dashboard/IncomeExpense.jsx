import React, { useEffect, useState, useRef } from "react";
import { Plus } from "lucide-react";
import { Select, Button, Pagination, Popconfirm } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import Filters from "../Filters/Filters";
import Modals from "./Modals";
import {
    getExpenseCategoriesApi,
    getUserAllExpensesApi,
    getApprovalsApi,
    safeGetLocalStorage,
    deleteExpenseApi,
    getVendorsApi,
    getTransactionFilterOptionsApi
} from "../../Api/action";

import * as Icons from "lucide-react";

import { CommonToaster } from "../../Common/CommonToaster";
import InvoicePreviewModal from "../Common/InvoicePreviewModal";
import IncomeExpenseSkeleton from "./IncomeExpenseSkeleton";


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

    // Vendor Details Modal
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [selectedVendorStats, setSelectedVendorStats] = useState(null);
    const [vendorList, setVendorList] = useState([]);

    // Description Modal
    const [showDescriptionModal, setShowDescriptionModal] = useState(false);
    const [selectedDescription, setSelectedDescription] = useState("");

    const [globalFilterOptions, setGlobalFilterOptions] = useState({ names: [], branches: [] });

    useEffect(() => {
        getVendorsApi().then((res) => {
            setVendorList(res || []);
        }).catch(err => console.error("Failed to load vendors", err));

        getTransactionFilterOptionsApi().then((res) => {
            setGlobalFilterOptions(res || { names: [], branches: [] });
        }).catch(err => console.error("Failed to load filter options", err));
    }, []);

    const handleViewVendor = (row) => {
        const vName = row.vendorName || row.transaction_to;
        if (!vName) return;

        // Find full details from vendorList
        const fullVendor = vendorList.find(v => v.name === vName);

        // Calculate total for this vendor
        const relevantExpenses = expenseData.filter(e =>
            (e.vendor_name === vName) || (e.transaction_to === vName)
        );
        const totalPaid = relevantExpenses.reduce((sum, e) => {
            const val = parseFloat(String(e.total || e.amount || 0).replace(/[^0-9.-]+/g, "")) || 0;
            return sum + val;
        }, 0);

        setSelectedVendorStats({
            name: vName,
            company: fullVendor?.company_name || "-",
            number: row.vendorNumber || fullVendor?.number || "-",
            email: fullVendor?.email || "-",
            address: fullVendor?.address || "-",
            gst: row.vendorGst || fullVendor?.gst || "-",
            totalPaid: fmtAmt(totalPaid),
            count: relevantExpenses.length
        });
        setShowVendorModal(true);
    };

    const handleViewDescription = (desc) => {
        setSelectedDescription(desc || "");
        setShowDescriptionModal(true);
    };

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
    const [pageSize, setPageSize] = useState(10);

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

    const fmtAmt = (n) => {
        const val = Number(String(n ?? 0).replace(/[^0-9.-]+/g, "")) || 0;
        return `₹${val.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    // -------------------------------------
    // Invoice Slider
    // -------------------------------------
    const handleViewInvoice = (invoiceData) => {
        if (!invoiceData) return;

        const BASE = import.meta.env.VITE_API_URL.replace(/\/$/, "");
        let invoicesArray = [];

        const normalize = (item) => {
            if (!item) return null;
            let str = String(item).trim().replace(/^"+|"+$/g, "");
            if (str.startsWith("data:")) return str;
            if (str.startsWith("http") || str.startsWith("/uploads")) return str.startsWith("http") ? str : `${BASE}${str}`;
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



    const getDateRange = (f) => {
        if (!f.value) return { startDate: null, endDate: null };
        const type = f.filterType;
        let start, end;

        if (!f.compareMode) {
            start = dayjs(f.value).startOf(type).format("YYYY-MM-DD");
            end = dayjs(f.value).endOf(type).format("YYYY-MM-DD");
        } else {
            if (!Array.isArray(f.value) || f.value.length !== 2)
                return { startDate: null, endDate: null };
            start = dayjs(f.value[0]).startOf('day').format("YYYY-MM-DD");
            end = dayjs(f.value[1]).endOf('day').format("YYYY-MM-DD");
        }
        return { startDate: start, endDate: end };
    };

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
    // -------------------------------------
    // Load Income + Expense + Approval
    // -------------------------------------
    useEffect(() => {
        async function loadData() {
            setLoading(true);

            let expenses = { data: [], total: 0 };
            let income = { data: [], total: 0 };

            const { startDate, endDate } = getDateRange(filters);

            // Pass page and limit, plus filters
            const res = await getUserAllExpensesApi(page, pageSize, {
                name: filterName,
                branch: filterBranch,
                startDate,
                endDate
            });

            let pendingResults = { data: [], total: 0 };
            try {
                pendingResults = await getApprovalsApi(page, pageSize, { startDate, endDate });
                // Handle legacy response if it was just an array
                if (Array.isArray(pendingResults)) {
                    pendingResults = { data: pendingResults, total: pendingResults.length };
                }
            } catch (e) {
                pendingResults = { data: [], total: 0 };
            }

            expenses = {
                data: res.expenses || [],
                total: res.expensesTotal || 0
            };

            let combinedApprovals = [...(res.approvals || []), ...(pendingResults.data || [])];
            let combinedTotal = (res.approvalsTotal || 0) + (pendingResults.total || 0);

            if (userRole === "admin" || userRole === "superadmin") {
                combinedApprovals = combinedApprovals.filter(item => item.status !== "pending");
                combinedTotal = res.approvalsTotal || 0;
            }

            // Client-side filtering for pending items might be needed if they are mixed in
            if (filterName !== 'All') {
            }

            income = { data: combinedApprovals, total: combinedTotal };

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
    }, [page, activeTab, userRole, refreshKey, filterName, filterBranch, pageSize, filters]);

    // Reset to page 1 when filters change (except page change itself)
    useEffect(() => {
        setPage(1);
    }, [filterName, filterBranch, filters, activeTab]);

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
        setPage(1); // Reset page on tab change
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
                    amount: fmtAmt(item.total),
                    report: item.branch,
                    status: item.status === "pending" ? "Pending" : item.status === "approved" ? "Approved" : item.status,
                    icon: <DynamicIcon size={20} />,
                    invoice: item.invoice,
                    color: item.color,
                    vendorName: item.vendor_name,
                    vendorNumber: item.vendor_number,
                    vendorGst: item.vendor_gst,
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
                    amount: fmtAmt(item.total || item.amount),
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
    const allNames = globalFilterOptions?.names?.length ? globalFilterOptions.names : [...new Set(baseRows.map(r => r.merchant))].filter(Boolean);
    const allBranches = globalFilterOptions?.branches?.length ? globalFilterOptions.branches : [...new Set(baseRows.map(r => r.report))].filter(Boolean);
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
        setPage(1);
    };

    const handleExportCSV = async () => {
        setLoading(true);
        try {
            let allExportItems = [];
            const LARGE_LIMIT = 10000;

            if (activeTab === "expense") {
                const res = await getUserAllExpensesApi(1, LARGE_LIMIT, { name: filterName, branch: filterBranch });
                const rawExpenses = applyFilters(res.expenses || []);
                allExportItems = rawExpenses.map((item) => {
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
                        vendorName: item.vendor_name,
                        vendorNumber: item.vendor_number,
                        transaction_from: item.transaction_from,
                        transaction_to: item.transaction_to,
                        spendMode: item.spend_mode,
                        gst: item.gst
                    };
                });
            } else {
                const res = await getUserAllExpensesApi(1, LARGE_LIMIT, { name: filterName, branch: filterBranch });
                let pendingResults = { data: [] };
                try {
                    pendingResults = await getApprovalsApi(1, LARGE_LIMIT);
                } catch (e) { }

                let combinedApprovals = [...(res.approvals || []), ...(Array.isArray(pendingResults) ? pendingResults : (pendingResults.data || []))];

                if (userRole === "admin" || userRole === "superadmin") {
                    combinedApprovals = combinedApprovals.filter(item => item.status !== "pending");
                }

                const rawApprovals = applyFilters(combinedApprovals);

                allExportItems = rawApprovals.map((item) => {
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
                        gst: item.gst,
                        vendorName: item.vendor_name,
                        vendorNumber: item.vendor_number,
                        transaction_to: item.transaction_to,
                        end_date: item.end_date ? dayjs(item.end_date).format("DD/MM/YYYY") : "-",
                    };
                });
            }

            // Apply Search filter client-side if active
            if (searchText.trim()) {
                allExportItems = allExportItems.filter((r) =>
                    `${r.title} ${r.merchant} ${r.date} ${r.report}`
                        .toLowerCase()
                        .includes(searchText.toLowerCase())
                );
            }

            if (!allExportItems.length) {
                CommonToaster("No data to export", "info");
                setLoading(false);
                return;
            }

            // Helper for invoice URLs
            const getInvoiceUrls = (invoiceData) => {
                if (!invoiceData || String(invoiceData).trim() === "" || String(invoiceData) === "[]") return "-";
                const BASE = import.meta.env.VITE_API_URL.replace(/\/$/, "");
                const normalize = (item) => {
                    if (!item) return "";
                    let str = String(item).trim().replace(/^"+|"+$/g, "");
                    if (str.startsWith("data:")) return "base64-content";
                    if (str.startsWith("http") || str.startsWith("/uploads")) return str.startsWith("http") ? str : `${BASE}${str}`;
                    return `${BASE}/uploads/invoices/${str}`;
                };

                let arr = [];
                if (Array.isArray(invoiceData)) {
                    arr = invoiceData;
                } else if (typeof invoiceData === "string" && invoiceData.startsWith("[")) {
                    try {
                        const parsed = JSON.parse(invoiceData);
                        if (Array.isArray(parsed)) arr = parsed;
                        else arr = [invoiceData];
                    } catch { arr = [invoiceData]; }
                } else {
                    arr = [invoiceData];
                }
                return arr.map(normalize).filter(Boolean).join(" ; ");
            };

            let headers = [];
            let rowMapper = (row) => [];

            if (activeTab === "approval") {
                headers = ["Date", "Category", "Sender", "Description", "Branch", "Vendor", "Amount", "GST", "End Date", "Status", "Invoice"];
                rowMapper = (row) => [
                    row.date,
                    row.title,
                    row.merchant || "-",
                    row.note || "-",
                    row.report || "-",
                    row.vendorName ? `${row.vendorName} ${row.vendorNumber ? `(${row.vendorNumber})` : ""}` : (row.transaction_to || "-"),
                    row.amount.replace("₹", "").trim(),
                    row.gst || "No",
                    row.end_date || "-",
                    row.status,
                    getInvoiceUrls(row.invoice)
                ];
            } else {
                headers = ["Date", "Category", "Sender", "Description", "Vendor", "Transaction From", "Transaction To", "Mode", "Amount", "GST", "Branch", "Status", "Invoice"];
                rowMapper = (row) => [
                    row.date,
                    row.title,
                    row.merchant || "-",
                    row.description || "-",
                    row.vendorName ? `${row.vendorName} ${row.vendorNumber ? `(${row.vendorNumber})` : ""}` : (row.transaction_to || "-"),
                    row.transaction_from || "-",
                    row.transaction_to || "-",
                    row.spendMode || "-",
                    row.amount.replace("₹", "").trim(),
                    row.gst || "No",
                    row.report || "-",
                    row.status,
                    getInvoiceUrls(row.invoice)
                ];
            }

            const csvContent = "\uFEFF" + [
                headers.join(","),
                ...allExportItems.map(row => rowMapper(row).map(e => `"${String(e).replace(/"/g, '""')}"`).join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${activeTab}_export_${dayjs().format("YYYY-MM-DD")}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Export failed", error);
            CommonToaster("Export failed", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setOpenModal(null);
        setEditData(null);
        resetForm();
    };

    const handleQuickAddExpense = (item) => {
        setEditData(null);
        setBranch(item.branch || "Select Branch");
        setDate(item.date ? dayjs(item.date).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"));
        setTotal(item.amount || item.total || "");
        setMainCategory(item.main_category || "Select Main Category");
        setSubCategory(item.sub_category || item.category || "Select Category");
        setDescription(item.description || item.role || "");
        setVendorName(item.vendor_name || "");
        setVendorNumber(item.vendor_number || "");
        setOpenModal("expense");
    };

    const handleDelete = async (row) => {
        const idToDelete = row.id || row.original_expense_id;

        // Optimistic UI Update
        setExpenseData(prev => prev.filter(item => item.id !== idToDelete));

        try {
            await deleteExpenseApi(idToDelete);
            CommonToaster("Expense deleted successfully", "success");
            window.dispatchEvent(new Event("incomeExpenseUpdated"));
            window.dispatchEvent(new Event("summaryUpdated"));
        } catch (error) {
            CommonToaster(error.message || "Failed to delete expense", "error");
            setRefreshKey(prev => prev + 1);
        }
    };

    const isApprovalTab = activeTab === "approval";
    const gridStyle = ((userRole === "admin" || userRole === "superadmin") && activeTab === "expense")
        ? { gridTemplateColumns: "55px 240px 1.5fr 160px 160px 120px 80px 130px 120px 100px" }
        : { gridTemplateColumns: "55px 240px 1.5fr 160px 160px 120px 80px 130px 120px" };
    const approvalGridStyle = {
        gridTemplateColumns: "55px 240px 1.5fr 140px 120px 80px 130px 120px 100px"
    };

    return (
        <>
            <Filters onFilterChange={setFilters} />
            {loading ? (
                <IncomeExpenseSkeleton />
            ) : (

                <div className="expense-container">
                    {/* TABS */}
                    <div className="tabs-wrapper">
                        <button
                            className={`premium-tab ${activeTab === "approval" ? "active" : ""}`}
                            onClick={() => handleTabChange("approval")}
                        >
                            {userRole === "admin" || userRole === "superadmin" ? "Approved" : "Approved"}
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
                                {activeTab === "expense" ? "Expenses" : "Approved"}
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
                                {!((userRole === "admin" || userRole === "superadmin") && activeTab === "approval") && (
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
                                )}
                            </div>
                        </div>

                        {/* FILTER UI */}
                        <div className="filter-card">
                            <div className="filter-left">
                                <div className="search-wrapper">
                                    <Icons.Search size={16} className="search-icon" />
                                    <input
                                        type="text"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        placeholder="Search by name, branch, etc..."
                                    />
                                </div>

                                <div className="select-wrapper">
                                    <Select
                                        value={filterAmount}
                                        onChange={(v) => setFilterAmount(v)}
                                        style={{ width: 140 }}
                                        placeholder="Amount"
                                        suffixIcon={<Icons.ArrowUpDown size={14} />}
                                        options={[
                                            { value: "", label: "Amount: All" },
                                            { value: "low", label: "Low → High" },
                                            { value: "high", label: "High → Low" },
                                        ]}
                                    />
                                </div>

                                <div className="select-wrapper">
                                    <Select
                                        value={filterName}
                                        onChange={(v) => { setFilterName(v); setPage(1); }}
                                        style={{ width: 150 }}
                                        placeholder="Name"
                                        showSearch
                                        suffixIcon={<Icons.User size={14} />}
                                        options={[
                                            { value: "All", label: "Name: All" },
                                            ...allNames.map(n => ({ value: n, label: n }))
                                        ]}
                                    />
                                </div>

                                <div className="select-wrapper">
                                    <Select
                                        value={filterBranch}
                                        onChange={(v) => { setFilterBranch(v); setPage(1); }}
                                        style={{ width: 150 }}
                                        placeholder="Branch"
                                        showSearch
                                        suffixIcon={<Icons.Building2 size={14} />}
                                        options={[
                                            { value: "All", label: "Branch: All" },
                                            ...allBranches.map(b => ({ value: b, label: b }))
                                        ]}
                                    />
                                </div>

                                {(filterCategory !== "All" || filterAmount !== "" || filterName !== "All" || filterBranch !== "All" || searchText) && (
                                    <button className="clear-filter-btn" onClick={clearAllFilters}>
                                        <Icons.X size={14} /> Clear
                                    </button>
                                )}
                            </div>

                            {/* TOTAL STAT */}
                            <div className={`total-stat-box ${activeTab === "expense" ? "is-expense" : "is-approved"}`}>
                                <span>{activeTab === "expense" ? "Total Expense" : "Total Approved"}</span>
                                <strong className="total-amount">{fmtAmt(totalApproved)}</strong>
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
                                        <div className="sno-col" style={{ fontWeight: 700 }}>S.NO</div>
                                        <div>DETAILS</div>
                                        {isApprovalTab ? (
                                            <>
                                                <div>DESCRIPTION</div>
                                                <div>BRANCH</div>
                                                <div>AMOUNT</div>
                                                <div>GST</div>
                                                <div>END DATE</div>
                                                <div>STATUS</div>
                                                <div>ACTION</div>
                                            </>
                                        ) : (
                                            <>
                                                <div>DESCRIPTION</div>
                                                <div>VENDOR</div>
                                                <div>TRANSACTION</div>

                                                <div>AMOUNT</div>
                                                <div>GST</div>
                                                <div>BRANCH</div>
                                                <div>STATUS</div>
                                                {(userRole === "admin" || userRole === "superadmin") && <div>ACTION</div>}
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
                                                <div className="col sno-col" style={{ fontWeight: 600, justifyContent: "flex-start", color: '#666' }}>
                                                    {(page - 1) * pageSize + i + 1}.
                                                </div>
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
                                                            minWidth: 40,
                                                        }}
                                                    >
                                                        {row.icon}
                                                    </div>
                                                    <div className="details-text">
                                                        <span className="date">{row.date}</span>
                                                        <span className="title" style={{ fontWeight: 700, fontSize: 13 }}>{row.title}</span>
                                                        <span className="sender-name-inline" style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>{row.merchant}</span>
                                                        {/* Invoice Button */}
                                                        {row.invoice && String(row.invoice).trim() !== "" && String(row.invoice).trim() !== "[]" && (
                                                            <button
                                                                className="view-invoice-btn"
                                                                onClick={() => handleViewInvoice(row.invoice)}
                                                            >
                                                                View Invoice
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {isApprovalTab ? (
                                                    <>
                                                        <div>
                                                            <div className="text-truncate-2" title={row.note}>
                                                                {row.note}
                                                            </div>
                                                            {row.note && row.note.length > 50 && (
                                                                <button
                                                                    onClick={() => handleViewDescription(row.note)}
                                                                    className="view-invoice-btn"
                                                                    style={{
                                                                        fontSize: '10px',
                                                                        padding: '2px 8px',
                                                                        marginTop: '4px',
                                                                        height: 'auto',
                                                                        lineHeight: 'normal',
                                                                        width: 'max-content',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    View
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div>{row.report}</div>
                                                        <div style={{ fontWeight: 600 }}>{row.amount}<br></br>
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
                                                        <div>
                                                            {(userRole === "admin" || userRole === "superadmin") ? (
                                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                                    <button className="edit-btn" onClick={() => openEditModal(row.originalItem || row)}>
                                                                        <Icons.Edit size={16} />
                                                                    </button>
                                                                    <Popconfirm
                                                                        title="Delete this approved item?"
                                                                        description="This action will delete the associated expense entry."
                                                                        onConfirm={() => handleDelete(row.originalItem || row)}
                                                                        okText="Yes"
                                                                        cancelText="No"
                                                                    >
                                                                        <button className="edit-btn" style={{ color: '#ff4d4f' }}>
                                                                            <Icons.Trash2 size={16} />
                                                                        </button>
                                                                    </Popconfirm>
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                                    <button
                                                                        className="edit-btn"
                                                                        onClick={() => handleQuickAddExpense(row.originalItem || row)}
                                                                        title="Add to Expense"
                                                                        style={{
                                                                            backgroundColor: '#edf7ed',
                                                                            color: '#2e7d32',
                                                                            border: '1px solid #c8e6c9'
                                                                        }}
                                                                    >
                                                                        Expense <Plus size={16} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="vendor-col">
                                                            <div className="text-truncate-2" title={row.description}>
                                                                {row.description || "-"}
                                                            </div>
                                                            {row.description && row.description.length > 50 && (
                                                                <button
                                                                    onClick={() => handleViewDescription(row.description)}
                                                                    className="view-invoice-btn"
                                                                    style={{
                                                                        fontSize: '10px',
                                                                        padding: '2px 8px',
                                                                        marginTop: '4px',
                                                                        height: 'auto',
                                                                        lineHeight: 'normal',
                                                                        width: 'auto',
                                                                        display: 'inline-flex'
                                                                    }}
                                                                >
                                                                    View
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="vendor-col">
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                                {row.vendorName ? (
                                                                    <>
                                                                        <span className="title">{row.vendorName}</span>
                                                                        {row.vendorNumber && <span className="date">{row.vendorNumber}</span>}
                                                                    </>
                                                                ) : (
                                                                    <span className="title">{row.transaction_to || "-"}</span>
                                                                )}
                                                                <button
                                                                    onClick={() => handleViewVendor(row)}
                                                                    className="view-invoice-btn"
                                                                    style={{
                                                                        fontSize: '10px',
                                                                        padding: '2px 8px',
                                                                        marginTop: '4px',
                                                                        height: 'auto',
                                                                        lineHeight: 'normal',
                                                                        width: 'auto'
                                                                    }}
                                                                >
                                                                    View Info
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="vendor-col">
                                                            {row.transaction_from ? (
                                                                <>
                                                                    <span className="title" style={{ fontSize: 13 }}>{row.transaction_from}</span>
                                                                    <span className="title" style={{ fontSize: 13 }}>{row.spendMode}</span>
                                                                </>
                                                            ) : "-"}
                                                        </div>
                                                        <div style={{ fontWeight: 600 }}>{row.amount}</div>
                                                        <div>{row.gst === 'Yes' ? <span className="status-badge" style={{ background: '#d4377f', color: 'white' }}>GST</span> : '-'}</div>
                                                        <div>{row.report}</div>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                <span className={row.status === "approved" ? "status-approved" : row.status === "pending" ? "status-pending" : "status-rejected"}>
                                                                    {row.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {(userRole === "admin" || userRole === "superadmin") && (
                                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                                <button className="edit-btn" onClick={() => openEditModal(row.originalItem || row)}>
                                                                    <Icons.Edit size={16} />
                                                                </button>
                                                                <Popconfirm
                                                                    title="Delete this expense?"
                                                                    description="This action cannot be undone and will revert any associated approval to pending."
                                                                    onConfirm={() => handleDelete(row.originalItem || row)}
                                                                    okText="Yes"
                                                                    cancelText="No"
                                                                >
                                                                    <button className="edit-btn" style={{ color: '#ff4d4f' }}>
                                                                        <Icons.Trash2 size={16} />
                                                                    </button>
                                                                </Popconfirm>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div >

                        {/* MODAL */}
                        < AnimatePresence >
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
                            )
                            }
                        </AnimatePresence >

                        {/* Pagination */}
                        {PageTotal > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', alignItems: 'center', gap: '20px' }}>
                                <div className="rows-per-page-container">
                                    Rows per page:
                                    <Select
                                        value={pageSize}
                                        onChange={(v) => {
                                            setPageSize(v);
                                            setPage(1);
                                        }}
                                        size="small"
                                        className="rows-per-page-select"
                                        style={{ width: 70 }}
                                        options={[
                                            { value: 10, label: '10' },
                                            { value: 25, label: '25' },
                                            { value: 50, label: '50' },
                                            { value: 100, label: '100' },
                                        ]}
                                    />
                                </div>
                                <Pagination
                                    current={page}
                                    total={PageTotal}
                                    pageSize={pageSize}
                                    onChange={(p) => setPage(p)}
                                    showSizeChanger={false}
                                />
                            </div>
                        )}

                    </motion.div >
                </div>
            )}

            {showInvoiceModal && currentInvoices.length > 0 && (
                <InvoicePreviewModal
                    open={showInvoiceModal}
                    onClose={() => setShowInvoiceModal(false)}
                    invoices={currentInvoices}
                />
            )}

            {/* Vendor Stats Modal */}
            <AnimatePresence>
                {showVendorModal && selectedVendorStats && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} onClick={() => setShowVendorModal(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                background: '#fff', padding: '24px', borderRadius: '12px',
                                width: '350px', maxWidth: '90%'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                Vendor Details
                            </h3>
                            <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
                                <div><strong>Name:</strong> {selectedVendorStats.name}</div>
                                <div><strong>Company:</strong> {selectedVendorStats.company}</div>
                                <div><strong>Number:</strong> {selectedVendorStats.number}</div>
                                <div><strong>Email:</strong> {selectedVendorStats.email}</div>
                                <div><strong>Address:</strong> {selectedVendorStats.address}</div>
                                <div><strong>GST Number:</strong> {selectedVendorStats.gst}</div>
                                <div style={{ marginTop: '10px', fontSize: '16px', color: '#d4af37' }}>
                                    <strong>Total Paid:</strong> {selectedVendorStats.totalPaid}
                                </div>
                                <div style={{ fontSize: '12px', color: '#888' }}>
                                    (Across {selectedVendorStats.count} transactions)
                                </div>
                            </div>
                            <div style={{ marginTop: '24px', textAlign: 'right' }}>
                                <Button onClick={() => setShowVendorModal(false)}>Close</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Description Modal */}
            <AnimatePresence>
                {showDescriptionModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} onClick={() => setShowDescriptionModal(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                background: '#fff', padding: '24px', borderRadius: '12px',
                                width: '500px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 style={{ marginTop: 0, marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                Full Description
                            </h3>
                            <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#333', whiteSpace: 'pre-wrap' }}>
                                {selectedDescription}
                            </div>
                            <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                <Button onClick={() => setShowDescriptionModal(false)}>Close</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
