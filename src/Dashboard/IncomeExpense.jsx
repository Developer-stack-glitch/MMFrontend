import React, { useEffect, useState, useRef } from "react";
import { Plus } from "lucide-react";
import { Select, Button, Pagination, Popconfirm, Dropdown, Tooltip } from "antd";
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
    getTransactionFilterOptionsApi,
    getExpensesTotalStatsApi
} from "../../Api/action";

import * as Icons from "lucide-react";

import { CommonToaster } from "../../Common/CommonToaster";
import InvoicePreviewModal from "../Common/InvoicePreviewModal";
import IncomeExpenseSkeleton from "./IncomeExpenseSkeleton";
import { DataTableFacetedFilter } from "@/components/ui/faceted-filter";
import { DataTableSingleFilter } from "@/components/ui/single-filter";


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

    const [globalFilterOptions, setGlobalFilterOptions] = useState({ names: [], branches: [], transactionSources: [], categories: [], mainCategories: [], vendors: [] });

    useEffect(() => {
        getVendorsApi().then((res) => {
            setVendorList(res || []);
        }).catch(err => console.error("Failed to load vendors", err));

        getTransactionFilterOptionsApi().then((res) => {
            setGlobalFilterOptions(res || { names: [], branches: [], transactionSources: [], categories: [], mainCategories: [], vendors: [] });
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
    const [filterMainCategory, setFilterMainCategory] = useState([]);
    const [filterCategory, setFilterCategory] = useState([]); // Sub Category
    const [filterName, setFilterName] = useState([]);
    const [filterBranch, setFilterBranch] = useState([]);
    const [filterTransaction, setFilterTransaction] = useState([]); // Transaction Source
    const [filterVendor, setFilterVendor] = useState([]);
    const [filterGST, setFilterGST] = useState([]);
    const [filterAmount, setFilterAmount] = useState("");
    const [minAmount, setMinAmount] = useState("");
    const [maxAmount, setMaxAmount] = useState("");
    const [tempMin, setTempMin] = useState("");
    const [tempMax, setTempMax] = useState("");
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
    const [totalStats, setTotalStats] = useState({ totalExpense: 0, totalApproved: 0 });
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
        let start, end;

        if (Array.isArray(f.value) && f.value.length === 2) {
            start = dayjs(f.value[0]).startOf('day').format("YYYY-MM-DD");
            end = dayjs(f.value[1]).endOf('day').format("YYYY-MM-DD");
        } else {
            // Fallback for single value (shouldn't happen with new Filters)
            start = dayjs(f.value).startOf(f.filterType || 'day').format("YYYY-MM-DD");
            end = dayjs(f.value).endOf(f.filterType || 'day').format("YYYY-MM-DD");
        }
        return { startDate: start, endDate: end };
    };

    const applyFilters = (items) => {
        if (!items || !Array.isArray(items)) return [];
        if (!filters.value) return items;

        const isRange = Array.isArray(filters.value) && filters.value.length === 2;

        if (isRange) {
            const [start, end] = filters.value;
            const s = dayjs(start).startOf("day");
            const e = dayjs(end).endOf("day");

            return items.filter((item) => {
                const d = dayjs(item.date);
                return d.isBetween(s, e, "day", "[]");
            });
        }

        // Fallback for single value
        const type = filters.filterType;
        return items.filter((item) => {
            const d = dayjs(item.date);
            if (type === "date") return d.isSame(filters.value, "day");
            if (type === "week") return d.isSame(filters.value, "week");
            if (type === "month") return d.isSame(filters.value, "month");
            if (type === "year") return d.isSame(filters.value, "year");
            return true;
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

            const { startDate, endDate } = getDateRange(filters);

            // Get Total Stats with filters
            const stats = await getExpensesTotalStatsApi({
                name: filterName,
                branch: filterBranch,
                transaction: filterTransaction,
                category: filterCategory,
                main_category: filterMainCategory,
                vendor: filterVendor,
                gst: filterGST,
                minAmount,
                maxAmount,
                startDate,
                endDate
            });
            setTotalStats(stats);

            // Pass page and limit, plus filters
            const res = await getUserAllExpensesApi(page, pageSize, {
                name: filterName,
                branch: filterBranch,
                transaction: filterTransaction,
                category: filterCategory,
                main_category: filterMainCategory,
                vendor: filterVendor,
                gst: filterGST,
                minAmount,
                maxAmount,
                startDate,
                endDate
            });

            let pendingResults = { data: [], total: 0 };
            try {
                pendingResults = await getApprovalsApi(page, pageSize, {
                    startDate,
                    endDate,
                    name: filterName,
                    branch: filterBranch,
                    transaction: filterTransaction,
                    category: filterCategory,
                    main_category: filterMainCategory,
                    vendor: filterVendor,
                    gst: filterGST,
                    minAmount,
                    maxAmount
                });
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

            // Fetch Total Stats independently of pagination
            try {
                const stats = await getExpensesTotalStatsApi({
                    name: filterName,
                    branch: filterBranch,
                    transaction: filterTransaction,
                    category: filterCategory,
                    minAmount,
                    maxAmount,
                    startDate,
                    endDate
                });
                setTotalStats(stats);
            } catch (e) {
                console.error("Failed to load total stats", e);
            }

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
    }, [page, activeTab, userRole, refreshKey, filterName, filterBranch, filterTransaction, filterCategory, filterMainCategory, filterVendor, filterGST, minAmount, maxAmount, pageSize, filters]);

    // Reset to page 1 when filters change (except page change itself)
    useEffect(() => {
        setPage(1);
    }, [filterName, filterBranch, filterTransaction, filterCategory, filterMainCategory, filterVendor, filterGST, minAmount, maxAmount, filters, activeTab]);

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
                    mainCategory: item.main_category,
                    originalItem: { ...item, id: item.id },
                };
            });
        } else {
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
                    transaction_from: item.transaction_from,
                    mainCategory: item.main_category || item.category,
                    end_date: item.end_date ? dayjs(item.end_date).format("DD/MM/YYYY") : "-",
                    originalItem: { ...item, id: item.id },
                    is_edit: item.is_edit
                };
            });
        }
    };

    const truncateWords = (text, count) => {
        if (!text) return "-";
        const words = String(text).split(/\s+/);
        if (words.length <= count) return text;
        return words.slice(0, count).join(" ") + "...";
    };

    const baseRows = getRowData();

    // -------------------------------------
    // SEARCH / CATEGORY / SORT
    // -------------------------------------
    const allNames = globalFilterOptions?.names?.length ? globalFilterOptions.names : [...new Set(baseRows.map(r => r.merchant))].filter(Boolean);
    const allBranches = globalFilterOptions?.branches?.length ? globalFilterOptions.branches : [...new Set(baseRows.map(r => r.report))].filter(Boolean);
    const allTransactionSources = globalFilterOptions?.transactionSources?.length ? globalFilterOptions.transactionSources : [...new Set(baseRows.map(r => r.transaction_from))].filter(Boolean);
    const allCategories = globalFilterOptions?.categories?.length ? globalFilterOptions.categories : [...new Set(baseRows.map(r => r.title))].filter(Boolean);
    const allMainCategories = globalFilterOptions?.mainCategories?.length ? globalFilterOptions.mainCategories : [...new Set(baseRows.map(r => r.mainCategory))].filter(Boolean);
    const allVendors = globalFilterOptions?.vendors?.length ? globalFilterOptions.vendors : [...new Set(baseRows.map(r => r.vendorName || r.transaction_to))].filter(Boolean);
    let filteredRows = [...baseRows];    // Filter by Search Text
    if (searchText) {
        filteredRows = filteredRows.filter((r) =>
            Object.values(r).some((val) =>
                String(val).toLowerCase().includes(searchText.toLowerCase())
            )
        );
    }

    // Client-side filtering as fallback/supplement (optional since server filters, but Search is useful)
    if (filterName?.length > 0) {
        filteredRows = filteredRows.filter(r => filterName.includes(r.merchant));
    }
    if (filterBranch?.length > 0) {
        filteredRows = filteredRows.filter(r => filterBranch.includes(r.report));
    }
    if (filterTransaction?.length > 0) {
        filteredRows = filteredRows.filter(r => filterTransaction.includes(r.transaction_from));
    }
    if (filterCategory?.length > 0) {
        filteredRows = filteredRows.filter(r => filterCategory.includes(r.title));
    }
    if (filterMainCategory?.length > 0) {
        filteredRows = filteredRows.filter(r => filterMainCategory.includes(r.mainCategory));
    }
    if (filterVendor?.length > 0) {
        filteredRows = filteredRows.filter(r => filterVendor.includes(r.vendorName) || filterVendor.includes(r.transaction_to));
    }
    if (filterGST?.length > 0) {
        filteredRows = filteredRows.filter(r => filterGST.includes(r.gst));
    }

    if (minAmount) {
        filteredRows = filteredRows.filter(r => {
            const val = parseFloat(String(r.amount).replace(/[^0-9.-]+/g, "")) || 0;
            return val >= parseFloat(minAmount);
        });
    }
    if (maxAmount) {
        filteredRows = filteredRows.filter(r => {
            const val = parseFloat(String(r.amount).replace(/[^0-9.-]+/g, "")) || 0;
            return val <= parseFloat(maxAmount);
        });
    }


    if (filterAmount === "low") {
        filteredRows.sort((a, b) => parseInt(a.amount.replace(/\D/g, "")) - parseInt(b.amount.replace(/\D/g, "")));
    } else if (filterAmount === "high") {
        filteredRows.sort((a, b) => parseInt(b.amount.replace(/\D/g, "")) - parseInt(a.amount.replace(/\D/g, "")));
    }

    // Display Total from API Stats
    const totalToDisplay = activeTab === "expense" ? totalStats.totalExpense : totalStats.totalApproved;

    const clearAllFilters = () => {
        setFilterMainCategory([]);
        setFilterCategory([]);
        setFilterAmount("");
        setSearchText("");
        setFilterName([]);
        setFilterBranch([]);
        setFilterTransaction([]);
        setFilterVendor([]);
        setFilterGST([]);
        setMinAmount("");
        setMaxAmount("");
        setTempMin("");
        setTempMax("");
        setPage(1);
    };

    const handleExportCSV = async () => {
        setLoading(true);
        try {
            let allExportItems = [];
            const LARGE_LIMIT = 10000;

            if (activeTab === "expense") {
                const res = await getUserAllExpensesApi(1, LARGE_LIMIT, {
                    name: filterName,
                    branch: filterBranch,
                    transaction: filterTransaction,
                    category: filterCategory
                });
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
                const res = await getUserAllExpensesApi(1, LARGE_LIMIT, {
                    name: filterName,
                    branch: filterBranch,
                    transaction: filterTransaction,
                    category: filterCategory
                });
                let pendingResults = { data: [] };
                try {
                    pendingResults = await getApprovalsApi(1, LARGE_LIMIT, { category: filterCategory });
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
    const unifiedGridStyle = {
        gridTemplateColumns: "40px 100px 90px 140px 160px 110px 120px 150px 120px 60px minmax(200px, 0.9fr) 90px 80px"
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
                        <div className="expense-header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#1c2431" }}>
                                    {activeTab === "expense" ? "Expenses" : "Approved"}
                                </h1>
                                <span style={{ color: "#64748b", fontSize: "14px" }}>Manage and track your financial records</span>
                            </div>
                            <div className="expense-actions">
                                <button
                                    onClick={handleExportCSV}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "10px 18px",
                                        backgroundColor: "#fff",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "10px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        transition: "all 0.2s",
                                        marginRight: "10px",
                                        color: "#475569",
                                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                                    }}
                                >
                                    <Icons.Download size={18} /> Export CSV
                                </button>
                                {!((userRole === "admin" || userRole === "superadmin") && activeTab === "approval") && (
                                    <button
                                        className="btn-primary"
                                        onClick={() => {
                                            setOpenModal(activeTab);
                                            resetForm();
                                            setEditData(null);
                                        }}
                                        style={{
                                            padding: "10px 20px",
                                            borderRadius: "10px",
                                            fontWeight: 600,
                                            boxShadow: "0 4px 12px rgba(212, 175, 55, 0.3)"
                                        }}
                                    >
                                        <Plus size={18} /> New {activeTab === "approval" ? "Approval" : "Expense"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* FILTER UI */}
                        <div className="filter-card">
                            <div className="filter-left" style={{ flexWrap: "wrap", gap: "10px" }}>
                                <div className="search-wrapper">
                                    <Icons.Search size={16} className="search-icon" />
                                    <input
                                        type="text"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        placeholder="Search by name, branch, etc..."
                                    />
                                </div>

                                <div className="flex flex-wrap gap-3 items-center">
                                    <DataTableFacetedFilter
                                        title="Person"
                                        options={allNames.map(n => ({ label: n, value: n, icon: Icons.User }))}
                                        selectedValues={filterName}
                                        onFilterChange={setFilterName}
                                        icon={Icons.User}
                                    />

                                    <DataTableFacetedFilter
                                        title="Category"
                                        options={allMainCategories.map(c => ({ label: c, value: c, icon: Icons.LayoutGrid }))}
                                        selectedValues={filterMainCategory}
                                        onFilterChange={setFilterMainCategory}
                                        icon={Icons.LayoutGrid}
                                    />

                                    <DataTableFacetedFilter
                                        title="Subcategory"
                                        options={allCategories.map(c => ({ label: c, value: c, icon: Icons.Layers }))}
                                        selectedValues={filterCategory}
                                        onFilterChange={setFilterCategory}
                                        icon={Icons.Layers}
                                    />

                                    <DataTableFacetedFilter
                                        title="Branch"
                                        options={allBranches.map(b => ({ label: b, value: b, icon: Icons.Building2 }))}
                                        selectedValues={filterBranch}
                                        onFilterChange={setFilterBranch}
                                        icon={Icons.Building2}
                                    />

                                    <DataTableFacetedFilter
                                        title="Transaction"
                                        options={allTransactionSources.map(s => ({ label: s, value: s, icon: Icons.Wallet }))}
                                        selectedValues={filterTransaction}
                                        onFilterChange={setFilterTransaction}
                                        icon={Icons.Wallet}
                                    />

                                    <DataTableFacetedFilter
                                        title="Vendor"
                                        options={allVendors.map(v => ({ label: v, value: v, icon: Icons.Store }))}
                                        selectedValues={filterVendor}
                                        onFilterChange={setFilterVendor}
                                        icon={Icons.Store}
                                    />

                                    <DataTableFacetedFilter
                                        title="GST"
                                        options={[
                                            { label: "Yes", value: "Yes", icon: Icons.Receipt },
                                            { label: "No", value: "No", icon: Icons.Receipt }
                                        ]}
                                        selectedValues={filterGST}
                                        onFilterChange={setFilterGST}
                                        icon={Icons.Receipt}
                                    />

                                    <DataTableSingleFilter
                                        title="Amount: All"
                                        options={[
                                            { value: "", label: "Amount: All" },
                                            { value: "low", label: "Low → High" },
                                            { value: "high", label: "High → Low" },
                                        ]}
                                        selectedValue={filterAmount}
                                        onFilterChange={setFilterAmount}
                                        icon={Icons.ArrowUpDown}
                                        footer={
                                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                                <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Amount Range</span>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff", border: "1px solid #e2e8f0", padding: "4px 8px", borderRadius: "6px" }}>
                                                    <Icons.IndianRupee size={12} style={{ color: "#94a3b8" }} />
                                                    <input
                                                        type="number"
                                                        placeholder="Min"
                                                        value={tempMin}
                                                        onChange={(e) => setTempMin(e.target.value)}
                                                        style={{ width: "100%", border: "none", background: "transparent", fontSize: "12px", outline: "none" }}
                                                    />
                                                    <span style={{ color: "#cbd5e1" }}>-</span>
                                                    <input
                                                        type="number"
                                                        placeholder="Max"
                                                        value={tempMax}
                                                        onChange={(e) => setTempMax(e.target.value)}
                                                        style={{ width: "100%", border: "none", background: "transparent", fontSize: "12px", outline: "none" }}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setMinAmount(tempMin);
                                                        setMaxAmount(tempMax);
                                                    }}
                                                    style={{
                                                        width: "100%",
                                                        padding: "6px",
                                                        backgroundColor: "#1c2431",
                                                        color: "#fff",
                                                        border: "none",
                                                        borderRadius: "6px",
                                                        fontSize: "12px",
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                        transition: "all 0.2s"
                                                    }}
                                                >
                                                    Search
                                                </button>
                                            </div>
                                        }
                                    />

                                    {(filterCategory.length > 0 || filterMainCategory.length > 0 || filterName.length > 0 || filterBranch.length > 0 || filterTransaction.length > 0 || filterVendor.length > 0 || filterGST.length > 0 || filterAmount !== "" || minAmount || maxAmount || searchText) && (
                                        <button className="clear-filter-btn" onClick={clearAllFilters}>
                                            <Icons.X size={14} /> Clear Filter
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* TOTAL STAT */}
                            <div className={`total-stat-box ${activeTab === "expense" ? "is-expense" : "is-approved"}`}>
                                <span>{activeTab === "expense" ? "Total Expense" : "Total Approved"}</span>
                                <strong className="total-amount">{fmtAmt(totalToDisplay)}</strong>
                            </div>
                        </div>

                        {/* TABLE */}
                        <div className="table-scroll-wrapper" style={{ overflowX: "auto", width: "100%", borderRadius: "8px" }}>
                            <div className="expense-table-wrapper" style={{ minWidth: "1600px" }}>
                                <div className="expense-table">
                                    <div
                                        className="expense-row expense-header-row"
                                        style={unifiedGridStyle}
                                    >
                                        <div className="sno-col" style={{ fontWeight: 700 }}>S.NO</div>
                                        <div>DATE</div>
                                        <div>PERSON</div>
                                        <div>CATEGORY</div>
                                        <div>SUBCATEGORY</div>
                                        <div>BRANCH</div>
                                        <div>TRANSACTION</div>
                                        <div>VENDOR</div>
                                        <div>AMOUNT</div>
                                        <div>GST</div>
                                        <div>DESCRIPTION</div>
                                        <div>INVOICE</div>
                                        <div style={{ textAlign: "center" }}>ACTION</div>
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
                                                style={unifiedGridStyle}
                                            >
                                                <div className="sno-cell">
                                                    {(page - 1) * pageSize + i + 1}.
                                                </div>

                                                {/* DATE */}
                                                <div style={{ whiteSpace: "nowrap" }}>{row.date}</div>

                                                {/* PERSON */}
                                                <Tooltip title={row.merchant}>
                                                    <div style={{ fontWeight: 500, color: "#444" }}>{row.merchant}</div>
                                                </Tooltip>

                                                {/* CATEGORY */}
                                                <Tooltip title={row.mainCategory}>
                                                    <div style={{ fontWeight: 600, color: "#1c2431", textTransform: "uppercase", fontSize: "12px" }}>
                                                        {row.mainCategory}
                                                    </div>
                                                </Tooltip>

                                                {/* SUBCATEGORY */}
                                                <Tooltip title={row.title}>
                                                    <div style={{ color: "#555" }}>{row.title}</div>
                                                </Tooltip>

                                                {/* BRANCH */}
                                                <Tooltip title={row.report || "-"}>
                                                    <div>{row.report || "-"}</div>
                                                </Tooltip>

                                                {/* TRANSACTION */}
                                                <Tooltip title={row.transaction_from || "-"}>
                                                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                                        <div style={{ fontSize: "12px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{row.transaction_from || "-"}</div>
                                                        <div style={{ fontSize: "11px", color: "#888", overflow: "hidden", textOverflow: "ellipsis" }}>{row.spendMode}</div>
                                                    </div>
                                                </Tooltip>

                                                {/* VENDOR */}
                                                <Tooltip title={row.vendorName || row.transaction_to || "-"}>
                                                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                                        <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{row.vendorName || row.transaction_to || "-"}</div>
                                                        {row.vendorNumber && <div style={{ fontSize: "10px", color: "#888", overflow: "hidden", textOverflow: "ellipsis" }}>{row.vendorNumber}</div>}
                                                    </div>
                                                </Tooltip>

                                                {/* AMOUNT */}
                                                <div className="amount-cell">
                                                    {row.amount}
                                                    {Boolean(row.is_edit) && <span style={{ fontSize: "9px", color: "#d4af37", display: "block" }}>Edit</span>}
                                                </div>

                                                {/* GST */}
                                                <div>{row.gst === 'Yes' ? <span className="status-badge" style={{ background: '#d4377f', padding: "2px 6px" }}>GST</span> : '-'}</div>

                                                {/* DESCRIPTION */}
                                                <Tooltip title={row.note || row.description}>
                                                    <div className="text-truncate-single">
                                                        {truncateWords(row.note || row.description, 6)}
                                                    </div>
                                                </Tooltip>

                                                {/* INVOICE */}
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    {row.invoice && String(row.invoice).trim() !== "" && String(row.invoice).trim() !== "[]" ? (
                                                        <button
                                                            className="view-invoice-btn"
                                                            onClick={() => handleViewInvoice(row.invoice)}
                                                            style={{ padding: "3px 8px", fontSize: "10px", marginTop: 0 }}
                                                        >
                                                            View
                                                        </button>
                                                    ) : "-"}
                                                </div>

                                                {/* ACTION */}
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <Dropdown
                                                        menu={{
                                                            items: (userRole === "admin" || userRole === "superadmin") ? [
                                                                {
                                                                    key: 'edit',
                                                                    label: 'Edit',
                                                                    icon: <Icons.Edit size={14} />,
                                                                    onClick: () => openEditModal(row.originalItem || row)
                                                                },
                                                                {
                                                                    key: 'delete',
                                                                    label: (
                                                                        <Popconfirm
                                                                            title={`Delete this ${activeTab}?`}
                                                                            onConfirm={() => handleDelete(row.originalItem || row)}
                                                                            okText="Yes"
                                                                            cancelText="No"
                                                                        >
                                                                            <span style={{ color: '#ff4d4f' }}>Delete</span>
                                                                        </Popconfirm>
                                                                    ),
                                                                    icon: <Icons.Trash2 size={14} style={{ color: '#ff4d4f' }} />,
                                                                }
                                                            ] : [
                                                                {
                                                                    key: 'add',
                                                                    label: 'Add',
                                                                    icon: <Icons.Plus size={14} />,
                                                                    onClick: () => handleQuickAddExpense(row.originalItem || row)
                                                                }
                                                            ]
                                                        }}
                                                        trigger={['hover']}
                                                        placement="bottomRight"
                                                    >
                                                        <button className="action-more-btn">
                                                            <Icons.MoreVertical size={18} />
                                                        </button>
                                                    </Dropdown>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

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
                            <div className="count-pagination" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', alignItems: 'center', gap: '20px' }}>
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
                </div >
            )
            }

            {
                showInvoiceModal && currentInvoices.length > 0 && (
                    <InvoicePreviewModal
                        open={showInvoiceModal}
                        onClose={() => setShowInvoiceModal(false)}
                        invoices={currentInvoices}
                    />
                )
            }

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
