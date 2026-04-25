import React, { useEffect, useMemo, useState } from "react";
import { Eye, Check, X, Search, LayoutGrid, ArrowUpDown, Building2, User, Layers, Wallet, Store, Receipt, Download, MoreVertical, Edit, Trash2 } from "lucide-react";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, Button, Modal, Popconfirm, Tooltip, Pagination, Dropdown } from "antd";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import {
    getApprovalsApi,
    approveExpenseApi,
    rejectExpenseApi,
} from "../../Api/action";
import { CommonToaster } from "../../Common/CommonToaster";
import Filters from "../Filters/Filters";
import InvoicePreviewModal from "../Common/InvoicePreviewModal";
import ApprovalsSkeleton from "./ApprovalsSkeleton";
import { DataTableFacetedFilter } from "@/components/ui/faceted-filter";
import { DataTableSingleFilter } from "@/components/ui/single-filter";


export default function Approvals() {
    const [filters, setFilters] = useState({
        filterType: "year",
        compareMode: false,
        value: dayjs(),
    });
    const [filterCategory, setFilterCategory] = useState([]);
    const [filterAmount, setFilterAmount] = useState("");
    const [searchText, setSearchText] = useState("");
    const [loading, setLoading] = useState(true)
    const [requests, setRequests] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    // Invoice Modal
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [currentInvoices, setCurrentInvoices] = useState([]);
    // ✅ Details Modal
    const [showDetails, setShowDetails] = useState(false);
    const [selected, setSelected] = useState(null);

    // ✅ Load Approvals
    useEffect(() => {
        loadApprovals();
        window.addEventListener("incomeExpenseUpdated", loadApprovals);
        window.addEventListener("summaryUpdated", loadApprovals);
        window.addEventListener("newApprovalsReceived", loadApprovals);
        return () => {
            window.removeEventListener("incomeExpenseUpdated", loadApprovals);
            window.removeEventListener("summaryUpdated", loadApprovals);
            window.removeEventListener("newApprovalsReceived", loadApprovals);
        };
    }, [page, pageSize, filters, filterCategory]);

    useEffect(() => {
        setPage(1);
    }, [filters]);

    const loadApprovals = async () => {
        setLoading(true)
        const { startDate, endDate } = getDateRange(filters);
        const response = await getApprovalsApi(page, pageSize, { startDate, endDate, category: filterCategory });
        if (response && response.data && Array.isArray(response.data)) {
            setRequests(response.data);
            setTotal(response.total || 0);
        } else if (Array.isArray(response)) {
            setRequests(response);
            setTotal(response.length);
        } else {
            setRequests([]);
            setTotal(0);
        }
        setLoading(false)
    };

    // ✅ Helper
    const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "-");
    const fmtAmt = (n) => {
        const val = Number(String(n ?? 0).replace(/[^0-9.-]+/g, "")) || 0;
        return `₹${val.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const openDetails = (row) => {
        setSelected(row);
        setShowDetails(true);
    };

    // ✅ Approve
    const doApprove = async (row) => {
        try {
            await approveExpenseApi({ id: row.id });

            setRequests((prev) => prev.filter((r) => r.id !== row.id));
            window.dispatchEvent(new Event("incomeExpenseUpdated"));

            CommonToaster("Approved and added to wallet!", "success");
            setShowDetails(false);
        } catch (err) {
            CommonToaster("Error approving!", "error");
        }
    };

    // ✅ Reject
    const doReject = async (row) => {
        try {
            await rejectExpenseApi({ id: row.id });

            setRequests((prev) => prev.filter((r) => r.id !== row.id));
            window.dispatchEvent(new Event("incomeExpenseUpdated"));

            CommonToaster("Request Rejected!", "success");
        } catch (err) {
            CommonToaster("Error rejecting!", "error");
        }
    };

    const getDateRange = (f) => {
        if (!f.value) return { startDate: null, endDate: null };
        let start, end;

        if (Array.isArray(f.value) && f.value.length === 2) {
            start = dayjs(f.value[0]).startOf('day').format("YYYY-MM-DD");
            end = dayjs(f.value[1]).endOf('day').format("YYYY-MM-DD");
        } else {
            // Fallback for single value
            const type = f.filterType || "day";
            start = dayjs(f.value).startOf(type).format("YYYY-MM-DD");
            end = dayjs(f.value).endOf(type).format("YYYY-MM-DD");
        }
        return { startDate: start, endDate: end };
    };

    // ✅ Extract categories from Requests
    const allCategories = useMemo(() => {
        const set = new Set();
        requests.forEach((r) => {
            if (r?.sub_category) set.add(r.sub_category);
            else if (r?.category) set.add(r.category);
        });
        return Array.from(set);
    }, [requests]);


    // ✅ ✅ ✅ APPLY DATE FILTER
    const applyFilters = (items) => {
        if (!filters.value) return items;

        if (Array.isArray(filters.value) && filters.value.length === 2) {
            const [start, end] = filters.value;
            const s = dayjs(start).startOf("day");
            const e = dayjs(end).endOf("day");

            return items.filter((item) => {
                const d = dayjs(item.date);
                return d.isBetween(s, e, "day", "[]");
            });
        }

        // Fallback for single value
        const selected = dayjs(filters.value);
        const type = filters.filterType;
        return items.filter((item) => {
            const d = dayjs(item.date);
            if (type === "date") return d.isSame(selected, "day");
            if (type === "week") return d.isSame(selected, "week");
            if (type === "month") return d.isSame(selected, "month");
            if (type === "year") return d.isSame(selected, "year");
            return true;
        });
    };

    // -------------------------------------
    // Invoice
    // -------------------------------------
    const handleViewInvoice = (invoiceData) => {
        if (!invoiceData) return;
        const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
        let invoicesArray = [];
        const normalizeEntry = (entry) => {
            if (!entry) return null;
            let str = String(entry).trim();
            str = str.replace(/^"+|"+$/g, "");
            // If it's a base64 data URL, return as-is
            if (str.startsWith("data:")) {
                return str;
            }

            // If it already starts with /uploads/invoices/, just prepend API_BASE
            if (str.startsWith("/uploads/invoices/")) {
                return `${API_BASE}${str}`;
            }

            // Otherwise, construct the full path
            return `${API_BASE}/uploads/invoices/${str}`;
        };
        if (Array.isArray(invoiceData)) {
            invoicesArray = invoiceData
                .map(normalizeEntry)
                .filter(Boolean);
        }
        else if (typeof invoiceData === "string" && invoiceData.trim().startsWith("[")) {
            try {
                const parsed = JSON.parse(invoiceData);
                if (Array.isArray(parsed)) {
                    invoicesArray = parsed
                        .map(normalizeEntry)
                        .filter(Boolean);
                }
            } catch (e) {
            }
        }
        if (!invoicesArray.length) {
            invoicesArray = [normalizeEntry(invoiceData)].filter(Boolean);
        }
        if (!invoicesArray.length) return;
        setCurrentInvoices(invoicesArray);
        setShowInvoiceModal(true);
    };

    let filteredRows = applyFilters(requests);
    if (searchText.trim()) {
        filteredRows = filteredRows.filter((r) =>
            `${r.name} ${r.sub_category} ${r.branch} ${fmtDate(r.date)}`
                .toLowerCase()
                .includes(searchText.toLowerCase())
        );
    }
    if (filterCategory?.length > 0) {
        filteredRows = filteredRows.filter((r) => filterCategory.includes(r.sub_category || r.category));
    }
    const parseAmt = (n) =>
        Number(String(n ?? 0).replace(/[^0-9.-]+/g, "")) || 0;

    if (filterAmount === "low") {
        filteredRows.sort((a, b) => parseAmt(a.amount) - parseAmt(b.amount));
    } else if (filterAmount === "high") {
        filteredRows.sort((a, b) => parseAmt(b.amount) - parseAmt(a.amount));
    }

    const clearAllFilters = () => {
        setFilterCategory([]);
        setFilterAmount("");
        setSearchText("");
    };

    const truncateWords = (text, count) => {
        if (!text) return "-";
        const words = String(text).split(/\s+/);
        if (words.length <= count) return text;
        return words.slice(0, count).join(" ") + "...";
    };

    const totalFilteredAmount = filteredRows.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const unifiedGridStyle = {
        gridTemplateColumns: "40px 100px 120px 140px 160px 110px 120px 150px 120px 60px minmax(200px, 0.9fr) 90px 100px"
    };

    return (
        <>
            <Filters onFilterChange={setFilters} />
            {loading ? (<ApprovalsSkeleton />) : (
                <div className="expense-container">
                    <div className="expense-header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#1c2431" }}>
                                Approvals
                            </h1>
                            <span style={{ color: "#64748b", fontSize: "14px" }}>Review and manage pending spend requests</span>
                        </div>
                    </div>

                    {/* FILTER UI */}
                    <div className="filter-card">
                        <div className="filter-left" style={{ flexWrap: "wrap", gap: "10px" }}>
                            <div className="search-wrapper">
                                <Search size={16} className="search-icon" />
                                <input
                                    type="text"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    placeholder="Search owner, category..."
                                />
                            </div>

                            <div className="flex flex-wrap gap-4 items-center">
                                <DataTableFacetedFilter
                                    title="Category"
                                    options={allCategories.map(c => ({ label: c, value: c, icon: LayoutGrid }))}
                                    selectedValues={filterCategory}
                                    onFilterChange={setFilterCategory}
                                    icon={LayoutGrid}
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
                                    icon={ArrowUpDown}
                                />

                                {(filterCategory.length > 0 || filterAmount !== "" || searchText) && (
                                    <button className="clear-filter-btn" onClick={clearAllFilters}>
                                        <X size={14} /> Clear Filter
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* TOTAL STAT */}
                        <div className="total-stat-box is-approved">
                            <span>Total Value</span>
                            <strong className="total-amount">{fmtAmt(totalFilteredAmount)}</strong>
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
                                    <div>SPENDER</div>
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
                                    <div className="no-data-box" style={{ textAlign: "center", padding: "40px 0" }}>
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
                                        <div
                                            key={row.id}
                                            className="expense-row"
                                            style={unifiedGridStyle}
                                        >
                                            <div className="sno-cell">
                                                {(page - 1) * pageSize + i + 1}.
                                            </div>

                                            {/* DATE */}
                                            <div style={{ whiteSpace: "nowrap" }}>{fmtDate(row.date)}</div>

                                            {/* PERSON */}
                                            <Tooltip title={row.name}>
                                                <div style={{ fontWeight: 500, color: "#444" }}>{row.name}</div>
                                            </Tooltip>

                                            {/* CATEGORY */}
                                            <Tooltip title={row.main_category || "-"}>
                                                <div style={{ fontWeight: 600, color: "#1c2431", textTransform: "uppercase", fontSize: "12px" }}>
                                                    {row.main_category || "-"}
                                                </div>
                                            </Tooltip>

                                            {/* SUBCATEGORY */}
                                            <Tooltip title={row.sub_category || row.category}>
                                                <div style={{ color: "#555" }}>{row.sub_category || row.category}</div>
                                            </Tooltip>

                                            {/* BRANCH */}
                                            <Tooltip title={row.branch || "-"}>
                                                <div>{row.branch || "-"}</div>
                                            </Tooltip>

                                            {/* TRANSACTION */}
                                            <Tooltip title={row.transaction_from || "-"}>
                                                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                                    <div style={{ fontSize: "12px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{row.transaction_from || "-"}</div>
                                                </div>
                                            </Tooltip>

                                            {/* VENDOR */}
                                            <Tooltip title={row.vendor_name || row.transaction_to || "-"}>
                                                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                                    <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{row.vendor_name || row.transaction_to || "-"}</div>
                                                    {row.vendor_number && <div style={{ fontSize: "10px", color: "#888", overflow: "hidden", textOverflow: "ellipsis" }}>{row.vendor_number}</div>}
                                                </div>
                                            </Tooltip>

                                            {/* AMOUNT */}
                                            <div className="amount-cell">
                                                {fmtAmt(row.amount)}
                                                {Boolean(row.original_expense_id || row.is_edit) && <span style={{ fontSize: "9px", color: "#d4af37", display: "block" }}>Edit</span>}
                                            </div>

                                            {/* GST */}
                                            <div>{row.gst === 'Yes' ? <span className="status-badge" style={{ background: '#d4377f', padding: "2px 6px" }}>GST</span> : '-'}</div>

                                            {/* DESCRIPTION */}
                                            <Tooltip title={row.description || row.role}>
                                                <div className="text-truncate-single">
                                                    {truncateWords(row.description || row.role, 6)}
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
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                <Tooltip title="Details">
                                                    <button className="action-more-btn" onClick={() => openDetails(row)}>
                                                        <Eye size={18} />
                                                    </button>
                                                </Tooltip>
                                                <Popconfirm
                                                    title="Approve this request?"
                                                    okText="Yes"
                                                    cancelText="No"
                                                    onConfirm={() => doApprove(row)}
                                                >
                                                    <Tooltip title="Approve">
                                                        <button className="action-more-btn" style={{ color: '#2c9b00' }}>
                                                            <Check size={18} />
                                                        </button>
                                                    </Tooltip>
                                                </Popconfirm>
                                                <Popconfirm
                                                    title="Reject this request?"
                                                    okText="Yes"
                                                    cancelText="No"
                                                    onConfirm={() => doReject(row)}
                                                >
                                                    <Tooltip title="Reject">
                                                        <button className="action-more-btn" style={{ color: '#ff4d4f' }}>
                                                            <X size={18} />
                                                        </button>
                                                    </Tooltip>
                                                </Popconfirm>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PAGINATION */}
                    {total > 0 && (
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
                                onChange={(p) => setPage(p)}
                                total={total}
                                pageSize={pageSize}
                                showSizeChanger={false}
                            />
                        </div>
                    )}

                    {/* ✅ DETAILS MODAL */}
                    <Modal
                        className="details-modal"
                        open={showDetails}
                        onCancel={() => setShowDetails(false)}
                        footer={null}
                        title="Request Details"
                        centered
                    >
                        {selected && (
                            <div className="details-grid" style={{ display: "grid", gap: 10 }}>
                                <div><b>Spender Name:</b> {selected.name}</div>
                                <div className="text-truncate11"><b>Description:</b> {selected.role || selected.description || "-"}</div>
                                <div><b>Branch:</b> {selected.branch || "-"}</div>
                                <div><b>Category:</b> {selected.sub_category || selected.category}</div>
                                <div><b>Amount:</b> {fmtAmt(selected.amount)}</div>
                                <div><b>Request Date:</b> {fmtDate(selected.date)}</div>
                                <div><b>End Date:</b> {fmtDate(selected.end_date)}</div>
                                <div><b>GST:</b> {selected.gst}</div>
                                <div><b>Transaction From:</b> {selected.transaction_from}</div>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        marginTop: 12,
                                        border: "none",
                                        padding: 0,
                                        justifyContent: "flex-start"
                                    }}
                                >
                                    <Button onClick={() => setShowDetails(false)}>Close</Button>
                                    <Popconfirm
                                        title="Approve this request?"
                                        okText="Yes"
                                        cancelText="No"
                                        onConfirm={() => doApprove(selected)}
                                    >
                                        <Button type="primary">Approve</Button>
                                    </Popconfirm>
                                </div>
                            </div>
                        )}
                    </Modal>
                </div>
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

